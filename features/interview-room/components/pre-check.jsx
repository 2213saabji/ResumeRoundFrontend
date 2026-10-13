'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { RadioCardGroup } from '@/components/ui/radio-card-group';
import { Select } from '@/components/ui/select';
import { Agenda } from './agenda';
import { MicMeter } from './mic-meter';

const INPUT_MODES = [
  { value: 'vad', label: 'Automatic', description: 'Just talk; a pause ends your turn' },
  {
    value: 'ptt',
    label: 'Push to talk',
    description: 'Hold Space (or the button) while you speak',
  },
];

/**
 * Before the call: browser support, microphone permission, device choice, level check.
 * @param {{
 *   interview: any,
 *   mic: ReturnType<typeof import('../hooks/use-microphone').useMicrophone>,
 *   level: number,
 *   supported: boolean,
 *   inputMode: 'vad' | 'ptt',
 *   onInputModeChange: ((m: 'vad' | 'ptt') => void) | null,
 *   onJoin: () => void,
 *   onUseText: () => void,
 * }} props
 */
export function PreCheck({
  interview,
  mic,
  level,
  supported,
  inputMode,
  onInputModeChange,
  onJoin,
  onUseText,
}) {
  const hasMic = !!mic.stream;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <Card className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Before we start</h1>
          <p className="mt-1 text-fg-muted">
            The interview is in English. Use headphones if you can, so your microphone does not pick
            up the interviewer, and find a quiet spot. Captions stay on for the whole call.
          </p>
        </div>

        {!supported ? (
          <Alert
            tone="warning"
            title="This browser cannot make voice calls"
            action={<Button onClick={onUseText}>Continue by typing</Button>}
          >
            Try the latest Chrome, Edge, Firefox or Safari, or do this interview in text mode.
          </Alert>
        ) : (
          <>
            <section aria-labelledby="mic-heading" className="flex flex-col gap-4">
              <h2 id="mic-heading" className="font-semibold">
                Microphone
              </h2>
              {mic.error ? <Alert tone="danger">{mic.error}</Alert> : null}
              {!hasMic ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={() => mic.start()} loading={mic.requesting}>
                    Allow microphone
                  </Button>
                  <p className="text-sm text-fg-muted">Your browser will ask for permission.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <Field label="Input device" className="flex-1">
                    <Select
                      value={mic.deviceId ?? ''}
                      onChange={(e) => mic.start(e.target.value || null)}
                      disabled={mic.requesting}
                    >
                      {mic.devices.map((d, i) => (
                        <option key={d.deviceId || i} value={d.deviceId}>
                          {d.label || `Microphone ${i + 1}`}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">Level</span>
                    <MicMeter level={level} className="h-10" />
                  </div>
                </div>
              )}
              {hasMic ? (
                <p className="text-sm text-fg-muted">
                  Say something: the bars should move while you speak.
                </p>
              ) : null}
            </section>

            {/* null until the bot supports push-to-talk (VOICE_FEATURES) */}
            {onInputModeChange ? (
              <RadioCardGroup
                legend="How do you want to end your turn?"
                options={INPUT_MODES}
                value={inputMode}
                onValueChange={(v) => onInputModeChange(/** @type {'vad' | 'ptt'} */ (v))}
              />
            ) : (
              <Alert tone="info" title="How turns work">
                A pause of about a second ends your answer, and the interviewer replies a few
                seconds later. It cannot be interrupted while it speaks. Take your time. If you need
                to think, say &ldquo;let me think&rdquo; first.
              </Alert>
            )}
          </>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onUseText}
            className="text-sm font-medium text-accent hover:underline"
          >
            Type instead of talking
          </button>
          <Button size="lg" onClick={onJoin} disabled={!supported || !hasMic}>
            {interview.status === 'in_progress' ? 'Rejoin call' : 'Join interview'}
          </Button>
        </div>
      </Card>

      <Card as="aside" className="flex flex-col gap-4">
        <div>
          <h2 className="font-semibold">Agenda</h2>
          <p className="text-sm text-fg-muted">
            About {Math.round(interview.durationSec / 60)} minutes. The interviewer may reorder
            topics based on your answers.
          </p>
        </div>
        <Agenda plan={interview.plan} />
      </Card>
    </div>
  );
}
