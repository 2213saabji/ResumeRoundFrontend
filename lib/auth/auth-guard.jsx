'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FullPageSpinner } from '@/components/ui/full-page-spinner';
import { errorMessage } from '@/lib/api/errors';
import { OnboardingGate } from './onboarding-gate';
import { ensureSession, useSessionStatus } from './session';

/**
 * Protects app routes: restores the session once per page load and sends signed-out users to
 * /login?next=<current path>.
 */
export function AuthGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useSessionStatus();
  const [bootError, setBootError] = useState(/** @type {unknown} */ (null));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    ensureSession().catch((err) => {
      if (!cancelled) setBootError(err);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, pathname, router]);

  if (bootError && status === 'unknown') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-fg-muted">{errorMessage(bootError)}</p>
        <Button
          onClick={() => {
            setBootError(null);
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (status !== 'authenticated') return <FullPageSpinner label="Loading your session" />;

  return <OnboardingGate>{children}</OnboardingGate>;
}
