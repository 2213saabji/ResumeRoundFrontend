import { cn } from '@/lib/cn';
import { fieldClasses } from './field-classes';

/**
 * Native select: accessible and keyboard friendly with no extra JS.
 * @param {React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean, ref?: React.Ref<HTMLSelectElement> }} props
 */
export function Select({ invalid, className, children, ...rest }) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(fieldClasses({ invalid }), 'h-10 pr-8', className)}
      {...rest}
    >
      {children}
    </select>
  );
}
