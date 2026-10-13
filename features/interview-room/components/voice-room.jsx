'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { interviewKeys } from '@/lib/api/query-keys';
import { STORAGE_KEYS, readJson, writeJson } from '@/lib/storage';
import { useEndInterview } from '../hooks/use-end-interview';
import { useJanusCall } from '../hooks/use-janus-call';
import { useMicLevel } from '../hooks/use-mic-level';
import { useMicrophone } from '../hooks/use-microphone';
import { useRoomShortcuts } from '../hooks/use-room-shortcuts';
import { isWebRtcSupported } from '../janus/load-janus';
import { useCallStore } from '../store';
import { VOICE_FEATURES } from '../voice-features';
import { LiveCall } from './live-call';
import { PreCheck } from './pre-check';
import { RoomHeader } from './room-header';

const noopSubscribe = () => () => {};

/**
 * Voice interview: pre-check, then the live call. Owns the microphone (so the stream tested in
 * pre-check is the one sent to Janus) and the Janus connection.
 * @param {{ interview: any, onUseText: () => void }} props
 */
export function VoiceRoom({ interview, onUseText }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mic = useMicrophone();
  const supported = useSyncExternalStore(noopSubscribe, isWebRtcSupported, () => true);
  const [phase, setPhase] = useState(/** @type {'precheck' | 'live'} */ ('precheck'));
  const [confirmEnd, setConfirmEnd] = useState(false);
  const remoteAudio = useRef(/** @type {HTMLAudioElement | null} */ (null));

  const muted = useCallStore((s) => s.muted);
  const inputMode = useCallStore((s) => s.inputMode);
  const pttPressed = useCallStore((s) => s.pttPressed);
  const { setMuted, setInputMode, setPttPressed, reset } = useCallStore.getState();

  const micTrack = mic.stream?.getAudioTracks()[0] ?? null;

  // Fresh call state per room visit; restore the preferred turn mode.
  useEffect(() => {
    reset();
    const prefs = readJson(STORAGE_KEYS.roomPrefs, {});
    if (VOICE_FEATURES.pushToTalk && (prefs?.inputMode === 'ptt' || prefs?.inputMode === 'vad'))
      setInputMode(prefs.inputMode);
    return reset;
  }, [reset, setInputMode]);

  const playRemoteTrack = useCallback((/** @type {MediaStreamTrack | null} */ track) => {
    const el = remoteAudio.current;
    if (!el) return;
    el.srcObject = track ? new MediaStream([track]) : null;
    if (track) el.play().catch(() => {});
  }, []);

  const endedRef = useRef(() => {});
  const leftForReport = useRef(false);
  const call = useJanusCall({
    interviewId: interview.id,
    micTrack,
    onRemoteTrack: playRemoteTrack,
    onEnded: () => endedRef.current(),
  });

  const end = useEndInterview(interview.id, {
    beforeNavigate: async () => {
      await call.leave();
      mic.stop();
    },
  });

  useEffect(() => {
    // The interview is over (the bot's ended event, or start/join answered 409): hang up and go
    // to the report. No POST /end: the server has already ended it.
    endedRef.current = async () => {
      if (end.isPending || leftForReport.current) return;
      leftForReport.current = true;
      await call.leave();
      mic.stop();
      // The cached interview still says in_progress; let the report page read the server's.
      queryClient.removeQueries({ queryKey: interviewKeys.detail(interview.id), exact: true });
      router.replace(`/interviews/${interview.id}/report`);
    };
  });

  // Mic on only when not muted and, in push-to-talk, only while the key is held.
  // (Always on during pre-check so the level meter works.)
  const { setEnabled } = mic;
  useEffect(() => {
    setEnabled(phase === 'precheck' || (!muted && (inputMode === 'vad' || pttPressed)));
  }, [setEnabled, micTrack, phase, muted, inputMode, pttPressed]);

  useEffect(() => {
    if (phase === 'live') call.setRemoteMuted(muted);
  }, [phase, muted, call]);

  // Local VAD: speaking over the interviewer interrupts it (barge-in, once the bot supports it).
  const level = useMicLevel(mic.stream, {
    onSpeechStart: () => {
      if (!VOICE_FEATURES.bargeIn) return;
      const s = useCallStore.getState();
      if (phase === 'live' && s.turnState === 'ai_speaking' && s.inputMode === 'vad' && !s.muted) {
        call.send({ type: 'barge_in' });
      }
    },
  });

  const pttDown = useCallback(() => {
    const s = useCallStore.getState();
    if (s.inputMode !== 'ptt' || s.muted || s.pttPressed) return;
    setPttPressed(true);
    if (VOICE_FEATURES.bargeIn && s.turnState === 'ai_speaking') call.send({ type: 'barge_in' });
    call.send({ type: 'ptt', pressed: true });
  }, [call, setPttPressed]);

  const pttUp = useCallback(() => {
    if (!useCallStore.getState().pttPressed) return;
    setPttPressed(false);
    call.send({ type: 'ptt', pressed: false });
  }, [call, setPttPressed]);

  const toggleMute = useCallback(() => {
    const next = !useCallStore.getState().muted;
    if (next) pttUp();
    setMuted(next);
  }, [pttUp, setMuted]);

  // Warn before closing the tab or reloading while the call is up.
  const turnState = useCallStore((s) => s.turnState);
  const inCall = phase === 'live' && turnState !== 'ended';
  useEffect(() => {
    if (!inCall) return;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [inCall]);

  useRoomShortcuts({
    enabled: phase === 'live',
    pushToTalk: VOICE_FEATURES.pushToTalk,
    onPttDown: pttDown,
    onPttUp: pttUp,
    onToggleMute: toggleMute,
    onRequestEnd: () => setConfirmEnd(true),
  });

  function changeInputMode(mode) {
    setInputMode(mode);
    writeJson(STORAGE_KEYS.roomPrefs, { inputMode: mode });
  }

  // Called from the Join / Rejoin click: the browser only plays audio after a user gesture.
  function join() {
    remoteAudio.current?.play().catch(() => {});
    setPhase('live');
    call.join().catch(() => {
      // describeJoinError already put the message in the store for LiveCall to show
    });
  }

  async function switchToText() {
    await call.leave();
    mic.stop();
    onUseText();
  }

  return (
    <>
      {/* The interviewer's voice. Not shown; captions carry the content. */}
      <audio ref={remoteAudio} autoPlay playsInline className="hidden" />

      {phase === 'precheck' ? (
        <div className="flex min-h-dvh flex-col">
          <RoomHeader interview={interview} />
          <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
            <PreCheck
              interview={interview}
              mic={mic}
              level={level}
              supported={supported}
              inputMode={inputMode}
              onInputModeChange={VOICE_FEATURES.pushToTalk ? changeInputMode : null}
              onJoin={join}
              onUseText={switchToText}
            />
          </main>
        </div>
      ) : (
        <LiveCall
          interview={interview}
          level={level}
          onToggleMute={toggleMute}
          onPttDown={pttDown}
          onPttUp={pttUp}
          onRequestEnd={() => setConfirmEnd(true)}
          onRetry={join}
          onUseText={switchToText}
        />
      )}

      <ConfirmDialog
        open={confirmEnd}
        onCancel={() => setConfirmEnd(false)}
        onConfirm={() => end.mutate()}
        loading={end.isPending}
        title="End the interview now?"
        description="You will get a report based on the answers so far. You cannot resume this interview after ending it."
        confirmLabel="End interview"
        destructive
      />
    </>
  );
}
