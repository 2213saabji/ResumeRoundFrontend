'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { reportError } from '@/lib/logger';

/**
 * Body for app/**\/error.jsx boundaries: one per route segment, so a crash in one page does not
 * take down the shell.
 * @param {{ error: Error & { digest?: string }, reset: () => void }} props
 */
export function RouteError({ error, reset }) {
  useEffect(() => {
    reportError(error, { boundary: 'route', digest: error.digest });
  }, [error]);

  return (
    <div
      role="alert"
      className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 text-center"
    >
      <h1 className="text-xl font-semibold">This page ran into a problem</h1>
      <p className="max-w-md text-fg-muted">
        Try again. If it keeps happening, reload the page.
        {error.digest ? (
          <span className="block text-xs text-fg-subtle">Ref {error.digest}</span>
        ) : null}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
