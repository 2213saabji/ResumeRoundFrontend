import { cn } from '@/lib/cn';

const FIELD_BASE =
  'w-full rounded-md border bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle transition-colors focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:opacity-60';

/** Shared look for Input, Textarea and Select. @param {{ invalid?: boolean }} opts */
export function fieldClasses({ invalid }) {
  return cn(FIELD_BASE, invalid ? 'border-danger' : 'border-border-strong');
}
