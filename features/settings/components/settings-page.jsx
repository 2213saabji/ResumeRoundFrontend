'use client';

import { PageHeader } from '@/components/layout/page-header';
import { useCurrentUser } from '@/lib/auth/session';
import { AccountSection } from './account-section';
import { AppearanceSection } from './appearance-section';
import { PreferencesSection } from './preferences-section';
import { PrivacySection } from './privacy-section';

export function SettingsPage() {
  const { data: user } = useCurrentUser();
  if (!user) return null; // AuthGuard guarantees a user; this only satisfies the render path

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" />
      <AccountSection user={user} />
      <PreferencesSection user={user} />
      <AppearanceSection />
      <PrivacySection />
    </div>
  );
}
