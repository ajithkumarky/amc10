import { describe, expect, it } from 'vitest';
import {
  serializeCookie,
  readCookie,
  sessionCookie,
  clearSessionCookie,
  stateCookie,
} from '@/lib/auth/cookies';

describe('serializeCookie', () => {
  it('builds cookie with name and value', () => {
    const result = serializeCookie('test', 'value');
    expect(result).toBe('test=value');
  });

  it('includes httpOnly when set', () => {
    const result = serializeCookie('test', 'value', { httpOnly: true });
    expect(result).toContain('HttpOnly');
  });

  it('includes secure when set', () => {
    const result = serializeCookie('test', 'value', { secure: true });
    expect(result).toContain('Secure');
  });

  it('includes sameSite when set', () => {
    const result = serializeCookie('test', 'value', { sameSite: 'Lax' });
    expect(result).toContain('SameSite=Lax');
  });

  it('includes maxAge when set', () => {
    const result = serializeCookie('test', 'value', { maxAge: 3600 });
    expect(result).toContain('Max-Age=3600');
  });

  it('includes path when set', () => {
    const result = serializeCookie('test', 'value', { path: '/api' });
    expect(result).toContain('Path=/api');
  });

  it('combines multiple attributes', () => {
    const result = serializeCookie('test', 'value', {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 7200,
      path: '/admin',
    });
    expect(result).toContain('test=value');
    expect(result).toContain('Max-Age=7200');
    expect(result).toContain('Path=/admin');
    expect(result).toContain('HttpOnly');
    expect(result).toContain('Secure');
    expect(result).toContain('SameSite=Strict');
  });

  it('omits undefined optional attributes', () => {
    const result = serializeCookie('test', 'value', {
      httpOnly: false,
      secure: false,
    });
    expect(result).not.toContain('HttpOnly');
    expect(result).not.toContain('Secure');
  });
});

describe('readCookie', () => {
  it('finds cookie by name', () => {
    const header = 'sessionId=abc123; other=xyz';
    expect(readCookie(header, 'sessionId')).toBe('abc123');
    expect(readCookie(header, 'other')).toBe('xyz');
  });

  it('returns null when cookie not found', () => {
    const header = 'foo=bar; baz=qux';
    expect(readCookie(header, 'missing')).toBeNull();
  });

  it('returns null for null header', () => {
    expect(readCookie(null, 'any')).toBeNull();
  });

  it('skips flag-style entries without =', () => {
    const header = 'HttpOnly; sessionId=abc123; Secure';
    expect(readCookie(header, 'sessionId')).toBe('abc123');
    expect(readCookie(header, 'HttpOnly')).toBeNull();
    expect(readCookie(header, 'Secure')).toBeNull();
  });

  it('handles whitespace around cookie pairs', () => {
    const header = 'foo=bar; sessionId=abc123; baz=qux';
    expect(readCookie(header, 'sessionId')).toBe('abc123');
  });

  it('handles empty header', () => {
    expect(readCookie('', 'any')).toBeNull();
  });

  it('returns first occurrence if duplicate names exist', () => {
    const header = 'name=first; name=second';
    expect(readCookie(header, 'name')).toBe('first');
  });
});

describe('sessionCookie', () => {
  it('produces expected name and path', () => {
    const result = sessionCookie('token123', 3600, false);
    expect(result).toContain('amc10_session=token123');
    expect(result).toContain('Path=/');
  });

  it('sets maxAge to provided seconds', () => {
    const result = sessionCookie('token', 7200, false);
    expect(result).toContain('Max-Age=7200');
  });

  it('includes httpOnly', () => {
    const result = sessionCookie('token', 3600, false);
    expect(result).toContain('HttpOnly');
  });

  it('includes sameSite=Lax', () => {
    const result = sessionCookie('token', 3600, false);
    expect(result).toContain('SameSite=Lax');
  });

  it('includes secure when true', () => {
    const result = sessionCookie('token', 3600, true);
    expect(result).toContain('Secure');
  });

  it('omits secure when false', () => {
    const result = sessionCookie('token', 3600, false);
    expect(result).not.toContain('Secure');
  });
});

describe('clearSessionCookie', () => {
  it('produces session cookie with name', () => {
    const result = clearSessionCookie(false);
    expect(result).toContain('amc10_session=');
  });

  it('sets Max-Age to 0', () => {
    const result = clearSessionCookie(false);
    expect(result).toContain('Max-Age=0');
  });

  it('sets path to /', () => {
    const result = clearSessionCookie(false);
    expect(result).toContain('Path=/');
  });

  it('includes httpOnly', () => {
    const result = clearSessionCookie(false);
    expect(result).toContain('HttpOnly');
  });

  it('includes sameSite=Lax', () => {
    const result = clearSessionCookie(false);
    expect(result).toContain('SameSite=Lax');
  });

  it('includes secure when true', () => {
    const result = clearSessionCookie(true);
    expect(result).toContain('Secure');
  });

  it('omits secure when false', () => {
    const result = clearSessionCookie(false);
    expect(result).not.toContain('Secure');
  });
});

describe('stateCookie', () => {
  it('produces expected name and path', () => {
    const result = stateCookie('state_xyz', 600, false);
    expect(result).toContain('amc10_oauth_state=state_xyz');
    expect(result).toContain('Path=/api/auth/google');
  });

  it('sets maxAge to provided seconds', () => {
    const result = stateCookie('state', 900, false);
    expect(result).toContain('Max-Age=900');
  });

  it('includes httpOnly', () => {
    const result = stateCookie('state', 600, false);
    expect(result).toContain('HttpOnly');
  });

  it('includes sameSite=Lax', () => {
    const result = stateCookie('state', 600, false);
    expect(result).toContain('SameSite=Lax');
  });

  it('includes secure when true', () => {
    const result = stateCookie('state', 600, true);
    expect(result).toContain('Secure');
  });

  it('omits secure when false', () => {
    const result = stateCookie('state', 600, false);
    expect(result).not.toContain('Secure');
  });
});
