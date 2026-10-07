/**
 * In-memory auth state. The access token never touches localStorage; the refresh token is an
 * httpOnly cookie the browser sends on /auth/* calls.
 *
 * status: 'unknown' (not checked yet) | 'authenticated' | 'anonymous'
 */

/** @typedef {'unknown' | 'authenticated' | 'anonymous'} SessionStatus */

let state = /** @type {{ status: SessionStatus, accessToken: string | null, user: any }} */ ({
  status: 'unknown',
  accessToken: null,
  user: null,
});

const listeners = new Set();

function emit() {
  for (const listener of listeners) listener();
}

export function getAccessToken() {
  return state.accessToken;
}

/** @returns {SessionStatus} */
export function getSessionStatus() {
  return state.status;
}

/** The user from the last auth response; seeds the GET /me cache. */
export function getSessionUser() {
  return state.user;
}

/** @param {string} accessToken @param {any} [user] */
export function setAuthenticated(accessToken, user) {
  state = { status: 'authenticated', accessToken, user: user ?? state.user };
  emit();
}

export function setAnonymous() {
  if (state.status === 'anonymous' && state.accessToken === null) return;
  state = { status: 'anonymous', accessToken: null, user: null };
  emit();
}

/** @param {() => void} listener */
export function subscribeSession(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test helper. */
export function resetSessionForTests() {
  state = { status: 'unknown', accessToken: null, user: null };
  listeners.clear();
}
