'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';

// Recharts only loads on the progress page, in the browser.
const TrendChart = dynamic(() => import('./trend-chart'), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-lg bg-surface-2" />,
});

/** Change since the previous interview, or null with fewer than two points. */
export function delta(points) {
  if (points.length < 2) return null;
  return points[points.length - 1].score - points[points.length - 2].score;
}

/** "▲ 0.4" / "▼ 1.2" next to a score; nothing when unchanged or unknown. */
export function Delta({ points }) {
  const d = delta(points);
  if (d == null || d === 0) return null;
  return (
    <span className={d > 0 ? 'text-xs text-success' : 'text-xs text-danger'}>
      {d > 0 ? '▲' : '▼'} {Math.abs(d).toFixed(1)}
      <span className="sr-only">{d > 0 ? ' up' : ' down'} since last interview</span>
    </span>
  );
}

/**
 * One trend (points oldest first) as a chart, with a table view for screen readers and exact
 * values. A single point gets a sentence instead of a one-dot chart.
 * @param {{ label: string, heading?: React.ReactNode, points: Array<{ score: number, at: string, interviewId: string }> }} props
 */
export function TrendPanel({ label, heading, points }) {
  const [showTable, setShowTable] = useState(false);
  const latest = points[points.length - 1];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {heading ?? <h2 className="font-semibold">{label}</h2>}
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
            {points.map((p) => (
              <tr key={`${p.interviewId}-${p.at}`} className="border-b border-border last:border-0">
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
      ) : points.length < 2 ? (
        <p className="text-sm text-fg-muted">
          Scored {latest.score.toFixed(1)} / 10 in one interview so far. The trend appears after
          your next one.
        </p>
      ) : (
        <TrendChart points={points} label={label} />
      )}
    </div>
  );
}
