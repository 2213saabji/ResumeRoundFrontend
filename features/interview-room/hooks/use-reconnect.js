'use client';

import { useEffect, useMemo, useRef } from 'react';

/** The server keeps the interview resumable for 60 s after a drop. */
export const RECONNECT_WINDOW_MS = 60_000;
const BACKOFF_MS = [1000, 2000, 4000, 8000];

/** @param {number} attempt zero-based */
export function backoffDelay(attempt) {
  return BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
}

/**
 * Retries `reconnect` with backoff until it succeeds or the 60 s window closes.
 * Framework-free so it can be unit tested with fake timers.
 * @param {{ current: { reconnect: () => Promise<void>, onGiveUp: () => void } }} opts read at call time, so callers can swap handlers
 * @param {() => number} [now]
 */
export function createReconnector(opts, now = () => Date.now()) {
  let windowStart = 0;
  let attempt = 0;
  let timer = /** @type {ReturnType<typeof setTimeout> | null} */ (null);
  let active = false;

  function cancel() {
    if (timer) clearTimeout(timer);
    timer = null;
    active = false;
    attempt = 0;
  }

  function schedule() {
    if (timer) return; // an attempt is already queued
    if (!active) {
      active = true;
      windowStart = now();
      attempt = 0;
    }
    const delay = backoffDelay(attempt);
    if (now() - windowStart + delay > RECONNECT_WINDOW_MS) {
      cancel();
      opts.current.onGiveUp();
      return;
    }
    timer = setTimeout(async () => {
      timer = null;
      attempt += 1;
      try {
        await opts.current.reconnect();
        cancel();
      } catch {
        if (active) schedule();
      }
    }, delay);
  }

  return { schedule, cancel };
}

/**
 * React wrapper around createReconnector. The returned object has a stable identity.
 * @param {{ reconnect: () => Promise<void>, onGiveUp: () => void }} opts
 */
export function useReconnect(opts) {
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });
  const reconnector = useRef(/** @type {ReturnType<typeof createReconnector> | null} */ (null));
  useEffect(() => {
    const r = createReconnector(optsRef);
    reconnector.current = r;
    return r.cancel;
  }, []);
  return useMemo(
    () => ({
      schedule: () => reconnector.current?.schedule(),
      cancel: () => reconnector.current?.cancel(),
    }),
    [],
  );
}
