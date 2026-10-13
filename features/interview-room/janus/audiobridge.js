import { randomId } from './load-janus';
import { tuneOpus } from './sdp';

/** How long a 'disconnected' ICE state may last before the call counts as dropped. */
export const DISCONNECT_GRACE_MS = 5000;

/**
 * Joins a Janus AudioBridge room and publishes the candidate's microphone. The AI bot is the
 * other participant; its audio arrives mixed on the remote track.
 *
 * @param {any} janus Janus session
 * @param {{
 *   roomId: number | string,
 *   pin?: string,
 *   token?: string,
 *   display: string,
 *   micTrack: MediaStreamTrack,
 *   onRemoteTrack: (track: MediaStreamTrack | null) => void,
 *   onConnectionLost: (reason: string) => void,
 * }} opts
 * @returns {Promise<{ setMuted: (muted: boolean) => void, detach: () => void }>}
 */
export function joinAudioBridge(
  janus,
  { roomId, pin, token, display, micTrack, onRemoteTrack, onConnectionLost },
) {
  return new Promise((resolve, reject) => {
    let handle = null;
    let settled = false;
    /** @type {ReturnType<typeof setTimeout> | null} */
    let disconnectTimer = null;
    const clearDisconnectTimer = () => {
      if (disconnectTimer) clearTimeout(disconnectTimer);
      disconnectTimer = null;
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
      setMuted(muted) {
        handle?.send({ message: { request: 'configure', muted } });
      },
      detach() {
        clearDisconnectTimer();
        try {
          handle?.send({ message: { request: 'leave' } });
          handle?.hangup();
          handle?.detach();
        } catch {
          // already gone
        }
      },
    };

    janus.attach({
      plugin: 'janus.plugin.audiobridge',
      opaqueId: randomId('rr-candidate-'),
      success: (h) => {
        handle = h;
        h.send({
          message: {
            request: 'join',
            room: roomId,
            display,
            ...(pin ? { pin } : {}),
            ...(token ? { token } : {}),
            muted: false,
          },
          error: fail,
        });
      },
      error: fail,
      iceState: (state) => {
        if (state === 'failed') {
          clearDisconnectTimer();
          fail(new Error('ICE connection failed'));
        } else if (state === 'disconnected') {
          // 'disconnected' often recovers by itself; treat it as lost only after 5 s.
          if (!disconnectTimer) {
            disconnectTimer = setTimeout(() => {
              disconnectTimer = null;
              fail(new Error('ICE disconnected'));
            }, DISCONNECT_GRACE_MS);
          }
        } else if (state === 'connected' || state === 'completed') {
          clearDisconnectTimer();
        }
      },
      webrtcState: (on) => {
        if (on && !settled) {
          settled = true;
          resolve(api);
        } else if (!on && settled) {
          onConnectionLost('PeerConnection closed');
        }
      },
      onmessage: (msg, jsep) => {
        const event = msg?.audiobridge;
        if (msg?.error) {
          fail(new Error(msg.error));
          return;
        }
        if (event === 'joined' && msg.id && !jsep) {
          handle.createOffer({
            tracks: [{ type: 'audio', capture: micTrack, recv: true }],
            customizeSdp: (offer) => {
              offer.sdp = tuneOpus(offer.sdp);
            },
            success: (offer) => {
              handle.send({ message: { request: 'configure', muted: false }, jsep: offer });
            },
            error: fail,
          });
        }
        if (event === 'roomdestroyed') onConnectionLost('room closed');
        if (jsep) handle.handleRemoteJsep({ jsep });
      },
      onremotetrack: (track, _mid, on) => {
        if (track.kind === 'audio') onRemoteTrack(on ? track : null);
      },
      oncleanup: () => onRemoteTrack(null),
    });
  });
}
