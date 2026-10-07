'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { resumesApi } from '@/lib/api/endpoints';
import { resumeKeys } from '@/lib/api/query-keys';

export const RESUME_POLL_MS = 2000;
export const RESUME_POLL_TIMEOUT_MS = 90_000;

export const isResumeDone = (status) => status === 'ready' || status === 'failed';

/**
 * Polls GET /resumes/:id every 2 s until it is ready or failed, and gives up after 90 s so the
 * user can retry instead of watching a spinner forever.
 * Mount the calling component with key={resumeId} so the polling window resets per resume.
 * @param {string} resumeId
 */
export function useResumeStatus(resumeId) {
  const [windowStart, setWindowStart] = useState(() => Date.now());
  const [timedOut, setTimedOut] = useState(false);

  const query = useQuery({
    queryKey: resumeKeys.detail(resumeId),
    queryFn: () => resumesApi.get(resumeId),
    enabled: !timedOut,
    staleTime: 0,
    refetchInterval: (q) => (isResumeDone(q.state.data?.status) ? false : RESUME_POLL_MS),
    refetchIntervalInBackground: true,
  });

  const status = query.data?.status;
  const done = isResumeDone(status);

  useEffect(() => {
    if (done || timedOut) return;
    const remaining = RESUME_POLL_TIMEOUT_MS - (Date.now() - windowStart);
    const t = setTimeout(() => setTimedOut(true), Math.max(0, remaining));
    return () => clearTimeout(t);
  }, [done, timedOut, windowStart]);

  return {
    resume: query.data ?? null,
    error: query.error,
    timedOut: timedOut && !done,
    /** Start a fresh 90 s polling window. */
    retry: () => {
      setWindowStart(Date.now());
      setTimedOut(false);
      query.refetch();
    },
  };
}
