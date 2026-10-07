import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/errors';

/** Client errors (4xx) are not worth retrying; network and 5xx errors get two retries. */
function shouldRetry(failureCount, error) {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/** @type {QueryClient | undefined} */
let browserClient;

/**
 * One client per browser tab, shared by every route group (so the cache survives moving from
 * the app to the interview room); a fresh one per server render.
 */
export function getQueryClient() {
  if (typeof window === 'undefined') return makeQueryClient();
  browserClient ??= makeQueryClient();
  return browserClient;
}
