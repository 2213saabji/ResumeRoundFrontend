'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { interviewsApi } from '@/lib/api/endpoints';
import { interviewKeys } from '@/lib/api/query-keys';

export const REPORT_POLL_MS = 3000;
/** After this, keep polling slowly and tell the user it is taking longer than usual. */
export const REPORT_SLOW_AFTER_MS = 90_000;

/**
 * GET /interviews/:id/report, polling every 3 s while it is generating (202).
 * @param {string} interviewId
 * @param {{ enabled: boolean }} opts
 */
export function useReport(interviewId, { enabled }) {
  const [slow, setSlow] = useState(false);

  const query = useQuery({
    queryKey: interviewKeys.report(interviewId),
    queryFn: () => interviewsApi.report(interviewId),
    enabled,
    staleTime: 60_000,
    refetchInterval: (q) => {
      if (q.state.data?.status !== 'generating') return false;
      return slow ? REPORT_POLL_MS * 5 : REPORT_POLL_MS;
    },
  });

  const generating = query.data?.status === 'generating';
  useEffect(() => {
    if (!generating) return;
    const t = setTimeout(() => setSlow(true), REPORT_SLOW_AFTER_MS);
    return () => clearTimeout(t);
  }, [generating]);

  return { ...query, generating, slow: generating && slow };
}
