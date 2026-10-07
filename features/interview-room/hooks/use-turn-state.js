'use client';

import { useCallStore } from '../store';

/** UI copy for each turn state. */
export const TURN_STATE_UI = {
  connecting: { label: 'Connecting to interviewer', tone: 'neutral' },
  ai_speaking: { label: 'Interviewer is speaking', tone: 'accent' },
  listening: { label: 'Your turn', tone: 'success' },
  thinking: { label: 'Interviewer is thinking', tone: 'neutral' },
  reconnecting: { label: 'Reconnecting', tone: 'warning' },
  ended: { label: 'Interview ended', tone: 'neutral' },
};

/** Current turn state plus its label and tone. */
export function useTurnState() {
  const state = useCallStore((s) => s.turnState);
  return { state, ...TURN_STATE_UI[state] };
}
