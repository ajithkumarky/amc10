const COOKIE_NAME = 'amc10_session';
const STATE_COOKIE_NAME = 'amc10_oauth_state';

export interface CookieOptions {
  maxAge?: number;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export function serializeCookie(name: string, value: string, opts: CookieOptions = {}): string {
  const parts = [`${name}=${value}`];
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.path) parts.push(`Path=${opts.path}`);
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  return parts.join('; ');
}

export function readCookie(headerValue: string | null, name: string): string | null {
  if (!headerValue) return null;
  const cookies = headerValue.split(/;\s*/);
  for (const c of cookies) {
    const eq = c.indexOf('=');
    if (eq === -1) continue;
    if (c.slice(0, eq) === name) return c.slice(eq + 1);
  }
  return null;
}

export function sessionCookie(value: string, maxAgeSeconds: number, secure: boolean): string {
  return serializeCookie(COOKIE_NAME, value, {
    maxAge: maxAgeSeconds,
    path: '/',
    httpOnly: true,
    secure,
    sameSite: 'Lax',
  });
}

export function clearSessionCookie(secure: boolean): string {
  return serializeCookie(COOKIE_NAME, '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure,
    sameSite: 'Lax',
  });
}

export function stateCookie(value: string, maxAgeSeconds: number, secure: boolean): string {
  return serializeCookie(STATE_COOKIE_NAME, value, {
    maxAge: maxAgeSeconds,
    path: '/api/auth/google',
    httpOnly: true,
    secure,
    sameSite: 'Lax',
  });
}

export function readSessionCookie(req: Request): string | null {
  return readCookie(req.headers.get('cookie'), COOKIE_NAME);
}

export function readStateCookie(req: Request): string | null {
  return readCookie(req.headers.get('cookie'), STATE_COOKIE_NAME);
}
