'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useSyncExternalStore } from 'react';
import { refreshSession } from '@/lib/api/client';
import { authApi, meApi } from '@/lib/api/endpoints';
import { meKeys } from '@/lib/api/query-keys';
import { clearAppStorage } from '@/lib/storage';
import {
  getSessionStatus,
  getSessionUser,
  setAnonymous,
  setAuthenticated,
  subscribeSession,
} from './token-store';

export const DEFAULT_APP_ROUTE = '/interviews/new';

/** @type {Promise<any> | null} */
let bootstrapPromise = null;

/**
 * Restores the session once per page load with POST /auth/refresh. Safe to call from many
 * components (and from React Strict Mode double effects): they all share one request.
 * Resolves with the user, or null when signed out. Rejects on network/server errors.
 */
export function ensureSession() {
  const status = getSessionStatus();
  if (status === 'authenticated') return Promise.resolve(getSessionUser());
  if (status === 'anonymous') return Promise.resolve(null);
  if (!bootstrapPromise) {
    bootstrapPromise = refreshSession()
      .then((body) => body.user)
      .catch((err) => {
        bootstrapPromise = null; // allow a retry after network errors
        if (err?.status === 401) {
          setAnonymous();
          return null;
        }
        throw err;
      });
  }
  return bootstrapPromise;
}

/** @returns {import('./token-store').SessionStatus} */
export function useSessionStatus() {
  return useSyncExternalStore(subscribeSession, getSessionStatus, () => 'unknown');
}

/**
 * The signed-in user (GET /me). Seeded from the last login/refresh response, so mounting it
 * after authentication does not hit the network. Only call it below AuthGuard.
 */
export function useCurrentUser() {
  const status = useSessionStatus();
  return useQuery({
    queryKey: meKeys.all,
    queryFn: meApi.get,
    enabled: status === 'authenticated',
    staleTime: 5 * 60_000,
    initialData: () => getSessionUser() ?? undefined,
  });
}

export function useAuthActions() {
  const queryClient = useQueryClient();

  /** Store the tokens and user from a register/login/google response. */
  const signIn = useCallback(
    (/** @type {{ user: any, accessToken: string }} */ body) => {
      setAuthenticated(body.accessToken, body.user);
      queryClient.setQueryData(meKeys.all, body.user);
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // the cookie may already be gone; signing out locally is what matters
    }
    bootstrapPromise = null;
    setAnonymous();
    queryClient.clear();
    clearAppStorage();
  }, [queryClient]);

  return { signIn, signOut };
}

/**
 * Only same-origin relative paths are allowed as post-login redirects.
 * @param {string | null | undefined} next
 */
export function safeNextPath(next) {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\'))
    return null;
  return next;
}

/** Where to send a user right after signing in. */
export function postAuthRoute(user, next) {
  if (!user?.onboarded) return '/onboarding';
  return safeNextPath(next) ?? DEFAULT_APP_ROUTE;
}
