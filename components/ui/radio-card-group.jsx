import { useId } from 'react';
import { cn } from '@/lib/cn';

/**
 * A group of native radio inputs rendered as selectable cards, keeping native keyboard
 * behaviour (arrow keys). Two ways to use it:
 *  - React Hook Form: `inputProps={register('field')}` plus `value={watch('field')}` for styling
 *  - Controlled: `value` + `onValueChange`
 *
 * @param {{
 *   legend: React.ReactNode,
 *   options: Array<{ value: string | number, label: React.ReactNode, description?: React.ReactNode }>,
 *   inputProps?: Record<string, any>,
 *   value?: string | number,
 *   onValueChange?: (value: string) => void,
 *   error?: string,
 *   columns?: 2 | 3 | 4,
 *   className?: string,
 * }} props
 */
export function RadioCardGroup({
  legend,
  options,
  inputProps,
  value,
  onValueChange,
  error,
  columns = 2,
  className,
}) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  const grid = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }[
    columns
  ];
  const controlled = typeof onValueChange === 'function';

  return (
    <fieldset className={cn('flex flex-col gap-2', className)} aria-describedby={errorId}>
      <legend className="mb-2 text-sm font-medium text-fg">{legend}</legend>
      <div className={cn('grid grid-cols-1 gap-2', grid)}>
        {options.map((opt) => {
          const optId = `${id}-${opt.value}`;
          const checked = value !== undefined && String(value) === String(opt.value);
          return (
            <label
              key={opt.value}
              htmlFor={optId}
              className={cn(
                'relative flex cursor-pointer flex-col gap-0.5 rounded-lg border bg-surface p-3 transition-colors',
                'has-focus-visible:ring-2 has-focus-visible:ring-ring',
                checked
                  ? 'border-accent bg-accent-soft'
                  : 'border-border hover:border-border-strong',
              )}
            >
              <input
                id={optId}
                type="radio"
                value={opt.value}
                className="sr-only"
                {...(controlled
                  ? { name: id, checked, onChange: (e) => onValueChange(e.target.value) }
                  : inputProps)}
              />
              <span className="text-sm font-medium text-fg">{opt.label}</span>
              {opt.description ? (
                <span className="text-xs text-fg-muted">{opt.description}</span>
              ) : null}
            </label>
          );
        })}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
