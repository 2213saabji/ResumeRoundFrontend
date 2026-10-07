import { labelFor } from '@/contracts/enums';

/** The interview plan as an agenda: what will be covered and roughly for how long. */
export function Agenda({ plan }) {
  if (!plan?.length) return null;
  return (
    <ol className="flex flex-col gap-2">
      {plan.map((item, i) => (
        <li key={`${item.kind}-${i}`} className="flex items-start gap-3 text-sm">
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-medium text-fg-muted">
            {i + 1}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium">
              {labelFor('planKind', item.kind)}
              {item.isCoreDeepDive ? (
                <span className="ml-2 text-xs font-normal text-accent">core deep dive</span>
              ) : null}
            </span>
            <span className="truncate text-fg-muted">{item.topic}</span>
          </span>
          <span className="shrink-0 text-xs text-fg-subtle">
            ~{Math.max(1, Math.round(item.timeBudgetSec / 60))} min
          </span>
        </li>
      ))}
    </ol>
  );
}
