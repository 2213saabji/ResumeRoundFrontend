import { create } from 'zustand';

/**
 * Fast-changing call state for the interview room (the only Zustand store in the app).
 *
 * turnState mirrors the bot: connecting | ai_speaking | listening | thinking | reconnecting | ended
 */

export const MAX_CAPTIONS = 200;

/**
 * @typedef {{ id: string, speaker: 'ai' | 'candidate', text: string, isFinal: boolean }} Caption
 * @typedef {'connecting' | 'ai_speaking' | 'listening' | 'thinking' | 'reconnecting' | 'ended'} TurnState
 */

const initialState = {
  /** @type {TurnState} */
  turnState: 'connecting',
  /** @type {Caption[]} */
  captions: [],
  muted: false,
  /** 'vad' = automatic end-of-turn detection, 'ptt' = hold Space to talk */
  inputMode: /** @type {'vad' | 'ptt'} */ ('vad'),
  pttPressed: false,
  /** epoch ms of the first ai_speaking state; the timer starts here */
  startedAt: /** @type {number | null} */ (null),
  /** epoch ms when the current reconnect window opened */
  reconnectingSince: /** @type {number | null} */ (null),
  /** @type {null | { title: string, message: string, canRetry: boolean }} */
  fatalError: null,
};

let captionSeq = 0;

export const useCallStore = create((set) => ({
  ...initialState,

  /** @param {TurnState} turnState */
  setTurnState: (turnState) =>
    set((s) => ({
      turnState,
      startedAt: s.startedAt ?? (turnState === 'ai_speaking' ? Date.now() : null),
      reconnectingSince: turnState === 'reconnecting' ? (s.reconnectingSince ?? Date.now()) : null,
    })),

  /**
   * Adds or updates a caption. Partial captions (isFinal false) replace the speaker's open
   * caption so text grows in place instead of stacking duplicates.
   * @param {{ speaker: 'ai' | 'candidate', text: string, isFinal: boolean, id?: string }} c
   */
  upsertCaption: (c) =>
    set((s) => {
      const captions = s.captions.slice();
      let idx = -1;
      if (c.id) idx = captions.findIndex((x) => x.id === c.id);
      if (idx === -1) {
        for (let i = captions.length - 1; i >= 0; i--) {
          if (captions[i].speaker === c.speaker && !captions[i].isFinal) {
            idx = i;
            break;
          }
          if (captions[i].speaker !== c.speaker) break;
        }
      }
      if (idx >= 0) {
        captions[idx] = { ...captions[idx], text: c.text, isFinal: c.isFinal };
      } else {
        captions.push({
          id: c.id ?? `c${++captionSeq}`,
          speaker: c.speaker,
          text: c.text,
          isFinal: c.isFinal,
        });
      }
      return { captions: captions.slice(-MAX_CAPTIONS) };
    }),

  /** Adds the candidate's typed answer to the caption list. */
  addTypedAnswer: (text) =>
    set((s) => ({
      captions: [
        ...s.captions,
        {
          id: `t${++captionSeq}`,
          speaker: /** @type {const} */ ('candidate'),
          text,
          isFinal: true,
        },
      ].slice(-MAX_CAPTIONS),
    })),

  setMuted: (muted) => set({ muted }),
  setInputMode: (inputMode) => set({ inputMode }),
  setPttPressed: (pttPressed) => set({ pttPressed }),
  setFatalError: (fatalError) => set({ fatalError }),

  reset: () => set({ ...initialState }),
}));
