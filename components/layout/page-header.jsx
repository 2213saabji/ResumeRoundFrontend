import { cn } from '@/lib/cn';

/**
 * @param {{ title: React.ReactNode, description?: React.ReactNode, actions?: React.ReactNode, eyebrow?: React.ReactNode, className?: string }} props
 */
export function PageHeader({ title, description, actions, eyebrow, className }) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="flex flex-col gap-1.5">
        {eyebrow ? <p className="text-sm font-medium text-accent">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{title}</h1>
        {description ? <p className="max-w-2xl text-pretty text-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
