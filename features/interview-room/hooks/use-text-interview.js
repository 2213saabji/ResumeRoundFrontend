'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { interviewsApi } from '@/lib/api/endpoints';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { interviewKeys } from '@/lib/api/query-keys';
import { reportError } from '@/lib/logger';
import { initialTextInterviewState, textInterviewReducer } from '../text-interview-machine';

/** 503 (AI provider failed; the answer is saved) and network errors are retried as-is. */
export const RETRY_DELAYS_MS = [1000, 2000, 4000];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Longest Retry-After we wait out automatically on a 429 before handing control back. */
const MAX_RATE_LIMIT_WAIT_MS = 60_000;

/** @param {unknown} err */
export function isTransient(err) {
  if (!(err instanceof ApiError)) return true;
  return err.status === 0 || err.code === 'SERVICE_UNAVAILABLE' || err.status >= 500;
}

/** How long to wait before resending after a 429, or null when it is not one we wait out. */
function rateLimitWaitMs(err) {
  if (!(err instanceof ApiError) || err.code !== 'RATE_LIMITED') return null;
  const ms = (err.retryAfterSec ?? 5) * 1000;
  return ms <= MAX_RATE_LIMIT_WAIT_MS ? ms : null;
}

/** Start/answers missing on this server (backend milestone not shipped yet). */
function isNotLive(err) {
  return err instanceof ApiError && (err.code === 'NOT_IMPLEMENTED' || err.code === 'NOT_FOUND');
}

const NOT_LIVE_MESSAGE =
  'Text interviews are not live on this server yet. The interviewer is the next backend milestone.';

/**
 * Drives the text interview: POST /start for the first (or current) question, POST /answers
 * for each next one. Questions only come back in those responses; /turns is read once, for
 * history after a reload.
 * @param {any} interview the interview object from GET /interviews/:id
 * @param {{ progress: any, currentTurn: any, fetchedAt?: number } | null} [session] the rest of that
 *   GET response (siblings of interview), used to restore a reloaded interview without calling start
 */
