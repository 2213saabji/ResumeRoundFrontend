'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { interviewsApi } from '@/lib/api/endpoints';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { reportError } from '@/lib/logger';
import { joinAudioBridge } from '../janus/audiobridge';
import { joinTextRoom } from '../janus/datachannel';
import { createJanusSession } from '../janus/session';
import { useCallStore } from '../store';
import { useReconnect } from './use-reconnect';

/**
 * @typedef {{ session: Awaited<ReturnType<typeof createJanusSession>>, audio?: { setMuted: (m: boolean) => void, detach: () => void }, text?: { send: (p: object) => void, detach: () => void } }} Connection
 */

/** 409 from start/join: text-mode, not started, or already ended. The room goes to the report. */
function isInterviewOver(err) {
  return err instanceof ApiError && err.code === 'CONFLICT';
}

/** Maps a join failure to what the room should show. */
export function describeJoinError(err) {
  if (err instanceof ApiError) {
    if (err.code === 'NOT_IMPLEMENTED') {
      return {
        title: 'Live voice calls are not available yet',
        message:
          'The voice interviewer is still being rolled out. You can continue this interview by typing.',
        canRetry: false,
      };
    }
    if (err.code === 'SERVICE_UNAVAILABLE') {
      return {
        title: 'Voice is busy right now',
        message: 'Voice is busy right now. Continue in text mode?',
        canRetry: true,
      };
    }
    if (err.code === 'NOT_FOUND' || err.code === 'FORBIDDEN') {
      return { title: 'Cannot join this interview', message: err.message, canRetry: false };
    }
    return { title: 'Could not start the call', message: errorMessage(err), canRetry: true };
  }
  return {
    title: 'Could not connect to the interviewer',
    message: 'Your network is blocking the call. Try another network, or continue in text mode.',
    canRetry: true,
  };
}

/** Name the candidate uses in both Janus rooms (the bot is 'interviewer'). */
const DISPLAY_NAME = 'candidate';

/**
 * Joins the interview call: POST start (first join only) -> POST join (+ GET /turns for the
 * caption history) -> Janus session -> AudioBridge (audio) + TextRoom (captions/interviewer
 * state). After a drop it rejoins up to three times with fresh credentials; the interview
 * continues from the same question.
 *
 * @param {{
 *   interviewId: string,
 *   micTrack: MediaStreamTrack | null,
 *   onRemoteTrack: (track: MediaStreamTrack | null) => void,
 *   onEnded: () => void,
 * }} opts onEnded: the interview is over (bot's ended event, or 409 on start/join); hang up and
 *   go to the report, without POST /end
 */
