/**
 * localStorage helpers for per-browser conveniences only (never tokens or anything sensitive).
 * Storage can be missing or throw (private mode, blocked site data), so every call is guarded.
 */

/** @template T @param {string} key @param {T} fallback @returns {T} */
export function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/** @param {string} key @param {unknown} value */
export function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore: storage is a convenience
  }
}

/** @param {string} key */
export function removeKey(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export const STORAGE_KEYS = {
  latestResumeId: 'rr.latestResumeId',
  recentInterviews: 'rr.recentInterviews',
  theme: 'rr.theme',
  roomPrefs: 'rr.roomPrefs',
};

const RECENT_MAX = 10;

/**
 * There is no "list my interviews" endpoint yet, so the browser remembers recent ones.
 * @param {{ id: string, role: string, level: string, mode: string, createdAt: string }} interview
 */
export function rememberInterview(interview) {
  const { id, role, level, mode, createdAt } = interview;
  const list = readJson(STORAGE_KEYS.recentInterviews, []).filter((i) => i.id !== id);
  writeJson(
    STORAGE_KEYS.recentInterviews,
    [{ id, role, level, mode, createdAt }, ...list].slice(0, RECENT_MAX),
  );
}

/** @returns {Array<{ id: string, role: string, level: string, mode: string, createdAt: string }>} */
export function recentInterviews() {
  const list = readJson(STORAGE_KEYS.recentInterviews, []);
  return Array.isArray(list) ? list : [];
}

/** Forget everything this app stored in the browser (logout). */
export function clearAppStorage() {
  for (const key of [
    STORAGE_KEYS.latestResumeId,
    STORAGE_KEYS.recentInterviews,
    STORAGE_KEYS.roomPrefs,
  ]) {
    removeKey(key);
  }
}
