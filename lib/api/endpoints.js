import { api, upload } from './client';
import { checkContract } from './contract';

/**
 * Every REST call the app makes. Components never call fetch directly; they go through these
 * functions via TanStack Query hooks.
 */

/** @returns {string} 8-128 chars of [A-Za-z0-9_-], as the backend expects */
export function newIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

// ---------- auth ----------

export const authApi = {
  /** @param {{ email: string, password: string, name?: string }} input */
  async register(input) {
    const { data } = await api('/auth/register', { method: 'POST', body: input });
    return checkContract('auth', data, 'POST /auth/register');
  },

  /** @param {{ email: string, password: string }} input */
  async login(input) {
    const { data } = await api('/auth/login', { method: 'POST', body: input });
    return checkContract('auth', data, 'POST /auth/login');
  },

  /** @param {string} idToken Google Identity Services credential */
  async google(idToken) {
    const { data } = await api('/auth/google', { method: 'POST', body: { idToken } });
    return checkContract('auth', data, 'POST /auth/google');
  },

  async logout() {
    await api('/auth/logout', { method: 'POST' });
  },
};

// ---------- me ----------

export const meApi = {
  async get() {
    const { data } = await api('/me');
    return checkContract('me', data, 'GET /me').user;
  },

  /** @param {{ name?: string, targetRole?: string, level?: string, companyType?: string }} patch */
  async update(patch) {
    const { data } = await api('/me', { method: 'PATCH', body: patch });
    return checkContract('me', data, 'PATCH /me').user;
  },
};

// ---------- resumes ----------

export const resumesApi = {
  /**
   * @param {File} file
   * @param {{ idempotencyKey: string, onProgress?: (f: number) => void, signal?: AbortSignal }} opts
   */
  async upload(file, { idempotencyKey, onProgress, signal }) {
    const form = new FormData();
    form.append('file', file); // the field name must be "file"
    const { data } = await upload('/resumes', form, {
      headers: { 'Idempotency-Key': idempotencyKey },
      onProgress,
      signal,
    });
    return checkContract('resume', data, 'POST /resumes').resume;
  },

  /** @param {string} id */
  async get(id) {
    const { data } = await api(`/resumes/${id}`);
    return checkContract('resume', data, 'GET /resumes/:id').resume;
  },
};

// ---------- profiles ----------

export const profilesApi = {
  /** @returns {Promise<any | null>} null when the user has no parsed resume yet (404) */
  async getCurrent() {
    try {
      const { data } = await api('/profiles/current');
      return checkContract('profile', data, 'GET /profiles/current').profile;
    } catch (err) {
      if (err?.code === 'NOT_FOUND') return null;
      throw err;
    }
  },

  /** Each section sent replaces the stored one completely. */
  async update(patch) {
    const { data } = await api('/profiles/current', { method: 'PATCH', body: patch });
    return checkContract('profile', data, 'PATCH /profiles/current').profile;
  },
};

// ---------- interviews ----------

export const interviewsApi = {
  /**
   * @param {{ role?: string, level?: string, companyType?: string, durationMin?: number, mode?: 'voice' | 'text' }} input
   * @param {string} idempotencyKey
   */
  async create(input, idempotencyKey) {
    const { data } = await api('/interviews', {
      method: 'POST',
      body: input,
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return checkContract('interview', data, 'POST /interviews').interview;
  },

  /** @param {string} id */
  async get(id) {
    const { data } = await api(`/interviews/${id}`);
    return checkContract('interview', data, 'GET /interviews/:id').interview;
  },

  /**
   * GET /interviews/:id with the open question and progress (siblings of interview). Both are
   * null when not started or ended, and null on servers that do not send them yet.
   * @param {string} id
   * @returns {Promise<{ interview: any, progress: any | null, currentTurn: any | null }>}
   */
  async getSession(id) {
    const { data } = await api(`/interviews/${id}`);
    checkContract('interviewSession', data, 'GET /interviews/:id');
    return {
      interview: data.interview,
      progress: data.progress ?? null,
      currentTurn: data.currentTurn ?? null,
    };
  },

  /** @param {string} id @param {{ cursor?: string | null, limit?: number }} [page] */
  async turns(id, { cursor, limit = 50 } = {}) {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (cursor) qs.set('cursor', cursor);
    const { data } = await api(`/interviews/${id}/turns?${qs}`);
    return checkContract('turnsPage', data, 'GET /interviews/:id/turns');
  },

  /** Every turn, following nextCursor (an interview has tens of turns, not thousands). */
  async allTurns(id, { maxPages = 10 } = {}) {
    const items = [];
    let cursor = null;
    for (let page = 0; page < maxPages; page++) {
      const res = await interviewsApi.turns(id, { cursor, limit: 50 });
      items.push(...res.items);
      if (!res.nextCursor) break;
      cursor = res.nextCursor;
    }
    return items;
  },

  /** MVP-4: returns { janusUrl, roomId, token, pin?, textRoomId?, iceServers }. */
  async join(id) {
    const { data } = await api(`/interviews/${id}/join`, { method: 'POST' });
    return checkContract('join', data, 'POST /interviews/:id/join');
  },

  /**
   * Starts the interview and returns the first question. Safe to call again: on an interview
   * already in progress it returns the current open question (used to resync).
   * @param {string} id
   * @returns {Promise<{ interview: any, progress: any, currentTurn: any | null }>}
   */
  async start(id) {
    const { data } = await api(`/interviews/${id}/start`, { method: 'POST' });
    return checkContract('start', data, 'POST /interviews/:id/start');
  },

  /**
   * Answers the open question and returns the next one. When the interview finishes,
   * currentTurn is null and closingMessage is set. Resending the same seq + text is safe (the
   * server dedupes), so no Idempotency-Key is needed.
   * @param {string} id
   * @param {{ seq: number, answerText: string }} answer
   * @returns {Promise<{ interview: any, progress: any, currentTurn: any | null, closingMessage: string | null }>}
   */
  async answer(id, { seq, answerText }) {
    const { data } = await api(`/interviews/${id}/answers`, {
      method: 'POST',
      body: { seq, answerText },
    });
    return checkContract('answer', data, 'POST /interviews/:id/answers');
  },

  /** Safe to call more than once. */
  async end(id) {
    const { data } = await api(`/interviews/${id}/end`, { method: 'POST' });
    return checkContract('interview', data, 'POST /interviews/:id/end').interview;
  },

  /** @returns {Promise<{ status: 'generating' } | { status: 'ready', report: any }>} */
  async report(id) {
    const { data } = await api(`/interviews/${id}/report`);
    return checkContract('report', data, 'GET /interviews/:id/report');
  },
};

// ---------- progress ----------

export const progressApi = {
  async get() {
    const { data } = await api('/users/me/progress');
    return checkContract('progress', data, 'GET /users/me/progress');
  },
};
