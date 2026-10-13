/**
 * Voice controls the guide lists as planned (section 7.6, "Planned controls") but the bot does
 * not support yet. The UI for them is built; flip these on when the backend ships them.
 *
 * pushToTalk: "Hold to talk" button and Space shortcut.
 * bargeIn: speaking over the interviewer interrupts it. Until then, speech while the
 *   interviewer is talking is ignored by the bot.
 */
export const VOICE_FEATURES = {
  pushToTalk: false,
  bargeIn: false,
};
