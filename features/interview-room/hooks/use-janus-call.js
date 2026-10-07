'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { interviewsApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import { reportError } from '@/lib/logger';
import { joinAudioBridge } from '../janus/audiobridge';
import { joinTextRoom } from '../janus/datachannel';
import { createJanusSession } from '../janus/session';
import { useCallStore } from '../store';
import { useReconnect } from './use-reconnect';

/**
 * @typedef {{ session: Awaited<ReturnType<typeof createJanusSession>>, audio?: { setMuted: (m: boolean) => void, detach: () => void }, text?: { send: (p: object) => void, detach: () => void } }} Connection
 */

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
    if (err.code === 'CONFLICT' || err.code === 'NOT_FOUND' || err.code === 'FORBIDDEN') {
      return { title: 'Cannot join this interview', message: err.message, canRetry: false };
    }
    return { title: 'Could not start the call', message: err.message, canRetry: true };
  }
  return {
    title: 'Could not connect to the interviewer',
    message:
      'Check your connection, or a firewall may be blocking calls. You can retry or continue by typing.',
    canRetry: true,
  };
}

/**
 * Joins the interview call: REST join -> Janus session -> AudioBridge (audio) + TextRoom
 * (captions/turn state). Rejoins with backoff for 60 s after a drop; state comes back from the
 * server because the interview id stays the same.
 *
 * @param {{
 *   interviewId: string,
 *   micTrack: MediaStreamTrack | null,
 *   displayName: string,
 *   onRemoteTrack: (track: MediaStreamTrack | null) => void,
 *   onEnded: () => void,
 * }} opts
 */
export function useJanusCall({ interviewId, micTrack, displayName, onRemoteTrack, onEnded }) {
  const conn = useRef(/** @type {Connection | null} */ (null));
  const leaving = useRef(false);
  const callbacks = useRef({ onEnded, onRemoteTrack });
  const { setTurnState, upsertCaption, setFatalError } = useCallStore.getState();

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
    const join = await interviewsApi.join(interviewId);
    const onLost = (reason) => handleLostRef.current(reason);

    const session = await createJanusSession({
      server: join.janusUrl,
      iceServers: join.iceServers ?? [],
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
        roomId: join.roomId,
        pin: join.pin,
        token: join.token,
        display: displayName,
        micTrack,
        onConnectionLost: onLost,
        onRemoteTrack: (track) => callbacks.current.onRemoteTrack(track),
      });
      c.text = await joinTextRoom(session.janus, {
        roomId: join.textRoomId ?? join.roomId,
        pin: join.pin,
        token: join.token,
        display: displayName,
        onConnectionLost: onLost,
        onMessage: (msg) => {
          if (msg.type === 'caption') upsertCaption(msg);
          else if (msg.type === 'turn_state') setTurnState(/** @type {any} */ (msg.state));
          else if (msg.type === 'interview_event' && msg.event === 'ended') {
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
    // Connected; the bot greets next. Until then show a short "thinking" state.
    setTurnState('thinking');
  }, [interviewId, micTrack, displayName, teardown, setTurnState, upsertCaption]);

  const reconnect = useReconnect({
    reconnect: async () => {
      await teardown();
      await connect();
    },
    onGiveUp: () => {
      teardown();
      setFatalError({
        title: 'Connection lost',
        message: 'We could not reconnect within 60 seconds. Your answers so far are saved.',
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

  /** First join from the pre-check screen. Rejects with a description for the UI. */
  const join = useCallback(async () => {
    leaving.current = false;
    setFatalError(null);
    setTurnState('connecting');
    try {
      await connect();
    } catch (err) {
      if (!(err instanceof ApiError)) reportError(err, { phase: 'join', interviewId });
      setFatalError(describeJoinError(err));
      throw err;
    }
  }, [connect, interviewId, setFatalError, setTurnState]);

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
