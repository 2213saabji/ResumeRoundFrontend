'use client';

import { useMutation } from '@tanstack/react-query';
import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ANSWER_MAX_CHARS } from '@/contracts/limits';
import { interviewsApi } from '@/lib/api/endpoints';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { useCallStore } from '../store';

/** Collapsible "type instead" box for the voice call (mic trouble, noisy room). */
export function TextAnswer({ interviewId }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState(/** @type {string | null} */ (null));
  // seq of the open question: from the interviewer's captions when known, else kept from the
  // last answers response. Never looked up with start: on a created interview that starts the
  // clock and generates a question.
  const seq = useRef(/** @type {number | null} */ (null));
  const submit = useMutation({
    mutationFn: async (answerText) => {
      seq.current = useCallStore.getState().currentSeq ?? seq.current;
      if (seq.current == null) {
        // GET /interviews/:id has no side effects.
        const { currentTurn } = await interviewsApi.getSession(interviewId);
        if (!currentTurn) throw new Error('There is no open question to answer right now.');
        seq.current = currentTurn.seq;
      }
      try {
        const res = await interviewsApi.answer(interviewId, { seq: seq.current, answerText });
        seq.current = res.currentTurn?.seq ?? null;
        useCallStore.setState({ currentSeq: seq.current });
        return res;
      } catch (err) {
        // The question moved on (e.g. answered by voice): look it up again on the next send.
        if (err instanceof ApiError && err.code === 'CONFLICT') {
          seq.current = null;
          useCallStore.setState({ currentSeq: null });
        }
        throw err;
      }
    },
  });
  const addTypedAnswer = useCallStore((s) => s.addTypedAnswer);

  async function send() {
    const answer = text.trim();
    if (!answer) return;
    setError(null);
    try {
      await submit.mutateAsync(answer);
      addTypedAnswer(answer);
      setText('');
    } catch (err) {
      setError(
        err instanceof ApiError && (err.code === 'NOT_IMPLEMENTED' || err.code === 'NOT_FOUND')
          ? 'Typed answers are not available on this server yet.'
          : err instanceof ApiError && err.code === 'CONFLICT'
            ? 'The interviewer has moved on to another question. Check the captions, then send again.'
            : errorMessage(err, 'Your answer was not sent. Please try again.'),
      );
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
