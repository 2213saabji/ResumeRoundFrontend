import { cn } from '@/lib/cn';

/** @param {React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }} props */
export function Card({ as: Tag = 'section', className, ...rest }) {
  return (
    <Tag
      className={cn('rounded-xl border border-border bg-surface p-5 sm:p-6', className)}
      {...rest}
    />
  );
}
