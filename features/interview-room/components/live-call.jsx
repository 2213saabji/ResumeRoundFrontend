'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useCallStore } from '../store';
import { CallControls } from './call-controls';
import { CallTimer } from './call-timer';
import { Captions } from './captions';
import { MicMeter } from './mic-meter';
import { ReconnectBanner } from './reconnect-banner';
import { RoomHeader } from './room-header';
import { TextAnswer } from './text-answer';
import { TurnIndicator } from './turn-indicator';

/**
 * The call itself: one question on screen, live captions, controls.
 * @param {{
 *   interview: any,
 *   level: number,
 *   onToggleMute: () => void,
 *   onPttDown: () => void,
 *   onPttUp: () => void,
 *   onRequestEnd: () => void,
 *   onRetry: () => void,
 *   onUseText: () => void,
 * }} props
 */
export function LiveCall({
  interview,
  level,
  onToggleMute,
  onPttDown,
  onPttUp,
  onRequestEnd,
  onRetry,
  onUseText,
}) {
  const muted = useCallStore((s) => s.muted);
  const inputMode = useCallStore((s) => s.inputMode);
  const pttPressed = useCallStore((s) => s.pttPressed);
  const startedAt = useCallStore((s) => s.startedAt);
  const fatalError = useCallStore((s) => s.fatalError);
  const turnState = useCallStore((s) => s.turnState);

  return (
    <div className="flex min-h-dvh flex-col">
      <RoomHeader interview={interview}>
        <CallTimer startedAt={startedAt} durationSec={interview.durationSec} />
      </RoomHeader>

      <main
        id="main"
        className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TurnIndicator />
          {inputMode === 'ptt' && turnState === 'listening' && !pttPressed ? (
            <p className="text-sm text-fg-muted">Hold Space to answer</p>
          ) : null}
        </div>

        <ReconnectBanner />

        {fatalError ? (
          <Alert
            tone="danger"
            title={fatalError.title}
            action={
              <div className="flex flex-wrap gap-2">
                {fatalError.canRetry ? <Button onClick={onRetry}>Try again</Button> : null}
                <Button variant="secondary" onClick={onUseText}>
                  Continue by typing
                </Button>
              </div>
            }
          >
            {fatalError.message}
          </Alert>
        ) : (
          <>
            <Captions />
            <TextAnswer interviewId={interview.id} />
          </>
        )}
      </main>

      <footer className="sticky bottom-0 border-t border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 px-4 py-4 sm:flex-row sm:justify-between sm:px-6">
          <div className="flex items-center gap-2 text-sm text-fg-muted">
            <MicMeter level={level} muted={muted} />
            <span>
              {muted
                ? 'Muted'
                : inputMode === 'ptt'
                  ? pttPressed
                    ? 'Mic on'
                    : 'Mic off until you hold Space'
                  : 'Mic on'}
            </span>
          </div>
          <CallControls
            muted={muted}
            onToggleMute={onToggleMute}
            inputMode={inputMode}
            pttPressed={pttPressed}
            onPttDown={onPttDown}
            onPttUp={onPttUp}
            onEnd={onRequestEnd}
            disabled={!!fatalError}
          />
        </div>
      </footer>
    </div>
  );
}
