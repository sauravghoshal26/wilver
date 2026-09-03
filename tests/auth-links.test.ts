import { describe, expect, it } from 'vitest';

import { parseAuthLink } from '@/src/lib/authLinks';

describe('auth deep links', () => {
  it('parses PKCE callbacks from query parameters', () => {
    expect(parseAuthLink('wilver://auth/callback?code=pkce-code')).toMatchObject({ code: 'pkce-code' });
  });

  it('parses recovery tokens from a URL fragment', () => {
    expect(parseAuthLink('wilver://auth/reset-password#access_token=access&refresh_token=refresh&type=recovery')).toEqual({
      accessToken: 'access', refreshToken: 'refresh', code: undefined, type: 'recovery', error: undefined,
    });
  });

  it('surfaces provider error descriptions', () => {
    expect(parseAuthLink('wilver://auth/callback?error=access_denied&error_description=Expired%20link').error).toBe('Expired link');
  });
});
