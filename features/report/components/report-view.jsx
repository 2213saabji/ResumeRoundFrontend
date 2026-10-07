'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { ReportTranscript } from './report-transcript';
import { ScoreBars } from './score-bars';

function List({ items, empty }) {
  if (!items?.length) return <p className="text-sm text-fg-muted">{empty}</p>;
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed">
      {items.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ul>
  );
}

/** A ready report: overall score, dimension scores, strengths/weaknesses, roadmap, transcript. */
export function ReportView({ report, interviewId }) {
  const [tab, setTab] = useState('overview');

  const overview = (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-[14rem_1fr]">
        <Card className="flex flex-col items-start justify-center gap-1">
          <p className="text-sm font-medium text-fg-muted">Overall</p>
          <p className="text-5xl font-semibold tracking-tight tabular-nums">
            {report.overall.toFixed(1)}
            <span className="text-xl font-normal text-fg-subtle"> / 10</span>
          </p>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Scores by dimension</h2>
          <ScoreBars scores={report.dimensionScores} />
        </Card>
      </div>

      {report.feedback ? (
        <Card>
          <h2 className="mb-2 font-semibold">Interviewer feedback</h2>
          <p className="leading-relaxed whitespace-pre-wrap text-fg-muted">{report.feedback}</p>
        </Card>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold text-success">Strengths</h2>
          <List items={report.strengths} empty="None recorded." />
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold text-danger">To improve</h2>
          <List items={report.weaknesses} empty="None recorded." />
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 font-semibold">What to study next</h2>
        {report.recommendations?.length ? (
          <ol className="flex flex-col gap-5">
            {report.recommendations.map((r, i) => (
              <li key={`${r.topic}-${i}`} className="flex flex-col gap-1.5">
                <p className="font-medium">
                  {i + 1}. {r.topic}
                </p>
                <p className="text-sm text-fg-muted">{r.reason}</p>
                {r.resources?.length ? (
                  <ul className="flex flex-col gap-1 text-sm">
                    {r.resources.map((res) => (
                      <li key={res.url}>
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-accent hover:underline"
                        >
                          {res.title}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-fg-muted">No recommendations for this interview.</p>
        )}
      </Card>
    </div>
  );

  return (
    <Tabs
      label="Report sections"
      value={tab}
      onChange={setTab}
      tabs={[
        { value: 'overview', label: 'Overview', content: overview },
        {
          value: 'transcript',
          label: 'Transcript',
          content: <ReportTranscript interviewId={interviewId} />,
        },
      ]}
    />
  );
}
