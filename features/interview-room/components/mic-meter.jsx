import { cn } from '@/lib/cn';

const BARS = 12;

/**
 * Microphone level as a row of bars.
 * @param {{ level: number, muted?: boolean, className?: string }} props
 */
export function MicMeter({ level, muted = false, className }) {
  const lit = muted ? 0 : Math.round(level * BARS);
  return (
    <div
      role="meter"
      aria-label="Microphone level"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={muted ? 0 : Math.round(level * 100)}
      className={cn('flex h-6 items-end gap-0.5', className)}
    >
      {Array.from({ length: BARS }, (_, i) => (
        <span
          key={i}
          className={cn(
            'w-1.5 rounded-sm transition-colors duration-75',
            i < lit ? (i >= BARS - 2 ? 'bg-warning' : 'bg-success') : 'bg-border',
          )}
          style={{ height: `${30 + (i / (BARS - 1)) * 70}%` }}
        />
      ))}
    </div>
  );
}