export function useTextInterview(interview, session = null) {
  const id = interview.id;
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(textInterviewReducer, interview, initialTextInterviewState);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const safeDispatch = useCallback((action) => {
    if (alive.current) dispatch(action);
  }, []);

  /** Keep the shared interview cache in step (the report page reads it). */
  const cacheInterview = useCallback(
    (patch) => {
      if (!patch) return;
      queryClient.setQueryData(interviewKeys.detail(id), (old) =>
        old ? { ...old, ...patch } : old,
      );
    },
    [queryClient, id],
  );

  /** POST /start with retries on transient failures. */
  const callStart = useCallback(async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await interviewsApi.start(id);
      } catch (err) {
        if (!isTransient(err) || attempt >= RETRY_DELAYS_MS.length || !alive.current) throw err;
        await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
  }, [id]);

  /**
   * After a 409 the local state is stale: re-read GET /interviews/:id and branch on its status
   * (guide 7.4, "Page reload"). With details.currentSeq the question moved on (another tab);
   * without it the interview is not running (not started yet, or already ended).
   * @param {ApiError} conflict
   */
  const recover = useCallback(
    async (conflict) => {
      try {
        const res = await interviewsApi.getSession(id);
        cacheInterview(res.interview);
        const { status } = res.interview;
        if (status === 'created') {
          safeDispatch({ type: 'notStarted' });
        } else if (status === 'in_progress' && res.currentTurn) {
          safeDispatch({
            type: 'resynced',
            ...res,
            now: Date.now(),
            notice:
              conflict.details?.currentSeq != null
                ? 'The interview had already moved on (maybe in another tab). Here is the current question; your text is still in the box.'
                : null,
          });
        } else {
          safeDispatch({ type: 'ended' });
        }
      } catch (err) {
        safeDispatch({ type: 'answerRejected', message: errorMessage(err) });
      }
    },
    [cacheInterview, id, safeDispatch],
  );

  /**
   * Start, or restore after a reload: start is safe to call again and returns the open
   * question; past turns come from /turns.
   */
  const start = useCallback(
    async ({ restore = false } = {}) => {
      safeDispatch({ type: 'start' });
      try {
        const [res, turns] = await Promise.all([
          callStart(),
          restore ? interviewsApi.allTurns(id).catch(() => []) : Promise.resolve([]),
        ]);
        cacheInterview(res.interview);
        safeDispatch({ type: 'synced', ...res, turns, now: Date.now() });
      } catch (err) {
        if (err instanceof ApiError && err.code === 'CONFLICT') {
          await recover(err);
          return;
        }
        if (!isNotLive(err)) reportError(err, { phase: 'text-start', interviewId: id });
        safeDispatch({
          type: 'startFailed',
          message: isNotLive(err) ? NOT_LIVE_MESSAGE : errorMessage(err),
        });
      }
    },
    [callStart, cacheInterview, id, recover, safeDispatch],
  );

  /** POST /answers for { seq, answerText }; retries the exact same request on 503/network. */
  const send = useCallback(
    async (seq, answerText) => {
      for (let attempt = 0; ; attempt++) {
        try {
          const res = await interviewsApi.answer(id, { seq, answerText });
          cacheInterview(res.interview);
          safeDispatch({ type: 'answered', response: res, now: Date.now() });
          return;
        } catch (err) {
          if (!alive.current) return;
          if (isTransient(err) && attempt < RETRY_DELAYS_MS.length) {
            safeDispatch({ type: 'retrying', attempt: attempt + 1 });
            await sleep(RETRY_DELAYS_MS[attempt]);
            continue;
          }
          // 429: wait out Retry-After once and resend; a longer wait goes back to the candidate.
          const waitMs = rateLimitWaitMs(err);
          if (waitMs != null && attempt === 0) {
            safeDispatch({ type: 'retrying', attempt: attempt + 1 });
            await sleep(waitMs);
            continue;
          }
          if (isTransient(err)) {
            safeDispatch({
              type: 'answerStuck',
              message:
                'The interviewer did not respond. Your answer is saved on our side; retry to get the next question.',
            });
          } else if (err instanceof ApiError && err.code === 'CONFLICT') {
            await recover(err);
          } else if (isNotLive(err)) {
            safeDispatch({ type: 'answerRejected', message: NOT_LIVE_MESSAGE });
          } else {
            safeDispatch({ type: 'answerRejected', message: errorMessage(err) });
          }
          return;
        }
      }
    },
    [cacheInterview, id, recover, safeDispatch],
  );

  const submit = useCallback(() => {
    const answerText = state.draft.trim();
    if (!answerText || !state.currentTurn || state.status !== 'active') return;
    const seq = state.currentTurn.seq;
    dispatch({ type: 'submit', seq, answerText });
    send(seq, answerText);
  }, [state.draft, state.currentTurn, state.status, send]);

  /** Resend a stuck answer (same seq and text: the server dedupes). */
  const retryAnswer = useCallback(() => {
    const p = state.pending;
    if (!p) return;
    dispatch({ type: 'submit', seq: p.seq, answerText: p.answerText });
    send(p.seq, p.answerText);
  }, [state.pending, send]);

  // A page reload mid-interview (guide 7.4, "Page reload"). Decided once, from the status at mount:
  // starting fresh later flips the cached status to in_progress, and a "created" interview must
  // never be started automatically (start starts the clock).
  const [restoreFrom] = useState(() =>
    interview.status === 'in_progress' ? (session ?? { currentTurn: null, progress: null }) : null,
  );
  useEffect(() => {
    if (!restoreFrom) return;
    if (restoreFrom.currentTurn && restoreFrom.progress) {
      // GET /interviews/:id already returned the open question: no start call needed.
      dispatch({
        type: 'synced',
        progress: restoreFrom.progress,
        currentTurn: restoreFrom.currentTurn,
        now: restoreFrom.fetchedAt ?? Date.now(),
      });
      interviewsApi
        .allTurns(id)
        .then((turns) => safeDispatch({ type: 'historyLoaded', turns }))
        .catch(() => {});
    } else {
      // Older server without progress/currentTurn on GET: start is safe to repeat.
      start({ restore: true });
    }
  }, [restoreFrom, start, id, safeDispatch]);

  return {
    state,
    start: () => start(),
    submit,
    retryAnswer,
    setDraft: (value) => dispatch({ type: 'draft', value }),
    dismissError: () => dispatch({ type: 'dismissError' }),
  };
}
