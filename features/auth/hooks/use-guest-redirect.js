'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { ensureSession, postAuthRoute } from '@/lib/auth/session';

/** On /login and /signup: users who are already signed in skip straight into the app. */
export function useGuestRedirect() {
  const router = useRouter();
  const next = useSearchParams().get('next');

  useEffect(() => {
    let cancelled = false;
    ensureSession()
      .then((user) => {
        if (!cancelled && user) router.replace(postAuthRoute(user, next));
      })
      .catch(() => {
        // offline or server down: keep showing the form
      });
    return () => {
      cancelled = true;
    };
  }, [router, next]);

  return next;
}
