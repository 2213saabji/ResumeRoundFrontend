'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FullPageSpinner } from '@/components/ui/full-page-spinner';
import { labelFor } from '@/contracts/enums';
import { progressApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import { progressKeys } from '@/lib/api/query-keys';
import { cn } from '@/lib/cn';
import { Delta, TrendPanel } from './trend-panel';

const titleCase = (s) => s.replace(/\b\w/g, (m) => m.toUpperCase());

/**
 * A list of trends (dimensions or skills), weakest first, with the selected one charted.
 * @param {{ title: string, description: string, items: Array<{ key: string, label: string, latest: number, points: any[] }> }} props
 */
function TrendPicker({ title, description, items }) {
  const [selected, setSelected] = useState(/** @type {string | null} */ (null));
  const sorted = [...items].sort((a, b) => a.latest - b.latest);
  const current = sorted.find((i) => i.key === selected) ?? sorted[0];

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-fg-muted">{description}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <Card className="p-2 sm:p-2">
          <ul aria-label={title} className="flex max-h-112 flex-col overflow-y-auto">
            {sorted.map((item) => {
              const active = item.key === current.key;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelected(item.key)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm',
                      active ? 'bg-accent-soft' : 'hover:bg-surface-2',
                    )}
                  >
                    <span className="truncate font-medium">{item.label}</span>
                    <span className="flex items-baseline gap-2 tabular-nums">
                      <Delta points={item.points} />
                      {item.latest.toFixed(1)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card>
          <TrendPanel
            key={current.key}
            label={current.label}
            heading={<h3 className="font-semibold">{current.label}</h3>}
            points={current.points}
          />
        </Card>
      </div>
    </section>
  );
}

/** /progress: overall score, dimension and skill trends across interviews (points oldest first). */
export function ProgressPage() {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: progressKeys.all,
    queryFn: progressApi.get,
    staleTime: 60_000,
  });

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

  const overall = data.overall ?? [];
  const dimensions = (data.dimensions ?? []).map((d) => ({
    key: d.dimension,
    label: labelFor('dimension', d.dimension),
    latest: d.latest,
    points: d.points,
  }));
  const skills = (data.skills ?? []).map((s) => ({
    key: s.skill,
    label: titleCase(s.skill),
    latest: s.latest,
    points: s.points,
  }));

  if (overall.length === 0 && dimensions.length === 0 && skills.length === 0) {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader
          title="Your progress"
          description="Complete an interview to see your progress. Each new interview focuses more on the areas you scored lowest in."
        />
        <Link href="/interviews/new" className={buttonClasses({ size: 'lg' })}>
          Start an interview
        </Link>
      </div>
    );
  }

  const latestOverall = overall[overall.length - 1];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Your progress"
        description="Scores from every interview with a report. Lists show the weakest first."
      />

      {latestOverall ? (
        <Card>
          <TrendPanel
            label="Overall"
            points={overall}
            heading={
              <div>
                <h2 className="font-semibold">Overall score</h2>
                <p className="flex items-baseline gap-2 text-3xl font-semibold tracking-tight tabular-nums">
                  {latestOverall.score.toFixed(1)}
                  <span className="text-base font-normal text-fg-subtle">/ 10</span>
                  <Delta points={overall} />
                </p>
              </div>
            }
          />
        </Card>
      ) : null}

      {dimensions.length ? (
        <TrendPicker
          title="Dimensions"
          description="How you score on each part of the rubric. Pick one to see its trend."
          items={dimensions}
        />
      ) : null}

      {skills.length ? (
        <TrendPicker
          title="Skills"
          description="Latest score per technology. Pick one to see its trend."
          items={skills}
        />
      ) : null}
    </div>
  );
}
