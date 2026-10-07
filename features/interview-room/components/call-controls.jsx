'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

function MicIcon({ off }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
      {off ? <path d="M4 4l16 16" strokeLinecap="round" /> : null}
    </svg>
  );
}

/**
 * Mute, push-to-talk and end. Keyboard: M mutes, hold Space to talk, Esc ends.
 * @param {{
 *   muted: boolean,
 *   onToggleMute: () => void,
 *   inputMode: 'vad' | 'ptt',
 *   pttPressed: boolean,
 *   onPttDown: () => void,
 *   onPttUp: () => void,
 *   onEnd: () => void,
 *   disabled?: boolean,
 * }} props
 */
export function CallControls({
  muted,
  onToggleMute,
  inputMode,
  pttPressed,
  onPttDown,
  onPttUp,
  onEnd,
  disabled,
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Button
        variant={muted ? 'danger' : 'secondary'}
        size="lg"
        onClick={onToggleMute}
        aria-pressed={muted}
        disabled={disabled}
        aria-keyshortcuts="M"
      >
        <MicIcon off={muted} />
        {muted ? 'Unmute' : 'Mute'}
        <kbd className="hidden rounded border border-current/30 px-1 text-xs opacity-70 sm:inline">
          M
        </kbd>
      </Button>

      {inputMode === 'ptt' ? (
        <button
          type="button"
          disabled={disabled || muted}
          aria-pressed={pttPressed}
          aria-keyshortcuts="Space"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            onPttDown();
          }}
          onPointerUp={onPttUp}
          onPointerCancel={onPttUp}
          onContextMenu={(e) => e.preventDefault()}
          className={cn(
            'inline-flex h-12 touch-none items-center gap-2 rounded-md px-6 font-medium transition-colors select-none disabled:opacity-50',
            pttPressed ? 'bg-success text-bg' : 'bg-accent text-accent-fg hover:bg-accent-hover',
          )}
        >
          {pttPressed ? 'Talking...' : 'Hold to talk'}
          <kbd className="hidden rounded border border-current/30 px-1 text-xs opacity-70 sm:inline">
            Space
          </kbd>
        </button>
      ) : null}

      <Button variant="danger" size="lg" onClick={onEnd} aria-keyshortcuts="Escape">
        End interview
      </Button>
    </div>
  );
}
