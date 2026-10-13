/**
 * Caption-channel protocol from the interview bot (guide section 7.6). The bot sends every event
 * as a TextRoom announcement, { textroom: 'announcement', text: '<JSON>' }:
 *
 *   { type: 'state', state: 'speaking' | 'listening' | 'thinking' }
 *   { type: 'interviewer', seq, text }            one sentence, sent when it starts playing
 *   { type: 'candidate', seq, text, final }       live transcript; interim until final
 *   { type: 'ended', reason: 'completed' | 'time_up' | 'ended_by_user' }
 *
 * Messages from room users ({ textroom: 'message' }) are ignored: only the bot can announce.
 * Announcements are not stored, so after a reconnect the history comes from GET /turns.
 * The bot's 'speaking' state is stored as 'ai_speaking' in the call store.
 *
 * Browser -> bot messages (barge-in, push-to-talk) are planned but not supported by the bot
 * yet; see VOICE_FEATURES.
 */

const STATE_MAP = { speaking: 'ai_speaking', listening: 'listening', thinking: 'thinking' };

/**
 * Normalises one raw data-channel payload into a protocol event, or null if it is not one.
 * @param {string | object} raw
 * @returns {null
 *   | { type: 'state', state: 'ai_speaking' | 'listening' | 'thinking' }
 *   | { type: 'interviewer', seq: number, text: string }
 *   | { type: 'candidate', seq: number, text: string, final: boolean }
 *   | { type: 'ended', reason: string }}
 */
export function parseBotMessage(raw) {
  let msg = raw;
  try {
    if (typeof msg === 'string') msg = JSON.parse(msg);
    if (msg?.textroom !== undefined) {
      if (msg.textroom !== 'announcement' || typeof msg.text !== 'string') return null;
      msg = JSON.parse(msg.text);
    }
  } catch {
    return null;
  }
  if (!msg || typeof msg !== 'object') return null;

  switch (msg.type) {
    case 'state':
      return STATE_MAP[msg.state] ? { type: 'state', state: STATE_MAP[msg.state] } : null;
    case 'interviewer':
      if (typeof msg.text !== 'string' || !Number.isFinite(msg.seq)) return null;
      return { type: 'interviewer', seq: msg.seq, text: msg.text };
    case 'candidate':
      if (typeof msg.text !== 'string' || !Number.isFinite(msg.seq)) return null;
      return { type: 'candidate', seq: msg.seq, text: msg.text, final: !!msg.final };
    case 'ended':
      return { type: 'ended', reason: typeof msg.reason === 'string' ? msg.reason : 'completed' };
    default:
      return null;
  }
}
