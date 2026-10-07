import { cn } from '@/lib/cn';
import { fieldClasses } from './field-classes';

/**
 * @param {React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean, ref?: React.Ref<HTMLInputElement> }} props
 */
export function Input({ invalid, className, ...rest }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(fieldClasses({ invalid }), 'h-10', className)}
      {...rest}
    />
  );
}
