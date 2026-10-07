'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FullPageSpinner } from '@/components/ui/full-page-spinner';
import { errorMessage } from '@/lib/api/errors';
import { useCurrentUser } from './session';

/**
 * Mounted only once authenticated, so the /me query starts from the refresh response.
 * Sends users who have not picked role/level/company type to /onboarding.
 */
export function OnboardingGate({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, error, refetch } = useCurrentUser();

  const needsOnboarding = !!user && !user.onboarded;
  const onOnboarding = pathname === '/onboarding';

  useEffect(() => {
    if (needsOnboarding && !onOnboarding) router.replace('/onboarding');
  }, [needsOnboarding, onOnboarding, router]);

  if (!user && error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-fg-muted">{errorMessage(error)}</p>
        <Button onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  if (!user || (needsOnboarding && !onOnboarding)) {
    return <FullPageSpinner label="Loading your session" />;
  }

  return children;
}
