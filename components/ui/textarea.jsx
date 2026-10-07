import { cn } from '@/lib/cn';
import { fieldClasses } from './field-classes';

/**
 * @param {React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean, ref?: React.Ref<HTMLTextAreaElement> }} props
 */
export function Textarea({ invalid, className, rows = 4, ...rest }) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(fieldClasses({ invalid }), 'py-2 leading-relaxed', className)}
      {...rest}
    />
  );
}
