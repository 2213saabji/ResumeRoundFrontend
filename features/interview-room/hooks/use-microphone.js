'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Voice processing the browser does for us before audio is sent. */
export const VOICE_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
};

/** @param {unknown} err */
function describeMicError(err) {
  const name = /** @type {any} */ (err)?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return "Microphone access is blocked. Allow it in your browser's site settings, then try again.";
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No microphone was found. Plug one in or pick another device.';
  }
  if (name === 'NotReadableError') {
    return 'Your microphone is being used by another app. Close it and try again.';
  }
  return 'Could not start your microphone.';
}

/**
 * Microphone permission, device list and the live stream. Tracks are stopped on unmount and
 * when the page is hidden for good, so the mic indicator never stays on.
 */
export function useMicrophone() {
  const [stream, setStream] = useState(/** @type {MediaStream | null} */ (null));
  const [devices, setDevices] = useState(/** @type {MediaDeviceInfo[]} */ ([]));
  const [deviceId, setDeviceId] = useState(/** @type {string | null} */ (null));
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [requesting, setRequesting] = useState(false);
  const streamRef = useRef(/** @type {MediaStream | null} */ (null));

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === 'audioinput'));
    } catch {
      setDevices([]);
    }
  }, []);

  /** Asks for permission (first call) and starts the chosen device. */
  const start = useCallback(
    async (/** @type {string | null} */ id = null) => {
      setRequesting(true);
      setError(null);
      try {
        const next = await navigator.mediaDevices.getUserMedia({
          audio: { ...VOICE_CONSTRAINTS, ...(id ? { deviceId: { exact: id } } : {}) },
          video: false,
        });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = next;
        setStream(next);
        setDeviceId(next.getAudioTracks()[0]?.getSettings().deviceId ?? id);
        await refreshDevices(); // labels are only visible after permission
      } catch (err) {
        setError(describeMicError(err));
      } finally {
        setRequesting(false);
      }
    },
    [refreshDevices],
  );

  useEffect(() => {
    const md = navigator.mediaDevices;
    if (!md?.addEventListener) return;
    md.addEventListener('devicechange', refreshDevices);
    return () => md.removeEventListener('devicechange', refreshDevices);
  }, [refreshDevices]);

  useEffect(() => {
    const onPageHide = (e) => {
      if (!e.persisted) streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /** Mute/unmute at the source (a disabled track sends silence). */
  const setEnabled = useCallback((/** @type {boolean} */ enabled) => {
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = enabled;
    });
  }, []);

  return { stream, devices, deviceId, error, requesting, start, stop, setEnabled };
}
