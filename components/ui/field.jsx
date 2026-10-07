import { cloneElement, isValidElement, useId } from 'react';
import { cn } from '@/lib/cn';

/**
 * Label + control + hint + error, with ids wired for screen readers.
 * The single child control receives id, aria-describedby and invalid.
 * @param {{ label: React.ReactNode, hint?: React.ReactNode, error?: string, className?: string, children: React.ReactElement, optional?: boolean }} props
 */
export function Field({ label, hint, error, className, children, optional }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: children.props.id ?? id,
        'aria-describedby': describedBy,
        invalid: !!error,
      })
    : children;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={children?.props?.id ?? id} className="text-sm font-medium text-fg">
        {label}
        {optional ? <span className="ml-1 font-normal text-fg-subtle">(optional)</span> : null}
      </label>
      {control}
      {hint ? (
        <p id={hintId} className="text-xs text-fg-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
