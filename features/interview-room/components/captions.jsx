'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useCallStore } from '../store';

/**
 * Live captions for both sides. The interviewer's latest line is shown large (one question on
 * screen); the full transcript scrolls below. Captions are always on.
 */
export function Captions() {
  const captions = useCallStore((s) => s.captions);
  const listRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [stickToBottom, setStickToBottom] = useState(true);

  const lastAi = [...captions].reverse().find((c) => c.speaker === 'ai');
  const lastFinalAi = [...captions].reverse().find((c) => c.speaker === 'ai' && c.isFinal);

  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom) el.scrollTop = el.scrollHeight;
  }, [captions, stickToBottom]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="min-h-28">
        <p className="mb-2 text-xs font-medium tracking-wide text-fg-subtle uppercase">
          Interviewer
        </p>
        <p className="text-xl leading-relaxed font-medium text-balance sm:text-2xl">
          {lastAi ? (
            lastAi.text
          ) : (
            <span className="text-fg-subtle">Waiting for the first question...</span>
          )}
        </p>
      </div>

      {/* Screen readers get each finished interviewer line once, not every partial update. */}
      <p className="sr-only" aria-live="polite">
        {lastFinalAi?.text ?? ''}
      </p>

      <div className="flex min-h-0 flex-1 flex-col">
        <h2 className="mb-2 text-xs font-medium tracking-wide text-fg-subtle uppercase">
          Transcript
        </h2>
        <div
          ref={listRef}
          tabIndex={0}
          aria-label="Interview transcript"
          onScroll={(e) => {
            const el = e.currentTarget;
            setStickToBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
          }}
          className="max-h-[40dvh] min-h-32 flex-1 overflow-y-auto rounded-lg border border-border bg-surface p-4"
        >
          {captions.length === 0 ? (
            <p className="text-sm text-fg-subtle">Captions will appear here.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {captions.map((c) => (
                <li key={c.id} className="flex flex-col gap-0.5 text-sm">
                  <span
                    className={cn(
                      'text-xs font-medium',
                      c.speaker === 'ai' ? 'text-accent' : 'text-success',
                    )}
                  >
                    {c.speaker === 'ai' ? 'Interviewer' : 'You'}
                  </span>
                  <span className={cn('leading-relaxed', !c.isFinal && 'text-fg-muted italic')}>
                    {c.text}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
