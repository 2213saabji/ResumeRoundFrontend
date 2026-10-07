/**
 * Loads janus.js and the WebRTC adapter on demand. They are only needed once the candidate
 * clicks "Join", so they stay out of the room's initial bundle.
 */

/** @type {Promise<any> | null} */
let loading = null;

/** @returns {Promise<any>} the initialised Janus namespace */
export function loadJanus() {
  if (!loading) {
    loading = Promise.all([import('janus-gateway'), import('webrtc-adapter')])
      .then(
        ([janusModule, adapterModule]) =>
          new Promise((resolve) => {
            const Janus = janusModule.default;
            const adapter = adapterModule.default;
            Janus.init({
              debug: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : false,
              dependencies: Janus.useDefaultDependencies({ adapter }),
              callback: () => resolve(Janus),
            });
          }),
      )
      .catch((err) => {
        loading = null;
        throw err;
      });
  }
  return loading;
}

/** True when this browser can run a WebRTC call at all. */
export function isWebRtcSupported() {
  return (
    typeof window !== 'undefined' &&
    typeof window.RTCPeerConnection === 'function' &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

/** Short random id for Janus transactions and usernames. */
export function randomId(prefix = '') {
  const rnd =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}${rnd}`;
}
