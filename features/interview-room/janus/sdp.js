/** Target Opus bitrate: voice stays clear and TURN bandwidth (a real cost) stays low. */
export const OPUS_MAX_AVERAGE_BITRATE = 24_000;

/**
 * Caps Opus bitrate and enables in-band FEC (better on lossy networks) in an SDP offer.
 * @param {string} sdp
 * @returns {string}
 */
export function tuneOpus(sdp) {
  const match = sdp.match(/a=rtpmap:(\d+) opus\/48000[^\r\n]*/i);
  if (!match) return sdp;
  const pt = match[1];
  const fmtpRe = new RegExp(`a=fmtp:${pt} ([^\\r\\n]*)`);
  const extras = { maxaveragebitrate: String(OPUS_MAX_AVERAGE_BITRATE), useinbandfec: '1' };

  if (fmtpRe.test(sdp)) {
    return sdp.replace(fmtpRe, (_line, params) => {
      const map = new Map(
        params
          .split(';')
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p) => {
            const [k, ...v] = p.split('=');
            return [k, v.join('=')];
          }),
      );
      for (const [k, v] of Object.entries(extras)) map.set(k, v);
      return `a=fmtp:${pt} ${[...map].map(([k, v]) => `${k}=${v}`).join(';')}`;
    });
  }

  const line = `a=fmtp:${pt} ${Object.entries(extras)
    .map(([k, v]) => `${k}=${v}`)
    .join(';')}`;
  return sdp.replace(match[0], `${match[0]}\r\n${line}`);
}
