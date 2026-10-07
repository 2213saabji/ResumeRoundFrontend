import { loadJanus } from './load-janus';

export const KEEP_ALIVE_MS = 25_000;

/**
 * Opens a Janus session (WebSocket or HTTP long-poll, decided by the URL scheme).
 *
 * @param {{
 *   server: string | string[],
 *   iceServers: RTCIceServer[],
 *   token?: string,
 *   onLost: (reason: string) => void,
 * }} opts onLost fires when an established session dies (timeout, server gone).
 * @returns {Promise<{ Janus: any, janus: any, destroy: () => Promise<void> }>}
 */
export async function createJanusSession({ server, iceServers, token, onLost }) {
  const Janus = await loadJanus();
  let established = false;
  let destroying = false;

  const janus = await new Promise((resolve, reject) => {
    const instance = new Janus({
      server,
      iceServers,
      token,
      keepAlivePeriod: KEEP_ALIVE_MS,
      success: () => {
        established = true;
        resolve(instance);
      },
      error: (cause) => {
        if (!established)
          reject(
            new Error(typeof cause === 'string' ? cause : 'Could not reach the interview server'),
          );
        else if (!destroying) onLost(typeof cause === 'string' ? cause : 'session error');
      },
      destroyed: () => {
        if (established && !destroying) onLost('session destroyed');
      },
    });
  });

  return {
    Janus,
    janus,
    destroy: () =>
      new Promise((resolve) => {
        destroying = true;
        try {
          janus.destroy({
            cleanupHandles: true,
            notifyDestroyed: false,
            success: () => resolve(undefined),
            error: () => resolve(undefined),
          });
        } catch {
          resolve(undefined);
        }
      }),
  };
}
