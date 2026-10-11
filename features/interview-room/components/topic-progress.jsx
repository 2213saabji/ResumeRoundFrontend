import { labelFor } from '@/contracts/enums';
import { cn } from '@/lib/cn';

/**
 * "Topic 2 of 6: Project deep dive" with one segment per plan objective.
 * @param {{ progress: { objectiveIdx: number, objectiveCount: number, objectiveKind: string } }} props
 */
export function TopicProgress({ progress }) {
  const { objectiveIdx, objectiveCount, objectiveKind } = progress;
  const current = Math.min(objectiveIdx + 1, objectiveCount);
  const text = `Topic ${current} of ${objectiveCount}: ${labelFor('planKind', objectiveKind)}`;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <p className="truncate text-sm font-medium">{text}</p>
      <div
        role="progressbar"
        aria-label="Interview topics"
        aria-valuemin={1}
        aria-valuemax={objectiveCount}
        aria-valuenow={current}
        aria-valuetext={text}
        className="flex gap-1"
      >
        {Array.from({ length: objectiveCount }, (_, i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full',
              i < objectiveIdx ? 'bg-accent' : i === objectiveIdx ? 'bg-accent/50' : 'bg-surface-2',
            )}
          />
        ))}
      </div>
    </div>
  );
}