export function useJanusCall({ interviewId, micTrack, onRemoteTrack, onEnded }) {
  const conn = useRef(/** @type {Connection | null} */ (null));
  const leaving = useRef(false);
  const callbacks = useRef({ onEnded, onRemoteTrack });
  const {
    setTurnState,
    upsertCaption,
    appendInterviewerLine,
    loadHistory,
    setFatalError,
    syncClock,
  } = useCallStore.getState();

  useEffect(() => {
    callbacks.current = { onEnded, onRemoteTrack };
  });

  const teardown = useCallback(async () => {
    const c = conn.current;
    conn.current = null;
    if (!c) return;
    c.text?.detach();
    c.audio?.detach();
    await c.session.destroy();
    callbacks.current.onRemoteTrack(null);
  }, []);

  // Defined below; a ref breaks the connect <-> handleLost cycle.
  const handleLostRef = useRef((/** @type {string} */ _reason) => {});

  const connect = useCallback(async () => {
    if (!micTrack) throw new Error('Microphone is not ready');
    // The interviewer speaks about a second after joining, so connect straight away; the
    // transcript loads in parallel (announcements are not stored, so it rebuilds the history).
    const [join, turns] = await Promise.all([
      interviewsApi.join(interviewId),
      interviewsApi.allTurns(interviewId).catch(() => null),
    ]);
    if (turns) loadHistory(turns);
    const onLost = (reason) => handleLostRef.current(reason);

    const session = await createJanusSession({
      server: join.wsUrl,
      iceServers: join.iceServers ?? [],
      token: join.token, // Janus checks it on every request
      onLost,
    });
    /** @type {Connection} */
    const c = { session };
    conn.current = c;

    // The user may leave while we were connecting; never keep an orphaned call alive.
    const abortIfLeft = async () => {
      if (!leaving.current) return;
      await teardown();
      throw new Error('Left the call while connecting');
    };

    try {
      await abortIfLeft();
      c.audio = await joinAudioBridge(session.janus, {
        roomId: join.room,
        pin: join.pin,
        display: DISPLAY_NAME,
        micTrack,
        onConnectionLost: onLost,
        onRemoteTrack: (track) => callbacks.current.onRemoteTrack(track),
      });
      c.text = await joinTextRoom(session.janus, {
        roomId: join.captionRoom ?? join.room,
        pin: join.pin,
        display: DISPLAY_NAME,
        onConnectionLost: onLost,
        onMessage: (msg) => {
          if (msg.type === 'state') setTurnState(msg.state);
          else if (msg.type === 'interviewer') appendInterviewerLine(msg);
          else if (msg.type === 'candidate')
            upsertCaption({ speaker: 'candidate', text: msg.text, isFinal: msg.final });
          else if (msg.type === 'ended') {
            setTurnState('ended');
            callbacks.current.onEnded();
          }
        },
      });
      await abortIfLeft();
    } catch (err) {
      await teardown();
      throw err;
    }
    // Connected: stay on "Connecting..." until the bot's first state event.
    setTurnState('connecting');
  }, [
    interviewId,
    micTrack,
    teardown,
    setTurnState,
    upsertCaption,
    appendInterviewerLine,
    loadHistory,
  ]);

  const reconnect = useReconnect({
    reconnect: async () => {
      await teardown();
      try {
        await connect();
        setFatalError(null);
      } catch (err) {
        if (!isInterviewOver(err)) throw err;
        setTurnState('ended');
        callbacks.current.onEnded();
      }
    },
    onGiveUp: () => {
      teardown();
      setFatalError({
        title: 'Connection lost',
        message:
          'Your network is blocking the call. Try another network, or continue in text mode. Your answers so far are saved.',
        canRetry: true,
      });
    },
  });

  useEffect(() => {
    handleLostRef.current = (reason) => {
      if (leaving.current) return;
      const state = useCallStore.getState().turnState;
      if (state === 'ended' || state === 'reconnecting') return;
      reportError(new Error(`Call dropped: ${reason}`), { interviewId });
      setTurnState('reconnecting');
      teardown().finally(() => reconnect.schedule());
    };
  });

  /**
   * First join, from the Start / Rejoin click (browsers only play audio after a click). Starts
   * the interview first: start is safe on an interview already in progress and returns the
   * server clock. Rejects with a description in the store for the UI.
   */
  const join = useCallback(async () => {
    leaving.current = false;
    setFatalError(null);
    setTurnState('connecting');
    try {
      const started = await interviewsApi.start(interviewId);
      syncClock(started.progress.elapsedSec);
      if (started.currentTurn) useCallStore.setState({ currentSeq: started.currentTurn.seq });
      await connect();
    } catch (err) {
      if (isInterviewOver(err)) {
        setTurnState('ended');
        callbacks.current.onEnded();
        return;
      }
      if (!(err instanceof ApiError)) reportError(err, { phase: 'join', interviewId });
      setFatalError(describeJoinError(err));
      throw err;
    }
  }, [connect, interviewId, setFatalError, setTurnState, syncClock]);

  const leave = useCallback(async () => {
    leaving.current = true;
    reconnect.cancel();
    await teardown();
  }, [reconnect, teardown]);

  const send = useCallback((payload) => conn.current?.text?.send(payload), []);
  const setRemoteMuted = useCallback((muted) => conn.current?.audio?.setMuted(muted), []);

  // Network loss is a faster signal than an ICE timeout.
  useEffect(() => {
    const onOffline = () => handleLostRef.current('browser offline');
    window.addEventListener('offline', onOffline);
    return () => window.removeEventListener('offline', onOffline);
  }, []);

  // Release Janus handles when the page goes away.
  useEffect(() => {
    const onPageHide = (e) => {
      if (!e.persisted) {
        leaving.current = true;
        teardown();
      }
    };
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      leaving.current = true;
      reconnect.cancel();
      teardown();
    };
  }, [teardown, reconnect]);

  // Stable identity: callers use it in effect dependencies.
  return useMemo(
    () => ({ join, leave, send, setRemoteMuted }),
    [join, leave, send, setRemoteMuted],
  );
}
