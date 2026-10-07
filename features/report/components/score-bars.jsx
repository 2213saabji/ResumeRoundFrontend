import { SCORE_DIMENSIONS, labelFor } from '@/contracts/enums';

/**
 * Dimension scores (0-10) as horizontal bars: one hue, magnitude only, value printed as text.
 * Plain HTML, so it costs no chart library and reads well in a screen reader as a list.
 * @param {{ scores: Record<string, number> }} props
 */
export function ScoreBars({ scores }) {
  const keys = [
    ...SCORE_DIMENSIONS.filter((d) => d in scores),
    ...Object.keys(scores).filter((d) => !SCORE_DIMENSIONS.includes(/** @type {any} */ (d))),
  ];

  return (
    <ul className="flex flex-col gap-4">
      {keys.map((dim) => {
        const value = scores[dim];
        const pct = Math.max(0, Math.min(10, value)) * 10;
        return (
          <li key={dim} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{labelFor('dimension', dim)}</span>
              <span className="text-fg-muted tabular-nums">
                {value.toFixed(1)}
                <span className="text-fg-subtle"> / 10</span>
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-chart-grid" aria-hidden="true">
              <div className="h-full rounded-full bg-chart-1" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
