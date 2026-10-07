'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useCssVars } from '@/lib/use-css-vars';

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm shadow-md">
      <p className="text-fg-muted">
        {new Date(p.at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
      </p>
      <p className="font-medium text-fg tabular-nums">{p.score.toFixed(1)} / 10</p>
    </div>
  );
}

/**
 * One skill's score over time: a single series on a fixed 0-10 axis, so trends are comparable
 * between skills. The skill name is the chart title; no legend is needed for one series.
 * @param {{ points: Array<{ score: number, at: string }>, skill: string }} props
 */
export default function SkillTrendChart({ points, skill }) {
  const c = useCssVars([
    '--chart-1',
    '--chart-grid',
    '--fg-subtle',
    '--surface',
    '--border-strong',
  ]);
  const data = points.map((p, i) => ({ ...p, i, label: fmtDate(p.at) }));

  return (
    <div
      className="h-64 w-full"
      role="img"
      aria-label={`${skill} score over ${points.length} interviews`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: -16 }}>
          <CartesianGrid vertical={false} stroke={c['--chart-grid']} />
          <XAxis
            dataKey="i"
            tickFormatter={(i) => data[i]?.label ?? ''}
            tick={{ fill: c['--fg-subtle'], fontSize: 12 }}
            axisLine={{ stroke: c['--chart-grid'] }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 10]}
            ticks={[0, 2, 4, 6, 8, 10]}
            tick={{ fill: c['--fg-subtle'], fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<TrendTooltip />}
            cursor={{ stroke: c['--border-strong'], strokeWidth: 1 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke={c['--chart-1']}
            strokeWidth={2}
            dot={{ r: 4, fill: c['--chart-1'], stroke: c['--surface'], strokeWidth: 2 }}
            activeDot={{ r: 6, fill: c['--chart-1'], stroke: c['--surface'], strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
