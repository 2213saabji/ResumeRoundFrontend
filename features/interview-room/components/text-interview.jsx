'use client';

import { useRouter } from 'next/navigation';
import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { ANSWER_MAX_CHARS } from '@/contracts/limits';
import { useEndInterview } from '../hooks/use-end-interview';
import { useTextInterview } from '../hooks/use-text-interview';
import { AnswerBubble } from './answer-bubble';
import { InterviewCountdown } from './interview-countdown';
import { QuestionBubble } from './question-bubble';
import { RoomHeader } from './room-header';
import { StartPanel } from './start-panel';
import { TopicProgress } from './topic-progress';

/** How long the closing message stays before moving on to the report. */
const CLOSING_REDIRECT_MS = 8000;

/**
 * Text interview (backend guide 7.4): Start -> question -> answer -> next question, until the
 * interviewer closes or the candidate ends early. Also used when a voice interview falls back
 * to typing.
 * @param {{ interview: any, session?: { progress: any, currentTurn: any, fetchedAt?: number } | null }} props
 */
export function TextInterview({ interview, session = null }) {
  const formId = useId();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const bottomRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const inputRef = useRef(/** @type {HTMLTextAreaElement | null} */ (null));
  const { state, start, submit, retryAnswer, setDraft, dismissError } = useTextInterview(
    interview,
    session,
  );
  const router = useRouter();
  const end = useEndInterview(interview.id);
  // "ended" only comes from the server (answers, or a re-read after a 409), so there is nothing
  // left to end: go straight to the report. POST /end is only for ending early.
  const goToReport = useRef(() => {});
  useEffect(() => {
    goToReport.current = () => router.replace(`/interviews/${interview.id}/report`);
  });

  const { status, currentTurn, history, pending, progress } = state;
  const live = status === 'active' || status === 'submitting';
  const closed = status === 'ended' && !!state.closingMessage;

  // Keep the newest message in view and the cursor in the answer box.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    if (status === 'active') inputRef.current?.focus();
  }, [history.length, currentTurn?.seq, status, pending]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && live && !e.target.closest?.('dialog[open]')) setConfirmEnd(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [live]);

  // The interviewer closed the interview: show its message, then move on to the report.
  useEffect(() => {
    if (!closed) return;
    const t = setTimeout(() => goToReport.current(), CLOSING_REDIRECT_MS);
    return () => clearTimeout(t);
  }, [closed]);

  if (status === 'idle') {
    return (
      <div className="flex min-h-dvh flex-col">
        <RoomHeader interview={interview} />
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
          <StartPanel interview={interview} onStart={start} error={state.error?.message ?? null} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <RoomHeader interview={interview}>
        {live ? (
          <Button variant="danger" size="sm" onClick={() => setConfirmEnd(true)}>
            End interview
          </Button>
        ) : null}
      </RoomHeader>

      {progress && live ? (
        <div className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-3xl items-end gap-4 px-4 py-3 sm:px-6">
            <TopicProgress progress={progress} />
            <InterviewCountdown
              progress={progress}
              syncedAt={state.progressSyncedAt}
              running={live}
            />
          </div>
        </div>
      ) : null}

      <main
        id="main"
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6"
      >
        <ol className="flex flex-col gap-5" aria-label="Interview conversation">
          {history.map((h, i) => (
            <Fragment key={h.seq}>
              <QuestionBubble
                text={h.questionText}
                kind={h.objectiveKind}
                divider={i > 0 && h.isFollowUp === false}
              />
              {h.answerText ? <AnswerBubble text={h.answerText} /> : null}
            </Fragment>
          ))}
          {currentTurn ? (
            <QuestionBubble
              text={currentTurn.questionText}
              kind={currentTurn.objectiveKind}
              divider={history.length > 0 && !currentTurn.isFollowUp}
              highlight={!pending}
            />
          ) : null}
          {pending ? <AnswerBubble text={pending.answerText} sending={!pending.failed} /> : null}
        </ol>

        {/* Screen readers hear each new question once. */}
        <p className="sr-only" aria-live="polite">
          {status === 'active' && currentTurn ? `Interviewer: ${currentTurn.questionText}` : ''}
        </p>

        <div role="status" aria-live="polite" className="text-sm text-fg-muted">
          {status === 'starting' ? (
            <span className="flex items-center gap-2">
              <Spinner /> Interviewer is preparing your{' '}
              {interview.status === 'created' ? 'first ' : ''}question...
            </span>
          ) : status === 'submitting' ? (
            <span className="flex items-center gap-2">
              <Spinner />
              {pending?.attempt
                ? 'The interviewer is taking longer than usual. Retrying...'
                : 'Interviewer is thinking...'}
            </span>
          ) : null}
        </div>

        {state.notice ? (
          <Alert
            tone="info"
            action={
              <Button variant="secondary" size="sm" onClick={dismissError}>
                OK
              </Button>
            }
          >
            {state.notice}
          </Alert>
        ) : null}

        {state.error && status !== 'ended' ? (
          <Alert
            tone="danger"
            action={
              state.error.action === 'answer' ? (
                <Button onClick={retryAnswer}>Retry</Button>
              ) : state.error.action === 'start' ? (
                <Button onClick={start}>Try again</Button>
              ) : null
            }
          >
            {state.error.message}
          </Alert>
        ) : null}

        {status === 'ended' ? (
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
            <p className="leading-relaxed">
              {state.closingMessage ?? 'This interview has ended. Your report is being prepared.'}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => goToReport.current()}>View your report</Button>
              {closed ? (
                <p className="text-sm text-fg-subtle">Taking you there in a few seconds...</p>
              ) : null}
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </main>

      {live ? (
        <footer className="sticky bottom-0 border-t border-border bg-surface/95 backdrop-blur">
          <form
            id={formId}
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-4 sm:px-6"
          >
            <label htmlFor={`${formId}-answer`} className="sr-only">
              Your answer
            </label>
            <Textarea
              ref={inputRef}
              id={`${formId}-answer`}
              rows={4}
              value={state.draft}
              maxLength={ANSWER_MAX_CHARS}
              disabled={status !== 'active' || !!pending?.failed}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={
                status === 'active'
                  ? 'Explain your thinking as you would out loud. Ctrl+Enter to send.'
                  : 'Waiting for the interviewer...'
              }
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-fg-subtle">
                {state.draft.length}/{ANSWER_MAX_CHARS}
              </p>
              <Button
                type="submit"
                loading={status === 'submitting'}
                disabled={status !== 'active' || !state.draft.trim() || !!pending?.failed}
              >
                Send answer
              </Button>
            </div>
          </form>
        </footer>
      ) : null}

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
