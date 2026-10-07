'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

function fmt(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Elapsed / planned time. Starts when the interviewer first speaks.
 * @param {{ startedAt: number | null, durationSec: number }} props
 */
export function CallTimer({ startedAt, durationSec }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  const elapsed = startedAt ? (now - startedAt) / 1000 : 0;
  const nearEnd = startedAt && durationSec - elapsed <= 120;

  return (
    <p className={cn('font-mono text-sm tabular-nums', nearEnd ? 'text-warning' : 'text-fg-muted')}>
      <span className="sr-only">Elapsed time </span>
      {fmt(elapsed)}
      <span className="text-fg-subtle"> / {fmt(durationSec)}</span>
    </p>
  );
}
