import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Agenda } from './agenda';

/**
 * Before the first question: agenda and a Start button.
 * @param {{ interview: any, onStart: () => void, error: string | null }} props
 */
export function StartPanel({ interview, onStart, error }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <Card className="flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ready when you are</h1>
          <p className="mt-1 text-fg-muted">
            The interviewer asks one question at a time, starting from your own projects, and
            follows up on what you write. Answer the way you would out loud: explain your thinking,
            trade-offs and what you would check first.
          </p>
        </div>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-fg-muted">
          <li>
            About {Math.round(interview.durationSec / 60)} minutes; the clock starts when you press
            Start.
          </li>
          <li>Scores are not shown during the interview. You get a full report at the end.</li>
          <li>You can end early at any time; the report covers what you answered.</li>
        </ul>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <div className="border-t border-border pt-5">
          <Button size="lg" onClick={onStart}>
            Start interview
          </Button>
        </div>
      </Card>
      <Card as="aside" className="flex flex-col gap-4">
        <h2 className="font-semibold">Agenda</h2>
        <Agenda plan={interview.plan} />
      </Card>
    </div>
  );
}
