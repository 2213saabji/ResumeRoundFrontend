import { cn } from '@/lib/cn';

/**
 * Determinate progress bar (value 0-1). Omit `value` for an indeterminate bar.
 * @param {{ value?: number | null, label: string, className?: string, tone?: 'accent' | 'success' | 'warning' | 'danger' }} props
 */
export function Progress({ value, label, className, tone = 'accent' }) {
  const determinate = typeof value === 'number';
  const pct = determinate ? Math.round(Math.min(1, Math.max(0, value)) * 100) : null;
  const bar = {
    accent: 'bg-accent',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
  }[tone];

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={determinate ? 0 : undefined}
      aria-valuemax={determinate ? 100 : undefined}
      aria-valuenow={pct ?? undefined}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-2', className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-300',
          bar,
          !determinate && 'w-1/3 animate-pulse',
        )}
        style={determinate ? { width: `${pct}%` } : undefined}
      />
    </div>
  );
}
