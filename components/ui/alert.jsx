import { cn } from '@/lib/cn';

const TONES = {
  info: 'border-accent/30 bg-accent-soft text-fg',
  success: 'border-success/30 bg-success-soft text-fg',
  warning: 'border-warning/30 bg-warning-soft text-fg',
  danger: 'border-danger/30 bg-danger-soft text-fg',
};

/**
 * Inline message. Danger alerts are announced immediately (role="alert"); others politely.
 * @param {{ tone?: keyof TONES, title?: React.ReactNode, children?: React.ReactNode, action?: React.ReactNode, className?: string }} props
 */
export function Alert({ tone = 'info', title, children, action, className }) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex flex-col gap-3 rounded-lg border p-4 text-sm sm:flex-row sm:items-start sm:justify-between',
        TONES[tone],
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-fg-muted">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
