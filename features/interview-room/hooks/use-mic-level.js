'use client';

import { useEffect, useRef, useState } from 'react';

/** RMS level (0-1) above which we treat the input as speech. */
export const SPEECH_THRESHOLD = 0.06;
/** Speech must last this long before it counts (filters clicks and coughs). */
export const SPEECH_MIN_MS = 180;
/** UI refresh rate for the meter; the analyser itself runs every animation frame. */
const UI_FPS = 15;

/**
 * Microphone level meter and a simple local voice-activity detector (Web Audio AnalyserNode).
 * The server does the real end-of-turn detection; this only drives the meter and barge-in.
 *
 * @param {MediaStream | null} stream
 * @param {{ onSpeechStart?: () => void, onSpeechEnd?: () => void }} [handlers]
 * @returns {number} current level, 0-1
 */
export function useMicLevel(stream, handlers = {}) {
  const [level, setLevel] = useState(0);
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const track = stream?.getAudioTracks()[0];
    if (!stream || !track) return;

    const Ctx = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const buf = new Float32Array(analyser.fftSize);

    let raf = 0;
    let lastUi = 0;
    let aboveSince = 0;
    let belowSince = 0;
    let speaking = false;

    const tick = (now) => {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = track.enabled ? Math.sqrt(sum / buf.length) : 0;

      if (rms > SPEECH_THRESHOLD) {
        belowSince = 0;
        aboveSince ||= now;
        if (!speaking && now - aboveSince >= SPEECH_MIN_MS) {
          speaking = true;
          handlersRef.current.onSpeechStart?.();
        }
      } else {
        aboveSince = 0;
        belowSince ||= now;
        if (speaking && now - belowSince >= 600) {
          speaking = false;
          handlersRef.current.onSpeechEnd?.();
        }
      }

      if (now - lastUi >= 1000 / UI_FPS) {
        lastUi = now;
        // Perceptual scaling so normal speech fills most of the meter.
        setLevel(Math.min(1, Math.sqrt(rms) * 1.8));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      ctx.close().catch(() => {});
      setLevel(0);
    };
  }, [stream]);

  return level;
}
