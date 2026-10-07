'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/logger';

/** Last-resort boundary for errors in the root layout itself. */
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    reportError(error, { boundary: 'global', digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{ fontFamily: 'system-ui, sans-serif', padding: '3rem 1rem', textAlign: 'center' }}
      >
        <h1>Something went wrong</h1>
        <p>Please reload the page.</p>
        <button type="button" onClick={reset}>
          Try again
        </button>
      </body>
    </html>
  );
}
