'use client';

import { Spinner } from '@/components/ui/spinner';
import { useCallStore } from '../store';

/** Shown while the call is being re-established after a drop. */
export function ReconnectBanner() {
  const reconnecting = useCallStore((s) => s.turnState === 'reconnecting');
  if (!reconnecting) return null;
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-sm"
    >
      <Spinner className="text-warning" />
      <p>
        <span className="font-medium">Connection lost. Reconnecting...</span>{' '}
        <span className="text-fg-muted">
          Your interview is saved and will continue where it stopped.
        </span>
      </p>
    </div>
  );
}
