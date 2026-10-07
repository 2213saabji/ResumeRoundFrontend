'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { interviewsApi } from '@/lib/api/endpoints';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { interviewKeys } from '@/lib/api/query-keys';

/** User-facing message for a failed answer submission. */
export function answerErrorMessage(err) {
  if (err instanceof ApiError && err.code === 'NOT_IMPLEMENTED') {
    return 'Typed answers are not available yet. This part of the interviewer is still rolling out.';
  }
  return errorMessage(err, 'Your answer was not sent. Please try again.');
}

/**
 * POST /interviews/:id/answers (text mode and the voice-call text fallback).
 * @param {string} interviewId
 */
export function useSubmitAnswer(interviewId) {
  const queryClient = useQueryClient();
  return useMutation({
    /** @param {{ answerText: string, idempotencyKey: string }} v */
    mutationFn: ({ answerText, idempotencyKey }) =>
      interviewsApi.answer(interviewId, answerText, idempotencyKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: interviewKeys.turns(interviewId) }),
  });
}
