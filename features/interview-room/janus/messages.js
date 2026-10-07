/**
 * Data-channel protocol between the browser and the AI bot (MVP-4; confirm with the backend
 * when the join contract is published).
 *
 * Bot -> browser:
 *   { type: 'caption', speaker: 'ai' | 'candidate', text, isFinal, id? }
 *   { type: 'turn_state', state: 'ai_speaking' | 'listening' | 'thinking' }
 *   { type: 'interview_event', event: 'ended' | 'objective_changed' | ..., ...details }
 * Browser -> bot:
 *   { type: 'barge_in' }
 *   { type: 'ptt', pressed: boolean }
 *
 * The bot's JSON travels as the `text` of a Janus TextRoom message, so payloads may arrive
 * wrapped in { textroom: 'message', from, text } or bare.
 */

export const TURN_STATES = ['ai_speaking', 'listening', 'thinking'];

/**
 * Normalises one raw data-channel payload into a protocol message, or null if it is not one.
 * @param {string | object} raw
 * @returns {null | { type: 'caption', speaker: 'ai' | 'candidate', text: string, isFinal: boolean, id?: string }
 *   | { type: 'turn_state', state: string }
 *   | { type: 'interview_event', event: string, [k: string]: unknown }}
 */
export function parseBotMessage(raw) {
  let msg = raw;
  try {
    if (typeof msg === 'string') msg = JSON.parse(msg);
    if (msg?.textroom === 'message' && typeof msg.text === 'string') msg = JSON.parse(msg.text);
  } catch {
    return null;
  }
  if (!msg || typeof msg !== 'object') return null;

  switch (msg.type) {
    case 'caption':
      if (typeof msg.text !== 'string') return null;
      return {
        type: 'caption',
        speaker: msg.speaker === 'candidate' ? 'candidate' : 'ai',
        text: msg.text,
        isFinal: !!msg.isFinal,
        ...(msg.id != null ? { id: String(msg.id) } : {}),
      };
    case 'turn_state':
      return TURN_STATES.includes(msg.state) ? { type: 'turn_state', state: msg.state } : null;
    case 'interview_event':
      return typeof msg.event === 'string' ? { ...msg, type: 'interview_event' } : null;
    default:
      return null;
  }
}
