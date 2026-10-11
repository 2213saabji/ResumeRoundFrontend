'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { remainingSeconds } from '../text-interview-machine';

function fmt(totalSec) {
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`;
}

/**
 * Time left, counted down locally and re-synced from every server response (the server clock
 * is the source of truth).
 * @param {{ progress: any, syncedAt: number, running: boolean }} props
 */
export function InterviewCountdown({ progress, syncedAt, running }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  const left = remainingSeconds(progress, syncedAt, Math.max(now, syncedAt));
  if (left == null) return null;

  return (
    <p
      className={cn(
        'shrink-0 font-mono text-sm tabular-nums',
        left === 0 ? 'text-danger' : left <= 120 ? 'text-warning' : 'text-fg-muted',
      )}
    >
      <span className="sr-only">Time left </span>
      {left === 0 ? "Time's up" : fmt(left)}
    </p>
  );
}
