import { labelFor } from '@/contracts/enums';
import { cn } from '@/lib/cn';

/**
 * An interviewer question; `divider` marks the start of a new plan topic (isFollowUp false).
 * @param {{ text: string, kind?: string, divider?: boolean, highlight?: boolean }} props
 */
export function QuestionBubble({ text, kind, divider = false, highlight = false }) {
  return (
    <>
      {divider ? (
        <li className="flex items-center gap-3 text-xs font-medium text-fg-subtle">
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
          New topic: {labelFor('planKind', kind)}
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
        </li>
      ) : null}
      <li
        className={cn(
          'max-w-[90%] rounded-xl rounded-tl-sm bg-surface-2 px-4 py-3',
          highlight && 'ring-2 ring-accent/40',
        )}
      >
        <p className="mb-1 text-xs font-medium text-accent">Interviewer</p>
        <p className="leading-relaxed whitespace-pre-wrap">{text}</p>
      </li>
    </>
  );
}
