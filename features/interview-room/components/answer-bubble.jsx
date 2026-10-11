import { cn } from '@/lib/cn';

/**
 * The candidate's answer. `sending` dims it while the request is in flight.
 * @param {{ text: string, sending?: boolean }} props
 */
export function AnswerBubble({ text, sending = false }) {
  return (
    <li
      className={cn(
        'ml-auto max-w-[90%] rounded-xl rounded-tr-sm border border-border bg-surface px-4 py-3',
        sending && 'opacity-70',
      )}
    >
      <p className="mb-1 text-xs font-medium text-success">You</p>
      <p className="leading-relaxed whitespace-pre-wrap">{text}</p>
    </li>
  );
}
