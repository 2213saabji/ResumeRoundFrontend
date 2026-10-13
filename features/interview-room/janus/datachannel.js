import { randomId } from './load-janus';
import { parseBotMessage } from './messages';

/**
 * Joins the Janus TextRoom paired with the interview (AudioBridge has no data channels).
 * Captions, the interviewer's state and the end event arrive here as announcements.
 *
 * @param {any} janus Janus session
 * @param {{
 *   roomId: number | string,
 *   pin?: string,
 *   token?: string,
 *   display: string,
 *   onMessage: (msg: NonNullable<ReturnType<typeof parseBotMessage>>) => void,
 *   onConnectionLost: (reason: string) => void,
 * }} opts
 * @returns {Promise<{ send: (payload: object) => void, detach: () => void }>}
 */
export function joinTextRoom(janus, { roomId, pin, token, display, onMessage, onConnectionLost }) {
  return new Promise((resolve, reject) => {
    let handle = null;
    let settled = false;
    let joinTx = '';

    const sendJoin = (username) => {
      joinTx = randomId('join-');
      handle.data({
        text: JSON.stringify({
          textroom: 'join',
          transaction: joinTx,
          room: roomId,
          username,
          display,
          ...(pin ? { pin } : {}),
          ...(token ? { token } : {}),
        }),
        error: fail,
      });
    };

    const fail = (err) => {
      if (!settled) {
        settled = true;
        reject(err instanceof Error ? err : new Error(String(err)));
      } else {
        onConnectionLost(err instanceof Error ? err.message : String(err));
      }
    };

    const api = {
      send(payload) {
        handle?.data({
          text: JSON.stringify({
            textroom: 'message',
            transaction: randomId('tx-'),
            room: roomId,
            text: JSON.stringify(payload),
          }),
          error: () => {
            // a lost control message is not fatal; the bot also watches audio levels
          },
        });
      },
      detach() {
        try {
          handle?.hangup();
          handle?.detach();
        } catch {
          // already gone
        }
      },
    };

    janus.attach({
      plugin: 'janus.plugin.textroom',
      opaqueId: randomId('rr-captions-'),
      success: (h) => {
        handle = h;
        h.send({ message: { request: 'setup' }, error: fail });
      },
      error: fail,
      iceState: (state) => {
        if (state === 'failed') fail(new Error('Data channel ICE failed'));
      },
      onmessage: (msg, jsep) => {
        if (msg?.error) {
          fail(new Error(msg.error));
          return;
        }
        if (jsep) {
          handle.createAnswer({
            jsep,
            tracks: [{ type: 'data' }],
            success: (answer) => handle.send({ message: { request: 'ack' }, jsep: answer }),
            error: fail,
          });
        }
      },
      // A new name each time: after a drop the old session may still hold the previous one.
      ondataopen: () => sendJoin(randomId('candidate-').slice(0, 'candidate-'.length + 8)),
      ondata: (data) => {
        let raw;
        try {
          raw = JSON.parse(data);
        } catch {
          return;
        }
        if (raw?.transaction === joinTx) {
          if (raw.textroom === 'error') {
            fail(new Error(raw.error || 'Could not join captions room'));
          } else if (!settled) {
            settled = true;
            resolve(api);
          }
          return;
        }
        if (raw?.textroom === 'destroyed') {
          onConnectionLost('captions room closed');
          return;
        }
        const msg = parseBotMessage(raw);
        if (msg) onMessage(msg);
      },
    });
  });
}
