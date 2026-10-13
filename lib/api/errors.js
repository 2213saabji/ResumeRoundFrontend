/**
 * Every backend error has the shape { error: { code, message, details, requestId } }.
 * Branch on `code`, never on `message`.
 */
export class ApiError extends Error {
  /**
   * @param {number} status HTTP status (0 for network failures)
   * @param {any} body parsed response body, if any
   * @param {{ retryAfterSec?: number | null }} [extra]
   */
  constructor(status, body, extra = {}) {
    super(body?.error?.message ?? (status ? `Request failed (HTTP ${status})` : 'Network error'));
    this.name = 'ApiError';
    this.status = status;
    /** @type {string} */
    this.code = body?.error?.code ?? (status === 0 ? 'NETWORK_ERROR' : 'INTERNAL');
    this.details = body?.error?.details;
    /** @type {string | undefined} */
    this.requestId = body?.error?.requestId;
    this.retryAfterSec = extra.retryAfterSec ?? body?.error?.details?.retryAfterSec ?? null;
  }
}

/** @param {unknown} err */
export function isApiError(err) {
  return err instanceof ApiError;
}

/**
 * Whether a retry after this error may reuse the same Idempotency-Key. Network failures and
 * 5xx: yes (the server dedupes). A 4xx means the request itself must change, and reusing the
 * key with a different body is rejected as IDEMPOTENCY_CONFLICT.
 * @param {unknown} err
 */
export function canReuseIdempotencyKey(err) {
  if (!(err instanceof ApiError)) return true;
  return err.status === 0 || err.status >= 500 || err.code === 'RATE_LIMITED';
}

/**
 * A user-facing message for any thrown value.
 * @param {unknown} err
 * @param {string} [fallback]
 */
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!(err instanceof ApiError))
    return err instanceof Error && err.message ? err.message : fallback;
  switch (err.code) {
    case 'NETWORK_ERROR':
      return 'Cannot reach the server. Check your connection and try again.';
    case 'RATE_LIMITED':
      return err.retryAfterSec
        ? `Too many requests. Try again in ${err.retryAfterSec} seconds.`
        : 'Too many requests. Please wait a moment and try again.';
    case 'INTERNAL':
      return err.requestId
        ? `Something went wrong on our side (ref ${err.requestId}).`
        : 'Something went wrong on our side.';
    default: {
      const message = err.message || fallback;
      // Server-side failures carry a ref the backend team can find in the logs.
      return err.status >= 500 && err.requestId ? `${message} (ref ${err.requestId})` : message;
    }
  }
}

/**
 * Copies 400 VALIDATION_ERROR field details onto a React Hook Form.
 * @param {unknown} err
 * @param {(name: any, error: { type: string, message: string }) => void} setError
 * @returns {boolean} true when at least one field error was applied
 */
export function applyFieldErrors(err, setError) {
  if (
    !(err instanceof ApiError) ||
    err.code !== 'VALIDATION_ERROR' ||
    !Array.isArray(err.details)
  ) {
    return false;
  }
  let applied = false;
  for (const d of err.details) {
    const path = Array.isArray(d?.path) ? d.path.join('.') : d?.path;
    if ((d?.location ?? 'body') === 'body' && path) {
      setError(path, { type: 'server', message: d.message });
      applied = true;
    }
  }
  return applied;
}
