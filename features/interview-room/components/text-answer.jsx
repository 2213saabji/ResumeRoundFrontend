'use client';

import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ANSWER_MAX_CHARS } from '@/contracts/limits';
import { newIdempotencyKey } from '@/lib/api/endpoints';
import { canReuseIdempotencyKey } from '@/lib/api/errors';
import { answerErrorMessage, useSubmitAnswer } from '../hooks/use-submit-answer';
import { useCallStore } from '../store';

/** Collapsible "type instead" box for the voice call (mic trouble, noisy room). */
export function TextAnswer({ interviewId }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const key = useRef(newIdempotencyKey());
  const submit = useSubmitAnswer(interviewId);
  const addTypedAnswer = useCallStore((s) => s.addTypedAnswer);

  async function send() {
    const answer = text.trim();
    if (!answer) return;
    setError(null);
    try {
      await submit.mutateAsync({ answerText: answer, idempotencyKey: key.current });
      addTypedAnswer(answer);
      setText('');
      key.current = newIdempotencyKey();
    } catch (err) {
      if (!canReuseIdempotencyKey(err)) key.current = newIdempotencyKey();
      setError(answerErrorMessage(err));
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
      >
        Type your answer instead
        <svg
          viewBox="0 0 20 20"
          className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
        </svg>
      </button>
      {open ? (
        <form
          id={`${id}-panel`}
          className="flex flex-col gap-3 border-t border-border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label htmlFor={`${id}-text`} className="sr-only">
            Your answer
          </label>
          <Textarea
            id={`${id}-text`}
            rows={3}
            value={text}
            maxLength={ANSWER_MAX_CHARS}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type your answer. Ctrl+Enter to send."
          />
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={submit.isPending} disabled={!text.trim()}>
              Send answer
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
