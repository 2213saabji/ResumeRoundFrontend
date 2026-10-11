'use client';

import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { labelFor } from '@/contracts/enums';
import { FullPageSpinner } from '@/components/ui/full-page-spinner';
import { interviewsApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import { interviewKeys } from '@/lib/api/query-keys';

/** Evidence quotes, if the evaluation carries them (strings or { quote } objects). */
function evidenceOf(turn) {
  const ev = turn.evaluation?.evidence;
  if (!Array.isArray(ev)) return [];
  return ev.map((e) => (typeof e === 'string' ? e : (e?.quote ?? e?.text))).filter(Boolean);
}

const strings = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);

/** Only the dimensions this answer was scored on (a missing one is not a 0). */
function dimensionScoresOf(turn) {
  const d = turn.evaluation?.dimensionScores;
  if (!d || typeof d !== 'object') return [];
  return Object.entries(d).filter(([, v]) => typeof v === 'number');
}

/** Question-by-question breakdown (evaluations are filled in once the interview ends); each turn has an anchor (#turn-<seq>) that report evidence can link to. */
export function ReportTranscript({ interviewId }) {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: interviewKeys.turns(interviewId),
    queryFn: () => interviewsApi.allTurns(interviewId),
    staleTime: 60_000,
  });

  if (isPending) return <FullPageSpinner label="Loading transcript" />;
  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-fg-muted">{errorMessage(error)}</p>
        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  if (data.length === 0)
    return <p className="text-sm text-fg-muted">No questions were answered in this interview.</p>;

  return (
    <ol className="flex flex-col gap-6">
      {data.map((t) => {
        const evidence = evidenceOf(t);
        const missed = strings(t.evaluation?.missedConcepts);
        const covered = strings(t.evaluation?.coveredConcepts);
        const overall = t.evaluation?.overall;
        const dims = dimensionScoresOf(t);
        return (
          <li
            key={t.seq}
            id={`turn-${t.seq}`}
            className="flex scroll-mt-20 flex-col gap-2 border-b border-border pb-6 last:border-0"
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs font-medium text-fg-subtle">Question {t.seq}</p>
              {typeof overall === 'number' ? (
                <p className="text-sm font-medium tabular-nums">
                  {overall.toFixed(1)}
                  <span className="font-normal text-fg-subtle"> / 10</span>
                </p>
              ) : null}
            </div>
            <p className="font-medium">{t.questionText}</p>
            <p className="leading-relaxed whitespace-pre-wrap text-fg-muted">
              {t.answerText || <span className="italic">No answer</span>}
            </p>
            {evidence.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-fg-subtle">Evidence used in scoring</p>
                {evidence.map((q, i) => (
                  <blockquote key={i} className="border-l-2 border-accent pl-3 text-sm italic">
                    {q}
                  </blockquote>
                ))}
              </div>
            ) : null}
            {dims.length > 0 ? (
              <ul className="flex flex-wrap gap-2 text-xs" aria-label="Scores for this answer">
                {dims.map(([dim, v]) => (
                  <li key={dim} className="rounded-full bg-surface-2 px-2.5 py-1">
                    {labelFor('dimension', dim)}{' '}
                    <span className="font-medium tabular-nums">{v.toFixed(1)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {covered.length > 0 ? (
              <p className="text-sm">
                <span className="font-medium">Covered: </span>
                <span className="text-fg-muted">{covered.join(', ')}</span>
              </p>
            ) : null}
            {missed.length > 0 ? (
              <p className="text-sm">
                <span className="font-medium">Missed: </span>
                <span className="text-fg-muted">{missed.join(', ')}</span>
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
