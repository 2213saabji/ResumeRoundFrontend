'use client';

import { useState, useSyncExternalStore } from 'react';
import { Card } from '@/components/ui/card';
import { RadioCardGroup } from '@/components/ui/radio-card-group';
import { getThemePreference, setThemePreference } from '@/lib/theme';

const OPTIONS = [
  { value: 'system', label: 'System', description: 'Follow your device' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const noopSubscribe = () => () => {};

export function AppearanceSection() {
  const stored = useSyncExternalStore(noopSubscribe, getThemePreference, () => 'system');
  const [choice, setChoice] = useState(/** @type {string | null} */ (null));
  const value = choice ?? stored;

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">Appearance</h2>
      <RadioCardGroup
        legend="Theme"
        columns={3}
        options={OPTIONS}
        value={value}
        onValueChange={(v) => {
          setChoice(v);
          setThemePreference(/** @type {any} */ (v));
        }}
      />
    </Card>
  );
}
