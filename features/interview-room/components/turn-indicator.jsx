'use client';

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/cn';
import { useTurnState } from '../hooks/use-turn-state';

const DOT = {
  neutral: 'bg-fg-subtle',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
};

/** Who is talking right now. Announced politely to screen readers. */
export function TurnIndicator() {
  const { state, label, tone } = useTurnState();
  const busy = state === 'connecting' || state === 'thinking' || state === 'reconnecting';

  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium"
    >
      {busy ? (
        <Spinner className="size-3.5 text-fg-muted" />
      ) : (
        <span className="relative flex size-2.5" aria-hidden="true">
          <span
            className={cn('absolute inset-0 animate-ping rounded-full opacity-60', DOT[tone])}
          />
          <span className={cn('relative size-2.5 rounded-full', DOT[tone])} />
        </span>
      )}
      {label}
    </div>
  );
}
