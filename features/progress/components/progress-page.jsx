'use client';

import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FullPageSpinner } from '@/components/ui/full-page-spinner';
import { progressApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import { progressKeys } from '@/lib/api/query-keys';
import { cn } from '@/lib/cn';

// Recharts only loads on this page, in the browser.
const SkillTrendChart = dynamic(() => import('./skill-trend-chart'), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-lg bg-surface-2" />,
});

const titleCase = (s) => s.replace(/\b\w/g, (m) => m.toUpperCase());

function delta(points) {
  if (points.length < 2) return null;
  return points[points.length - 1].score - points[points.length - 2].score;
}

/** /progress: skill scores across interviews, weakest first. */
export function ProgressPage() {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: progressKeys.all,
    queryFn: progressApi.get,
    staleTime: 60_000,
  });
  const [selected, setSelected] = useState(/** @type {string | null} */ (null));
  const [showTable, setShowTable] = useState(false);

  if (isPending) return <FullPageSpinner label="Loading progress" />;
  if (error) {
    return (
      <Alert
        tone="danger"
        title="Could not load your progress"
        action={
          <Button variant="secondary" onClick={() => refetch()}>
            Try again
          </Button>
        }
      >
        {errorMessage(error)}
      </Alert>
    );
  }

  const skills = [...data.skills].sort((a, b) => a.latest - b.latest);

  if (skills.length === 0) {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader
          title="Your progress"
          description="Skill scores appear here after your first scored interview. Each new interview focuses more on the areas you scored lowest in."
        />
        <Link href="/interviews/new" className={buttonClasses({ size: 'lg' })}>
          Start an interview
        </Link>
      </div>
    );
  }

  const current = skills.find((s) => s.skill === selected) ?? skills[0];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Your progress"
        description="Latest score per skill, weakest first. Pick a skill to see its trend across interviews."
      />
      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <Card className="p-2 sm:p-2">
          <ul aria-label="Skills" className="flex max-h-[28rem] flex-col overflow-y-auto">
            {skills.map((s) => {
              const d = delta(s.points);
              const active = s.skill === current.skill;
              return (
                <li key={s.skill}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelected(s.skill)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm',
                      active ? 'bg-accent-soft' : 'hover:bg-surface-2',
                    )}
                  >
                    <span className="truncate font-medium">{titleCase(s.skill)}</span>
                    <span className="flex items-baseline gap-2 tabular-nums">
                      {d != null && d !== 0 ? (
                        <span className={cn('text-xs', d > 0 ? 'text-success' : 'text-danger')}>
                          {d > 0 ? '▲' : '▼'} {Math.abs(d).toFixed(1)}
                          <span className="sr-only">
                            {d > 0 ? ' up' : ' down'} since last interview
                          </span>
                        </span>
                      ) : null}
                      {s.latest.toFixed(1)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">{titleCase(current.skill)}</h2>
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              className="text-sm font-medium text-accent hover:underline"
            >
              {showTable ? 'Show chart' : 'Show as table'}
            </button>
          </div>
          {showTable ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-fg-muted">
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 text-right font-medium">Score</th>
                  <th className="py-2 text-right font-medium">Report</th>
                </tr>
              </thead>
              <tbody>
                {current.points.map((p) => (
                  <tr
                    key={`${p.interviewId}-${p.at}`}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-2">
                      {new Date(p.at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </td>
                    <td className="py-2 text-right tabular-nums">{p.score.toFixed(1)}</td>
                    <td className="py-2 text-right">
                      <Link
                        href={`/interviews/${p.interviewId}/report`}
                        className="text-accent hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : current.points.length < 2 ? (
            <p className="text-sm text-fg-muted">
              Scored {current.latest.toFixed(1)} / 10 in one interview so far. The trend appears
              after your next one.
            </p>
          ) : (
            <SkillTrendChart points={current.points} skill={titleCase(current.skill)} />
          )}
        </Card>
      </div>
    </div>
  );
}
