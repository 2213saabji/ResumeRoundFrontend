'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { ANSWER_MAX_CHARS } from '@/contracts/limits';
import { newIdempotencyKey } from '@/lib/api/endpoints';
import { canReuseIdempotencyKey, errorMessage } from '@/lib/api/errors';
import { useEndInterview } from '../hooks/use-end-interview';
import { answerErrorMessage, useSubmitAnswer } from '../hooks/use-submit-answer';
import { pendingTurn, useTurns } from '../hooks/use-turns';
import { RoomHeader } from './room-header';

/**
 * Text-only interview: the same adaptive loop, answered by typing. Used for mode "text", when
 * WebRTC is unavailable, or when the candidate switches away from voice.
 * @param {{ interview: any }} props
 */
export function TextInterview({ interview }) {
  const formId = useId();
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState(/** @type {string | null} */ (null));
  const [confirmEnd, setConfirmEnd] = useState(false);
  const bottomRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  // One key per question attempt: resending after a dropped connection never creates a second turn.
  const answerKey = useRef({ seq: /** @type {number | null} */ (null), key: '' });

  const turns = useTurns(interview.id);
  const submit = useSubmitAnswer(interview.id);
  const end = useEndInterview(interview.id);

  const items = turns.data ?? [];
  const pending = pendingTurn(items);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [items.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !e.target.closest?.('dialog[open]')) setConfirmEnd(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function send() {
    const answerText = draft.trim();
    if (!answerText || !pending) return;
    setSendError(null);
    if (answerKey.current.seq !== pending.seq) {
      answerKey.current = { seq: pending.seq, key: newIdempotencyKey() };
    }
    try {
      await submit.mutateAsync({ answerText, idempotencyKey: answerKey.current.key });
      setDraft('');
    } catch (err) {
      if (!canReuseIdempotencyKey(err)) answerKey.current.key = newIdempotencyKey();
      setSendError(answerErrorMessage(err));
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <RoomHeader interview={interview}>
        <Button variant="danger" size="sm" onClick={() => setConfirmEnd(true)}>
          End interview
        </Button>
      </RoomHeader>

      <main
        id="main"
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6"
      >
        {turns.error && !turns.data ? (
          <Alert
            tone="danger"
            title="Could not load the conversation"
            action={
              <Button variant="secondary" onClick={() => turns.refetch()}>
                Try again
              </Button>
            }
          >
            {errorMessage(turns.error)}
          </Alert>
        ) : null}

        <ol className="flex flex-col gap-5" aria-label="Interview transcript">
          {items.map((t) => (
            <li key={t.seq} className="flex flex-col gap-3">
              <div className="max-w-[90%] rounded-xl rounded-tl-sm bg-surface-2 px-4 py-3">
                <p className="mb-1 text-xs font-medium text-accent">Interviewer</p>
                <p className="leading-relaxed">{t.questionText}</p>
              </div>
              {t.answerText ? (
                <div className="ml-auto max-w-[90%] rounded-xl rounded-tr-sm border border-border bg-surface px-4 py-3">
                  <p className="mb-1 text-xs font-medium text-success">You</p>
                  <p className="leading-relaxed whitespace-pre-wrap">{t.answerText}</p>
                </div>
              ) : null}
            </li>
          ))}
        </ol>

        {!pending && !turns.isPending ? (
          <p role="status" className="flex items-center gap-2 text-sm text-fg-muted">
            <Spinner />
            {items.length === 0
              ? "Waiting for the interviewer's first question..."
              : 'The interviewer is thinking...'}
          </p>
        ) : null}
        <div ref={bottomRef} />
      </main>

      <footer className="sticky bottom-0 border-t border-border bg-surface/95 backdrop-blur">
        <form
          id={formId}
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-4 sm:px-6"
        >
          <label htmlFor={`${formId}-answer`} className="sr-only">
            Your answer
          </label>
          <Textarea
            id={`${formId}-answer`}
            rows={4}
            value={draft}
            maxLength={ANSWER_MAX_CHARS}
            disabled={!pending}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={
              pending
                ? 'Explain your thinking as you would out loud. Ctrl+Enter to send.'
                : 'Wait for the next question...'
            }
          />
          {sendError ? (
            <p role="alert" className="text-sm text-danger">
              {sendError}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-fg-subtle">
              {draft.length}/{ANSWER_MAX_CHARS}
            </p>
            <Button type="submit" loading={submit.isPending} disabled={!pending || !draft.trim()}>
              Send answer
            </Button>
          </div>
        </form>
      </footer>

      <ConfirmDialog
        open={confirmEnd}
        onCancel={() => setConfirmEnd(false)}
        onConfirm={() => end.mutate()}
        loading={end.isPending}
        title="End the interview now?"
        description="You will get a report based on the answers so far. You cannot resume this interview after ending it."
        confirmLabel="End interview"
        destructive
      />
    </div>
  );
}
