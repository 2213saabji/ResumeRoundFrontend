import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAccessToken,
  getSessionStatus,
  resetSessionForTests,
  setAuthenticated,
} from '@/lib/auth/token-store';
import { api, refreshSession, resetClientForTests } from './client';
import { ApiError, canReuseIdempotencyKey } from './errors';

const API = 'http://api.test/api/v1';

function json(status, body, headers = {}) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

const authBody = (token) => ({
  user: { id: 'u1', email: 'a@b.co', onboarded: true },
  accessToken: token,
  expiresIn: 900,
});

describe('api client', () => {
  let fetchMock;

  beforeEach(() => {
    resetSessionForTests();
    resetClientForTests();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the bearer token, cookies and JSON body', async () => {
    setAuthenticated('tok-1');
    fetchMock.mockResolvedValueOnce(json(200, { user: { id: 'u1' } }));

    const res = await api('/me', { method: 'PATCH', body: { name: 'Asha' } });

    expect(res.data).toEqual({ user: { id: 'u1' } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API}/me`);
    expect(init.credentials).toBe('include');
    expect(init.headers.Authorization).toBe('Bearer tok-1');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ name: 'Asha' }));
  });

  it('refreshes once on 401 and retries with the new token', async () => {
    setAuthenticated('expired');
    fetchMock
      .mockResolvedValueOnce(json(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } }))
      .mockResolvedValueOnce(json(200, authBody('fresh')))
      .mockResolvedValueOnce(json(200, { ok: true }));

    const res = await api('/me');

    expect(res.data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe(`${API}/auth/refresh`);
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer fresh');
    expect(getAccessToken()).toBe('fresh');
  });

  it('shares one refresh between concurrent 401s (the refresh token rotates)', async () => {
    setAuthenticated('expired');
    let resolveRefresh;
    fetchMock.mockImplementation((url) => {
      if (url.endsWith('/auth/refresh')) {
        return new Promise((r) => {
          resolveRefresh = () => r(json(200, authBody('fresh')));
        });
      }
      const init = fetchMock.mock.calls.at(-1)[1];
      return Promise.resolve(
        init.headers.Authorization === 'Bearer fresh'
          ? json(200, { ok: true })
          : json(401, { error: { code: 'UNAUTHORIZED' } }),
      );
    });

    const both = Promise.all([api('/a'), api('/b')]);
    await vi.waitFor(() => expect(resolveRefresh).toBeTypeOf('function'));
    resolveRefresh();
    await both;

    const refreshCalls = fetchMock.mock.calls.filter(([u]) => u.endsWith('/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
  });

  it('marks the session anonymous when refresh returns 401', async () => {
    setAuthenticated('expired');
    fetchMock
      .mockResolvedValueOnce(json(401, { error: { code: 'UNAUTHORIZED' } }))
      .mockResolvedValueOnce(
        json(401, { error: { code: 'UNAUTHORIZED', message: 'Session expired' } }),
      );

    await expect(api('/me')).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
    expect(getSessionStatus()).toBe('anonymous');
    expect(getAccessToken()).toBeNull();
  });

  it('does not refresh for /auth/* calls', async () => {
    fetchMock.mockResolvedValueOnce(
      json(401, { error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } }),
    );
    await expect(api('/auth/login', { method: 'POST', body: {} })).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps the error body, requestId and Retry-After', async () => {
    fetchMock.mockResolvedValueOnce(
      json(
        429,
        { error: { code: 'RATE_LIMITED', message: 'Too many', requestId: 'req-1', details: {} } },
        { 'Retry-After': '30' },
      ),
    );
    const err = await api('/resumes').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
      requestId: 'req-1',
      retryAfterSec: 30,
    });
  });

  it('turns network failures into NETWORK_ERROR', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(api('/me')).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });

  it('returns null data for 204', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(api('/auth/logout', { method: 'POST' })).resolves.toMatchObject({
      status: 204,
      data: null,
    });
  });

  it('refreshSession keeps the session on non-401 failures', async () => {
    setAuthenticated('tok');
    fetchMock.mockResolvedValueOnce(json(503, { error: { code: 'SERVICE_UNAVAILABLE' } }));
    await expect(refreshSession()).rejects.toMatchObject({ status: 503 });
    expect(getSessionStatus()).toBe('authenticated');
  });
});

describe('canReuseIdempotencyKey', () => {
  it('reuses after network, 5xx and rate limits but not other 4xx', () => {
    expect(canReuseIdempotencyKey(new ApiError(0, null))).toBe(true);
    expect(canReuseIdempotencyKey(new ApiError(502, null))).toBe(true);
    expect(canReuseIdempotencyKey(new ApiError(429, { error: { code: 'RATE_LIMITED' } }))).toBe(
      true,
    );
    expect(canReuseIdempotencyKey(new ApiError(400, { error: { code: 'VALIDATION_ERROR' } }))).toBe(
      false,
    );
    expect(canReuseIdempotencyKey(new ApiError(409, { error: { code: 'CONFLICT' } }))).toBe(false);
  });
});
