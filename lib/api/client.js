import { env } from '@/lib/env';
import { getAccessToken, setAnonymous, setAuthenticated } from '@/lib/auth/token-store';
import { ApiError } from './errors';

/** @type {Promise<any> | null} */
let refreshPromise = null;

function retryAfterFrom(headerValue) {
  const n = Number(headerValue);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * POST /auth/refresh, single-flight: concurrent callers share one request. The refresh token
 * rotates on every use and reuse ends the session, so two parallel refreshes must never happen.
 * @returns {Promise<{ user: any, accessToken: string, expiresIn: number }>}
 */
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${env.apiUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .catch(() => {
        throw new ApiError(0, null);
      })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          // Only a real auth failure ends the session; 429/5xx keep the user's state as is.
          if (res.status === 401) setAnonymous();
          throw new ApiError(res.status, body, {
            retryAfterSec: retryAfterFrom(res.headers.get('Retry-After')),
          });
        }
        setAuthenticated(body.accessToken, body.user);
        return body;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * @typedef {object} RequestOptions
 * @property {'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'} [method]
 * @property {any} [body] JSON-serialisable body or FormData
 * @property {Record<string, string>} [headers]
 * @property {AbortSignal} [signal]
 * @property {boolean} [retry] retry once after refreshing on 401 (default true)
 */

/**
 * Calls the REST API. Attaches the bearer token, refreshes once on 401, maps errors to ApiError.
 * @param {string} path path under NEXT_PUBLIC_API_URL, e.g. '/me'
 * @param {RequestOptions} [options]
 * @returns {Promise<{ status: number, data: any, headers: Headers }>}
 */
export async function api(path, { method = 'GET', body, headers = {}, signal, retry = true } = {}) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const token = getAccessToken();

  let res;
  try {
    res = await fetch(`${env.apiUrl}${path}`, {
      method,
      credentials: 'include',
      signal,
      headers: {
        Accept: 'application/json',
        ...(isForm || body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: isForm ? body : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError(0, null);
  }

  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    await refreshSession(); // throws when the session is gone; the route guard sends to /login
    return api(path, { method, body, headers, signal, retry: false });
  }

  if (res.status === 204) return { status: 204, data: null, headers: res.headers };

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) setAnonymous();
    throw new ApiError(res.status, data, {
      retryAfterSec: retryAfterFrom(res.headers.get('Retry-After')),
    });
  }
  return { status: res.status, data, headers: res.headers };
}

/**
 * Multipart upload with progress. fetch() has no upload progress events, so this uses XHR with
 * the same auth and refresh behaviour as api().
 * @param {string} path
 * @param {FormData} form
 * @param {{ headers?: Record<string, string>, onProgress?: (fraction: number) => void, signal?: AbortSignal, retry?: boolean }} [options]
 * @returns {Promise<{ status: number, data: any }>}
 */
export function upload(path, form, { headers = {}, onProgress, signal, retry = true } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${env.apiUrl}${path}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Accept', 'application/json');
    const token = getAccessToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onerror = () => reject(new ApiError(0, null));
    xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'));
    xhr.onload = () => {
      let data = null;
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        data = null;
      }
      if (xhr.status === 401 && retry) {
        refreshSession()
          .then(() => upload(path, form, { headers, onProgress, signal, retry: false }))
          .then(resolve, reject);
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(
          new ApiError(xhr.status, data, {
            retryAfterSec: retryAfterFrom(xhr.getResponseHeader('Retry-After')),
          }),
        );
        return;
      }
      resolve({ status: xhr.status, data });
    };

    if (signal) {
      if (signal.aborted) return xhr.abort();
      signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }
    xhr.send(form);
  });
}

/** Test helper. */
export function resetClientForTests() {
  refreshPromise = null;
}
