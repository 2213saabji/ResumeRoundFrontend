'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { interviewsApi } from '@/lib/api/endpoints';
import { interviewKeys } from '@/lib/api/query-keys';
import { useErrorToast } from '@/lib/use-error-toast';

/**
 * POST /interviews/:id/end (idempotent), then go to the report page.
 * @param {string} interviewId
 * @param {{ beforeNavigate?: () => Promise<void> | void }} [opts]
 */
export function useEndInterview(interviewId, { beforeNavigate } = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toastError = useErrorToast();

  return useMutation({
    mutationFn: () => interviewsApi.end(interviewId),
    onSuccess: async (interview) => {
      queryClient.setQueryData(interviewKeys.detail(interviewId), interview);
      await beforeNavigate?.();
      router.replace(`/interviews/${interviewId}/report`);
    },
    onError: (err) => toastError(err, 'Could not end the interview'),
  });
}
