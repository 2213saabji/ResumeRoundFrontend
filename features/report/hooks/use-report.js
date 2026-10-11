'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { interviewsApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import { interviewKeys } from '@/lib/api/query-keys';

export const REPORT_POLL_MS = 5000;
/** After this, tell the user it is taking longer than usual (it normally takes 30-60 s). */
export const REPORT_SLOW_AFTER_MS = 90_000;
/** Stop polling after this and offer a manual check instead of an endless spinner. */
export const REPORT_GIVE_UP_AFTER_MS = 180_000;

/** 200 statuses that end the wait without a report; each carries a message written for users. */
const FINAL_WITHOUT_REPORT = ['insufficient_answers', 'failed'];

/**
 * GET /interviews/:id/report, polling every 5 s while it is generating (202), for up to 3
 * minutes. ready, insufficient_answers and failed are final.
 * @param {string} interviewId
 * @param {{ enabled: boolean }} opts
 */
export function useReport(interviewId, { enabled }) {
  const [slow, setSlow] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);

  const query = useQuery({
    queryKey: interviewKeys.report(interviewId),
    queryFn: () => interviewsApi.report(interviewId),
    enabled,
    staleTime: 60_000,
    // A 4xx (409: not ended) or 501 will not change on retry.
    retry: (count, err) =>
      !(
        err instanceof ApiError &&
        (err.code === 'NOT_IMPLEMENTED' || (err.status > 0 && err.status < 500))
      ) && count < 2,
    refetchInterval: (q) =>
      q.state.data?.status === 'generating' && !gaveUp ? REPORT_POLL_MS : false,
  });

  const status = query.data?.status;
  const generating = status === 'generating';
  useEffect(() => {
    if (!generating) return;
    const slowTimer = setTimeout(() => setSlow(true), REPORT_SLOW_AFTER_MS);
    const giveUpTimer = setTimeout(() => setGaveUp(true), REPORT_GIVE_UP_AFTER_MS);
    return () => {
      clearTimeout(slowTimer);
      clearTimeout(giveUpTimer);
    };
  }, [generating]);

  /** @type {null | { status: 'insufficient_answers' | 'failed', message: string }} */
  const final = FINAL_WITHOUT_REPORT.includes(status)
    ? { status: /** @type {any} */ (status), message: query.data.message }
    : null;

  // An unknown status from a newer server, or a 501 from an older one: stop waiting, say so.
  const unavailable =
    (!!status && status !== 'generating' && status !== 'ready' && !final) ||
    (query.error instanceof ApiError && query.error.code === 'NOT_IMPLEMENTED');

  return {
    ...query,
    generating,
    slow: generating && slow,
    gaveUp: generating && gaveUp,
    final,
    unavailable,
    /** 409: the interview has not ended (server view), so there is no report to wait for. */
    notEnded: query.error instanceof ApiError && query.error.code === 'CONFLICT',
  };
}
