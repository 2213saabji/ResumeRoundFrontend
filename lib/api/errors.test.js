import { describe, expect, it, vi } from 'vitest';
import { ApiError, applyFieldErrors, errorMessage } from './errors';

const apiError = (status, error) => new ApiError(status, { error });

describe('errorMessage', () => {
  it('adds the request id to server-side failures only', () => {
    expect(
      errorMessage(
        apiError(503, { code: 'SERVICE_UNAVAILABLE', message: 'Busy', requestId: 'r1' }),
      ),
    ).toBe('Busy (ref r1)');
    expect(
      errorMessage(apiError(409, { code: 'CONFLICT', message: 'Taken', requestId: 'r2' })),
    ).toBe('Taken');
  });
});

describe('applyFieldErrors', () => {
  it('applies body details, with or without location, and joins array paths', () => {
    const setError = vi.fn();
    const err = apiError(400, {
      code: 'VALIDATION_ERROR',
      details: [
        { location: 'body', path: 'email', message: 'Invalid email address' },
        { path: ['projects', 0, 'name'], message: 'Required' },
        { location: 'query', path: 'limit', message: 'Too big' },
      ],
    });
    expect(applyFieldErrors(err, setError)).toBe(true);
    expect(setError.mock.calls).toEqual([
      ['email', { type: 'server', message: 'Invalid email address' }],
      ['projects.0.name', { type: 'server', message: 'Required' }],
    ]);
  });
});
