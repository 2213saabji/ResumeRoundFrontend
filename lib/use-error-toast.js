'use client';

import { useCallback } from 'react';
import { useToast } from '@/components/ui/toast';
import { ApiError, errorMessage } from '@/lib/api/errors';

/**
 * Shows a recoverable error as a toast, including the backend requestId so users can quote it
 * in bug reports.
 */
export function useErrorToast() {
  const { show } = useToast();
  return useCallback(
    (/** @type {unknown} */ err, /** @type {string} */ title = 'Something went wrong') => {
      const message = errorMessage(err);
      const requestId = err instanceof ApiError ? err.requestId : undefined;
      const ref = requestId && !message.includes(requestId) ? ` (ref ${requestId})` : '';
      show({ tone: 'error', title, description: `${message}${ref}` });
    },
    [show],
  );
}
