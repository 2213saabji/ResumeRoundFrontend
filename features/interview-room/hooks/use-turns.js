'use client';

import { useQuery } from '@tanstack/react-query';
import { interviewsApi } from '@/lib/api/endpoints';
import { interviewKeys } from '@/lib/api/query-keys';

/** The question waiting for an answer, if any. */
export function pendingTurn(turns) {
  const last = turns?.[turns.length - 1];
  return last && !last.answerText ? last : null;
}

/**
 * Transcript for text mode. Polls every 3 s while waiting for the interviewer's next question.
 * @param {string} interviewId
 * @param {{ enabled?: boolean }} [opts]
 */
export function useTurns(interviewId, { enabled = true } = {}) {
  return useQuery({
    queryKey: interviewKeys.turns(interviewId),
    queryFn: () => interviewsApi.allTurns(interviewId),
    enabled,
    staleTime: 0,
    refetchInterval: (q) => (q.state.error || pendingTurn(q.state.data) ? false : 3000),
  });
}
