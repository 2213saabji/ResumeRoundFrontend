import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_ROUTE, postAuthRoute, safeNextPath } from './session';

describe('post-login redirects', () => {
  it('only allows same-origin relative paths', () => {
    expect(safeNextPath('/profile')).toBe('/profile');
    expect(safeNextPath('//evil.com')).toBeNull();
    expect(safeNextPath('/\\evil.com')).toBeNull();
    expect(safeNextPath('https://evil.com')).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });

  it('sends new users to onboarding first', () => {
    expect(postAuthRoute({ onboarded: false }, '/profile')).toBe('/onboarding');
    expect(postAuthRoute({ onboarded: true }, '/profile')).toBe('/profile');
    expect(postAuthRoute({ onboarded: true }, null)).toBe(DEFAULT_APP_ROUTE);
  });
});
