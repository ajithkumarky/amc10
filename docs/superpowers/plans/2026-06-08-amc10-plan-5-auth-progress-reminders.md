# AMC10 — Plan 5: Auth + Recording + Progress + Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the loop. Add Google sign-in (via DIY OAuth in Pages Functions, no Auth.js), record practice attempts to D1 per user, render a real progress dashboard, and send an inactivity-reminder email when she hasn't practiced in 2 days. The static-export model is preserved; everything new lives in Pages Functions (for the auth + recording API) and a separate Worker (for the cron-driven reminder).

**Architecture decisions locked here:**
- **DIY OAuth.** A Pages Function pair: `/api/auth/google/login` → 302 to Google's authorize URL; `/api/auth/google/callback` → exchange code, verify allowlist, upsert user in D1, set a session cookie. Two additional functions: `/api/auth/logout` and `/api/auth/me`. ~150 lines total — simpler and cheaper than Auth.js v5 with a static export.
- **Session: HS256 JWT in an httpOnly cookie.** No DB-backed sessions. The cookie is named `amc10_session`, lives 30 days, and contains `{ sub: userId, email, name, image, iat, exp }`.
- **Allowlist via `ALLOWED_EMAILS` env var.** Comma-separated, lower-cased. Anyone not on the list sees a friendly "this site is private" page after Google sign-in.
- **Recording attempts via POST `/api/attempts`.** Session-cookie-gated. The client (`LearnSession`/`TestSession`) calls it on each submit if signed-in; silently degrades to client-only behavior if anonymous.
- **Progress dashboard via GET `/api/progress`.** Returns per-topic accuracy, streak, recent attempts, and weak subtopics. The `/progress` page becomes a client component that calls `/api/progress` and renders.
- **Reminder cron in a separate Worker.** Cloudflare Pages Functions don't support cron triggers, so we add `workers/cron-reminder/` with its own `wrangler.toml`. The Worker is bound to the same D1 database. It runs daily at 08:00 Pacific.
- **Email via Resend.** A single `Resend.emails.send(...)` per user matching the inactivity criteria.
- **Custom domain `amc10.kidiyoor.com`** attached after Plan 5 deploys cleanly.

**Tech additions:** None at runtime (no Auth.js, no Drizzle). Build-time: nothing new. Dev: `wrangler` already installed (used for cron deploys too).

**Env vars / secrets needed before deploy:**
- `AUTH_SECRET` — random 32-byte hex string (this plan generates it)
- `GOOGLE_CLIENT_ID` — from the user
- `GOOGLE_CLIENT_SECRET` — from the user
- `ALLOWED_EMAILS` — `ajithkumarky@gmail.com,<daughter's gmail>` (comma-separated, lower-case)
- `RESEND_API_KEY` — from the user (signup at resend.com)
- `PARENT_EMAIL` — `ajithkumarky@gmail.com`
- `SITE_URL` — `https://amc10.kidiyoor.com` (or `https://amc10-de2.pages.dev` until custom domain attached)

**Parallelism:** Phases serial. Within Phase A, the four auth functions touch disjoint files — could be parallelized; we serialize for git-index safety.

---

## File structure changes

```
amc10/
├── functions/
│   ├── _middleware.ts                       # NEW — session helper available to all functions
│   ├── api/
│   │   ├── auth/
│   │   │   ├── google/
│   │   │   │   ├── login.ts                 # NEW — GET, redirects to Google
│   │   │   │   └── callback.ts              # NEW — GET, exchanges code, sets cookie
│   │   │   ├── logout.ts                    # NEW — POST/GET, clears cookie
│   │   │   └── me.ts                        # NEW — GET, returns current user
│   │   ├── attempts.ts                      # NEW — POST, records one attempt
│   │   └── progress.ts                      # NEW — GET, returns per-user aggregates
│   └── health.ts                            # (existing from Plan 3)
├── lib/
│   ├── auth/                                # NEW
│   │   ├── session.ts                       # NEW — JWT sign/verify helpers
│   │   ├── cookies.ts                       # NEW — cookie read/write helpers
│   │   └── allowlist.ts                     # NEW — email allowlist check
│   ├── db/
│   │   └── queries.ts                       # MODIFY — add insertAttempt, listRecentAttempts, etc.
├── components/
│   ├── nav.tsx                              # MODIFY — fetch /api/auth/me, show user avatar
│   ├── progress/
│   │   └── progress-dashboard.tsx           # NEW — client component reading /api/progress
│   └── practice/
│       ├── learn-session.tsx                # MODIFY — call /api/attempts on submit
│       └── test-session.tsx                 # MODIFY — call /api/attempts on submit
├── app/
│   ├── signin/page.tsx                      # NEW — "Sign in with Google" landing
│   ├── progress/page.tsx                    # REWRITE (was stub) — render dashboard
│   └── (other pages unchanged)
├── workers/                                 # NEW — separate Worker for cron reminder
│   └── cron-reminder/
│       ├── src/index.ts                     # cron handler
│       ├── package.json
│       ├── tsconfig.json
│       └── wrangler.toml                    # cron schedule + D1 binding
└── .dev.vars.example                        # NEW — local-dev secret template
```

Working directory: `C:/Users/ajith/play/amc10`. PowerShell for npm/wrangler/git.

---

## Phase A — Auth library and Pages Functions

### Task 1: AUTH_SECRET + env var docs

**Files:**
- Create: `.dev.vars.example`, `lib/auth/allowlist.ts`

- [ ] **Step 1: Generate AUTH_SECRET**

Run (PowerShell):
```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$secret = ($bytes | ForEach-Object { $_.ToString('x2') }) -join ''
Write-Output "AUTH_SECRET=$secret"
```
Copy the value. We'll plug it in during deploy (Task 12), not commit it.

- [ ] **Step 2: Write `.dev.vars.example`** (documents every secret; no real values)

```
# Copy to .dev.vars (gitignored) for `wrangler pages dev`. Real values go in Cloudflare secrets in production.

AUTH_SECRET=replace_with_32_byte_hex
GOOGLE_CLIENT_ID=replace_with_google_oauth_client_id
GOOGLE_CLIENT_SECRET=replace_with_google_oauth_client_secret
ALLOWED_EMAILS=you@example.com,daughter@example.com
SITE_URL=http://localhost:8788
PARENT_EMAIL=parent@example.com
RESEND_API_KEY=re_xxx
```

`.dev.vars` is already covered by Wrangler's default ignore but ALSO add it to `.gitignore` explicitly.

- [ ] **Step 3: Update `.gitignore`**

Append:
```
.dev.vars
```

- [ ] **Step 4: Write `lib/auth/allowlist.ts`**

```typescript
export function parseAllowedEmails(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAllowed(allowed: Set<string>, email: string): boolean {
  return allowed.has(email.toLowerCase());
}
```

- [ ] **Step 5: Test allowlist**

Create `tests/lib/allowlist.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { parseAllowedEmails, isAllowed } from '@/lib/auth/allowlist';

describe('parseAllowedEmails', () => {
  it('parses comma-separated emails lowercased', () => {
    const s = parseAllowedEmails('A@example.com, b@EXAMPLE.com');
    expect(s.has('a@example.com')).toBe(true);
    expect(s.has('b@example.com')).toBe(true);
  });
  it('returns empty set when undefined', () => {
    expect(parseAllowedEmails(undefined).size).toBe(0);
  });
});

describe('isAllowed', () => {
  it('is case-insensitive', () => {
    const s = parseAllowedEmails('foo@bar.com');
    expect(isAllowed(s, 'FOO@bar.com')).toBe(true);
    expect(isAllowed(s, 'other@bar.com')).toBe(false);
  });
});
```

- [ ] **Step 6: Run tests + commit**

```powershell
npm test -- tests/lib/allowlist.test.ts
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add .gitignore .dev.vars.example lib/auth/allowlist.ts tests/lib/allowlist.test.ts
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "chore(auth): env var docs + allowlist helper"
```

---

### Task 2: Session JWT + cookie helpers

**Files:**
- Create: `lib/auth/session.ts`, `lib/auth/cookies.ts`
- Test: `tests/lib/session.test.ts`

**Note:** Cloudflare Workers' runtime supports the WebCrypto API. Use `crypto.subtle.importKey` + `crypto.subtle.sign` + `crypto.subtle.verify` for HS256. Do NOT use Node's `crypto` module — it's not available in the Workers runtime.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/session.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { signJwt, verifyJwt } from '@/lib/auth/session';

const SECRET = 'a'.repeat(64); // 32 bytes hex

describe('signJwt / verifyJwt', () => {
  it('round-trips a payload', async () => {
    const token = await signJwt({ sub: 'u_1', email: 'x@y.z' }, SECRET, 60);
    const claims = await verifyJwt<{ sub: string; email: string }>(token, SECRET);
    expect(claims?.sub).toBe('u_1');
    expect(claims?.email).toBe('x@y.z');
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signJwt({ sub: 'u_1' }, SECRET, 60);
    expect(await verifyJwt(token, 'b'.repeat(64))).toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await signJwt({ sub: 'u_1' }, SECRET, -10); // already expired
    expect(await verifyJwt(token, SECRET)).toBeNull();
  });
});
```

- [ ] **Step 2: Implement `lib/auth/session.ts`**

```typescript
function base64UrlEncode(bytes: Uint8Array): string {
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? 0 : 4 - (s.length % 4);
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function importKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder().encode(secret);
  return crypto.subtle.importKey('raw', enc, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

export async function signJwt<T extends object>(
  payload: T,
  secret: string,
  ttlSeconds: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = { ...payload, iat: now, exp: now + ttlSeconds };
  const enc = new TextEncoder();
  const headB = base64UrlEncode(enc.encode(JSON.stringify(header)));
  const bodyB = base64UrlEncode(enc.encode(JSON.stringify(body)));
  const signingInput = `${headB}.${bodyB}`;
  const key = await importKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(signingInput)));
  return `${signingInput}.${base64UrlEncode(sig)}`;
}

export async function verifyJwt<T extends object>(token: string, secret: string): Promise<T | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headB, bodyB, sigB] = parts;
  const enc = new TextEncoder();
  const signingInput = `${headB}.${bodyB}`;
  const key = await importKey(secret);
  const sig = base64UrlDecode(sigB);
  const valid = await crypto.subtle.verify('HMAC', key, sig, enc.encode(signingInput));
  if (!valid) return null;
  const body = JSON.parse(new TextDecoder().decode(base64UrlDecode(bodyB))) as T & {
    iat: number;
    exp: number;
  };
  if (body.exp < Math.floor(Date.now() / 1000)) return null;
  return body;
}
```

- [ ] **Step 3: Implement `lib/auth/cookies.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests + commit**

```powershell
npm test -- tests/lib/session.test.ts
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add lib/auth/session.ts lib/auth/cookies.ts tests/lib/session.test.ts
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(auth): JWT sign/verify (WebCrypto) + cookie helpers"
```

---

### Task 3: Google OAuth login function

**Files:** Create `functions/api/auth/google/login.ts`

```typescript
import { stateCookie } from '../../../../lib/auth/cookies';

interface Env {
  GOOGLE_CLIENT_ID: string;
  SITE_URL: string;
}

interface Context {
  request: Request;
  env: Env;
}

const SCOPE = 'openid email profile';
const AUTHORIZE = 'https://accounts.google.com/o/oauth2/v2/auth';

function randomState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
}

export const onRequestGet = async (ctx: Context): Promise<Response> => {
  const state = randomState();
  const params = new URLSearchParams({
    client_id: ctx.env.GOOGLE_CLIENT_ID,
    response_type: 'code',
    scope: SCOPE,
    redirect_uri: `${ctx.env.SITE_URL}/api/auth/google/callback`,
    state,
    access_type: 'online',
    prompt: 'select_account',
  });

  return new Response(null, {
    status: 302,
    headers: {
      location: `${AUTHORIZE}?${params.toString()}`,
      'set-cookie': stateCookie(state, 600, ctx.env.SITE_URL.startsWith('https://')),
    },
  });
};
```

Commit:
```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add functions/api/auth/google/login.ts
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(auth): GET /api/auth/google/login redirects to Google OAuth"
```

---

### Task 4: Google OAuth callback function

**Files:** Create `functions/api/auth/google/callback.ts`

```typescript
import { readStateCookie, sessionCookie, stateCookie } from '../../../../lib/auth/cookies';
import { parseAllowedEmails, isAllowed } from '../../../../lib/auth/allowlist';
import { signJwt } from '../../../../lib/auth/session';
import { upsertUser } from '../../../../lib/db/queries';

interface Env {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  SITE_URL: string;
  AUTH_SECRET: string;
  ALLOWED_EMAILS: string;
}

interface Context {
  request: Request;
  env: Env;
}

interface GoogleTokenResponse {
  id_token: string;
  access_token?: string;
}

interface IdTokenClaims {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

function decodeIdToken(idToken: string): IdTokenClaims | null {
  const parts = idToken.split('.');
  if (parts.length !== 3) return null;
  try {
    const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payloadJson) as IdTokenClaims;
  } catch {
    return null;
  }
}

function uuid(): string {
  const a = crypto.getRandomValues(new Uint8Array(16));
  a[6] = (a[6] & 0x0f) | 0x40;
  a[8] = (a[8] & 0x3f) | 0x80;
  const hex = Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function deniedHtml(siteUrl: string): Response {
  const body = `<!doctype html><html><head><meta charset="utf-8"><title>Sign-in not allowed</title>
  <style>body{background:#0c0d1a;color:#f0f4ff;font-family:system-ui;padding:60px;max-width:560px;margin:auto;}
  h1{color:#ff2e9c;letter-spacing:5px;}a{color:#00e5ff;}</style></head>
  <body><h1>NOT ON ALLOWLIST</h1><p>This is a private practice site. If you should have access, ask the owner to add your email to <code>ALLOWED_EMAILS</code>.</p>
  <p><a href="${siteUrl}/">Back to home</a></p></body></html>`;
  return new Response(body, { status: 403, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

export const onRequestGet = async (ctx: Context): Promise<Response> => {
  const url = new URL(ctx.request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = readStateCookie(ctx.request);
  const secure = ctx.env.SITE_URL.startsWith('https://');

  if (!code || !state || !cookieState || cookieState !== state) {
    return new Response('Invalid state', { status: 400 });
  }

  // Exchange code for tokens
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: ctx.env.GOOGLE_CLIENT_ID,
      client_secret: ctx.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${ctx.env.SITE_URL}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenResp.ok) {
    return new Response('Google token exchange failed', { status: 500 });
  }
  const tokens = (await tokenResp.json()) as GoogleTokenResponse;
  const claims = decodeIdToken(tokens.id_token);
  if (!claims?.email || !claims.email_verified) {
    return new Response('No verified email from Google', { status: 400 });
  }

  // Allowlist check
  const allowed = parseAllowedEmails(ctx.env.ALLOWED_EMAILS);
  if (!isAllowed(allowed, claims.email)) {
    return deniedHtml(ctx.env.SITE_URL);
  }

  // Upsert user
  const now = Math.floor(Date.now() / 1000);
  const userId = await upsertUser(ctx.env.DB, {
    id: uuid(),
    email: claims.email,
    name: claims.name ?? null,
    image_url: claims.picture ?? null,
    now,
  });

  // Issue session JWT (30 days)
  const ttl = 60 * 60 * 24 * 30;
  const jwt = await signJwt(
    {
      sub: userId,
      email: claims.email,
      name: claims.name ?? null,
      image: claims.picture ?? null,
    },
    ctx.env.AUTH_SECRET,
    ttl,
  );

  return new Response(null, {
    status: 302,
    headers: {
      location: `${ctx.env.SITE_URL}/`,
      'set-cookie': [
        sessionCookie(jwt, ttl, secure),
        stateCookie('', 0, secure), // clear state cookie
      ].join(', '), // NB: Cloudflare Workers merge multiple Set-Cookie headers; use the Headers API for reliability
    },
  });
};
```

**Important fix for multiple Set-Cookie headers:** The single `'set-cookie'` value with comma-joined cookies is unreliable. Use the `Headers` API explicitly:

Replace the final return with:
```typescript
const headers = new Headers({ location: `${ctx.env.SITE_URL}/` });
headers.append('set-cookie', sessionCookie(jwt, ttl, secure));
headers.append('set-cookie', stateCookie('', 0, secure));
return new Response(null, { status: 302, headers });
```

Commit:
```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add functions/api/auth/google/callback.ts
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(auth): Google OAuth callback (code exchange, allowlist, upsert, session cookie)"
```

---

### Task 5: Logout function + me function

**Files:**
- Create: `functions/api/auth/logout.ts`
- Create: `functions/api/auth/me.ts`

`functions/api/auth/logout.ts`:
```typescript
import { clearSessionCookie } from '../../../lib/auth/cookies';

interface Env {
  SITE_URL: string;
}

interface Context {
  request: Request;
  env: Env;
}

export const onRequestPost = async (ctx: Context): Promise<Response> => {
  const headers = new Headers({ location: `${ctx.env.SITE_URL}/` });
  headers.append('set-cookie', clearSessionCookie(ctx.env.SITE_URL.startsWith('https://')));
  return new Response(null, { status: 302, headers });
};

// Allow GET as a convenience for testing.
export const onRequestGet = onRequestPost;
```

`functions/api/auth/me.ts`:
```typescript
import { readSessionCookie } from '../../../lib/auth/cookies';
import { verifyJwt } from '../../../lib/auth/session';

interface Env {
  AUTH_SECRET: string;
}

interface Context {
  request: Request;
  env: Env;
}

interface SessionClaims {
  sub: string;
  email: string;
  name: string | null;
  image: string | null;
}

export const onRequestGet = async (ctx: Context): Promise<Response> => {
  const token = readSessionCookie(ctx.request);
  if (!token) return new Response(JSON.stringify({ user: null }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
  const claims = await verifyJwt<SessionClaims>(token, ctx.env.AUTH_SECRET);
  if (!claims) return new Response(JSON.stringify({ user: null }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
  return new Response(
    JSON.stringify({
      user: {
        id: claims.sub,
        email: claims.email,
        name: claims.name,
        image: claims.image,
      },
    }),
    {
      status: 200,
      headers: { 'content-type': 'application/json' },
    },
  );
};
```

Commit:
```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add functions/api/auth/logout.ts functions/api/auth/me.ts
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(auth): logout + /api/auth/me endpoints"
```

---

## Phase B — UI integration

### Task 6: `/signin` page and Nav user widget

**Files:**
- Create: `app/signin/page.tsx`
- Modify: `components/nav.tsx` (split into a client wrapper that fetches `/api/auth/me`)

- [ ] **Step 1: `app/signin/page.tsx`**

```typescript
import { Panel } from '@/components/ui/panel';

export const metadata = { title: 'Sign in — AMC // 10' };

export default function SignInPage() {
  return (
    <Panel kicker="ACCESS_GATE">
      <h1 className="font-display text-3xl tracking-widest text-cyber-ink">
        SIGN IN
      </h1>
      <p className="mt-2 text-sm text-cyber-mute">
        This site is private. Sign in with the Google account that's on the allowlist.
      </p>
      <div className="mt-6">
        <a
          href="/api/auth/google/login"
          className="inline-flex items-center gap-3 rounded-[3px] bg-cyber-chip px-4 py-2 text-[12px] font-bold uppercase tracking-widest text-white"
        >
          Sign in with Google
        </a>
      </div>
    </Panel>
  );
}
```

- [ ] **Step 2: Rework `components/nav.tsx` into a client component that fetches `/api/auth/me`**

Replace its current contents:
```typescript
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

export type NavSection = 'home' | 'learn' | 'practice' | 'papers' | 'stats';

const LINKS: { section: NavSection; label: string; href: string }[] = [
  { section: 'home', label: 'HOME', href: '/' },
  { section: 'learn', label: 'LEARN', href: '/learn' },
  { section: 'practice', label: 'PRACTICE', href: '/practice' },
  { section: 'papers', label: 'PAPERS', href: '/papers' },
  { section: 'stats', label: 'STATS', href: '/progress' },
];

interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

export function Nav({ active }: { active?: NavSection }) {
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let aborted = false;
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data: { user: User | null }) => {
        if (!aborted) {
          setUser(data.user);
          setLoaded(true);
        }
      })
      .catch(() => setLoaded(true));
    return () => {
      aborted = true;
    };
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-cyber-pink/80 px-6 py-3">
      <Link
        href="/"
        className="font-display text-2xl tracking-[5px] text-cyber-pink drop-shadow-[0_0_10px_rgba(255,46,156,0.5)]"
      >
        AMC // 10
      </Link>
      <nav className="hidden gap-4 text-[13px] font-semibold tracking-widest sm:flex">
        {LINKS.map((link) => (
          <Link
            key={link.section}
            href={link.href}
            className={cn(
              'px-1 py-0.5 text-cyber-mute hover:text-cyber-cyan',
              active === link.section && 'border-b border-cyber-cyan text-cyber-cyan',
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2 font-mono text-[11px] text-cyber-mute">
        {!loaded ? (
          <span>…</span>
        ) : user ? (
          <>
            {user.image ? (
              <img src={user.image} alt="" className="h-6 w-6 rounded-full" />
            ) : (
              <span className="inline-block h-6 w-6 rounded-full bg-cyber-chip" />
            )}
            <span>{(user.name ?? user.email).split(' ')[0]?.toUpperCase()}</span>
            <form action="/api/auth/logout" method="post" className="ml-2 inline">
              <button className="text-cyber-mute hover:text-cyber-cyan" type="submit">
                SIGN OUT
              </button>
            </form>
          </>
        ) : (
          <>
            <span className="inline-block h-6 w-6 rounded-full bg-cyber-chip" />
            <Link href="/signin" className="hover:text-cyber-cyan">SIGN IN</Link>
          </>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Update `components/nav.test.tsx`** — the "renders GUEST" assertion needs to become "renders … or SIGN IN" since the user starts in a loading state. Replace the third test with:
```typescript
it('shows a sign-in link when not authenticated', async () => {
  // global fetch returns no user
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ user: null }), { status: 200 })));
  render(<Nav active="home" />);
  // After the loading state, find SIGN IN
  await screen.findByText('SIGN IN');
  vi.unstubAllGlobals();
});
```

Adjust the existing tests if needed (the brand and link tests should still pass because they don't depend on the auth state).

- [ ] **Step 4: Run tests + commit**

```powershell
npm test
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add app/signin/page.tsx components/nav.tsx tests/components/nav.test.tsx
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(auth): /signin page + Nav reads /api/auth/me"
```

---

## Phase C — recordAttempt

### Task 7: POST `/api/attempts`

**Files:**
- Create: `functions/api/attempts.ts`
- Modify: `lib/db/queries.ts` — add `insertAttempt`

- [ ] **Step 1: Add `insertAttempt` to `lib/db/queries.ts`**

Append after `touchUser`:
```typescript
export interface AttemptInsert {
  id: string;
  user_id: string;
  problem_slug: string;
  topic: string;
  subtopic: string | null;
  selected_answer: string;
  is_correct: number;
  mode: string;
  time_seconds: number | null;
  created_at: number;
}

export async function insertAttempt(db: D1Database, a: AttemptInsert): Promise<void> {
  await db
    .prepare(
      `INSERT INTO attempts (id, user_id, problem_slug, topic, subtopic, selected_answer, is_correct, mode, time_seconds, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      a.id,
      a.user_id,
      a.problem_slug,
      a.topic,
      a.subtopic,
      a.selected_answer,
      a.is_correct,
      a.mode,
      a.time_seconds,
      a.created_at,
    )
    .run();
}
```

- [ ] **Step 2: Create `functions/api/attempts.ts`**

```typescript
import { readSessionCookie } from '../../lib/auth/cookies';
import { verifyJwt } from '../../lib/auth/session';
import { insertAttempt, touchUser } from '../../lib/db/queries';

interface Env {
  DB: D1Database;
  AUTH_SECRET: string;
}

interface Context {
  request: Request;
  env: Env;
}

interface SessionClaims {
  sub: string;
  email: string;
}

interface AttemptBody {
  problem_slug: string;
  topic: string;
  subtopic?: string | null;
  selected_answer: 'A' | 'B' | 'C' | 'D' | 'E';
  is_correct: boolean;
  mode: 'learn' | 'test';
  time_seconds?: number;
}

function uuid(): string {
  const a = crypto.getRandomValues(new Uint8Array(16));
  a[6] = (a[6] & 0x0f) | 0x40;
  a[8] = (a[8] & 0x3f) | 0x80;
  const hex = Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const onRequestPost = async (ctx: Context): Promise<Response> => {
  const token = readSessionCookie(ctx.request);
  if (!token) return json(401, { error: 'not signed in' });
  const claims = await verifyJwt<SessionClaims>(token, ctx.env.AUTH_SECRET);
  if (!claims) return json(401, { error: 'invalid session' });

  let body: AttemptBody;
  try {
    body = (await ctx.request.json()) as AttemptBody;
  } catch {
    return json(400, { error: 'invalid json' });
  }

  if (!body.problem_slug || !body.topic || !body.selected_answer || !body.mode) {
    return json(400, { error: 'missing fields' });
  }
  if (!['A', 'B', 'C', 'D', 'E'].includes(body.selected_answer)) {
    return json(400, { error: 'invalid selected_answer' });
  }
  if (!['learn', 'test'].includes(body.mode)) {
    return json(400, { error: 'invalid mode' });
  }

  const now = Math.floor(Date.now() / 1000);
  await insertAttempt(ctx.env.DB, {
    id: uuid(),
    user_id: claims.sub,
    problem_slug: body.problem_slug,
    topic: body.topic,
    subtopic: body.subtopic ?? null,
    selected_answer: body.selected_answer,
    is_correct: body.is_correct ? 1 : 0,
    mode: body.mode,
    time_seconds: typeof body.time_seconds === 'number' ? body.time_seconds : null,
    created_at: now,
  });
  await touchUser(ctx.env.DB, claims.sub, now);

  return json(201, { ok: true });
};
```

Commit:
```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add lib/db/queries.ts functions/api/attempts.ts
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(api): POST /api/attempts records an attempt (session-gated)"
```

---

### Task 8: Wire recordAttempt into LearnSession + TestSession

**Files:**
- Modify: `components/practice/learn-session.tsx`
- Modify: `components/practice/test-session.tsx`

Add a tiny helper inside each:
```typescript
async function recordAttempt(payload: {
  problem_slug: string;
  topic: string;
  subtopic: string;
  selected_answer: string;
  is_correct: boolean;
  mode: 'learn' | 'test';
  time_seconds?: number;
}) {
  try {
    await fetch('/api/attempts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // silent — anonymous or offline; the session continues.
  }
}
```

Wire it up:
- In `LearnSession`, when `submit()` runs, also call `recordAttempt` for the current problem.
- In `TestSession`, when `setFinished(true)` runs, fire `recordAttempt` for every problem (loop) in parallel via `Promise.all`. Don't `await` blocking the UI — let them fire and forget.

Both ignore the response. If the user is anonymous, the function returns 401 and the catch swallows it.

Commit:
```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add components/practice/
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(practice): record attempts when signed in (silent for guests)"
```

---

## Phase D — Progress dashboard

### Task 9: GET `/api/progress`

**Files:**
- Create: `functions/api/progress.ts`
- Modify: `lib/db/queries.ts` — add aggregate queries

Append to `lib/db/queries.ts`:
```typescript
export interface TopicAccuracy {
  topic: string;
  attempts: number;
  correct: number;
}

export async function topicAccuracy(db: D1Database, userId: string): Promise<TopicAccuracy[]> {
  const rs = await db
    .prepare(
      `SELECT topic, COUNT(*) AS attempts, SUM(is_correct) AS correct
       FROM attempts
       WHERE user_id = ?
       GROUP BY topic`,
    )
    .bind(userId)
    .all<{ topic: string; attempts: number; correct: number }>();
  return (rs.results ?? []).map((r) => ({
    topic: r.topic,
    attempts: r.attempts,
    correct: r.correct,
  }));
}

export interface SubtopicAccuracy {
  topic: string;
  subtopic: string | null;
  attempts: number;
  correct: number;
}

export async function subtopicAccuracy(db: D1Database, userId: string): Promise<SubtopicAccuracy[]> {
  const rs = await db
    .prepare(
      `SELECT topic, subtopic, COUNT(*) AS attempts, SUM(is_correct) AS correct
       FROM attempts
       WHERE user_id = ?
       GROUP BY topic, subtopic`,
    )
    .bind(userId)
    .all<{ topic: string; subtopic: string | null; attempts: number; correct: number }>();
  return (rs.results ?? []).map((r) => r);
}

export async function recentDailyAttempts(
  db: D1Database,
  userId: string,
  days: number,
): Promise<{ date: string; count: number }[]> {
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  const rs = await db
    .prepare(
      `SELECT date(created_at, 'unixepoch') AS date, COUNT(*) AS count
       FROM attempts
       WHERE user_id = ? AND created_at >= ?
       GROUP BY date(created_at, 'unixepoch')
       ORDER BY date`,
    )
    .bind(userId, since)
    .all<{ date: string; count: number }>();
  return rs.results ?? [];
}
```

`functions/api/progress.ts`:
```typescript
import { readSessionCookie } from '../../lib/auth/cookies';
import { verifyJwt } from '../../lib/auth/session';
import {
  topicAccuracy,
  subtopicAccuracy,
  recentDailyAttempts,
} from '../../lib/db/queries';

interface Env {
  DB: D1Database;
  AUTH_SECRET: string;
}

interface Context {
  request: Request;
  env: Env;
}

export const onRequestGet = async (ctx: Context): Promise<Response> => {
  const token = readSessionCookie(ctx.request);
  if (!token) return new Response(JSON.stringify({ error: 'not signed in' }), { status: 401 });
  const claims = await verifyJwt<{ sub: string }>(token, ctx.env.AUTH_SECRET);
  if (!claims) return new Response(JSON.stringify({ error: 'invalid session' }), { status: 401 });

  const [byTopic, bySubtopic, byDay] = await Promise.all([
    topicAccuracy(ctx.env.DB, claims.sub),
    subtopicAccuracy(ctx.env.DB, claims.sub),
    recentDailyAttempts(ctx.env.DB, claims.sub, 30),
  ]);

  return new Response(
    JSON.stringify({ byTopic, bySubtopic, byDay }),
    {
      status: 200,
      headers: { 'content-type': 'application/json' },
    },
  );
};
```

Commit:
```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add lib/db/queries.ts functions/api/progress.ts
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(api): GET /api/progress returns per-user aggregates"
```

---

### Task 10: `/progress` dashboard page

**Files:**
- Create: `components/progress/progress-dashboard.tsx`
- Modify: `app/progress/page.tsx`

`components/progress/progress-dashboard.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { Panel } from '@/components/ui/panel';
import { Stat } from '@/components/ui/stat';
import { Chip } from '@/components/ui/chip';
import { TOPICS } from '@/lib/topics';

interface ProgressData {
  byTopic: { topic: string; attempts: number; correct: number }[];
  bySubtopic: { topic: string; subtopic: string | null; attempts: number; correct: number }[];
  byDay: { date: string; count: number }[];
}

function computeStreak(byDay: { date: string; count: number }[]): number {
  if (byDay.length === 0) return 0;
  const set = new Set(byDay.map((d) => d.date));
  let streak = 0;
  const cursor = new Date();
  // Normalize to UTC date string YYYY-MM-DD
  while (true) {
    const ds = cursor.toISOString().slice(0, 10);
    if (set.has(ds)) {
      streak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    } else break;
  }
  return streak;
}

export function ProgressDashboard() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/progress')
      .then(async (r) => {
        if (r.status === 401) {
          setError('signin');
          return null;
        }
        return r.json();
      })
      .then((d: ProgressData | null) => {
        if (d) setData(d);
      })
      .catch(() => setError('network'));
  }, []);

  if (error === 'signin') {
    return (
      <Panel kicker="ACCESS_GATE">
        <h2 className="font-display text-2xl tracking-widest text-cyber-pink">SIGN IN REQUIRED</h2>
        <p className="mt-2 text-sm text-cyber-mute">
          Progress unlocks when you sign in and record your first attempt.
        </p>
        <div className="mt-4">
          <Chip href="/signin">SIGN IN</Chip>
        </div>
      </Panel>
    );
  }

  if (!data) {
    return <Panel kicker="LOADING"><p className="text-sm text-cyber-mute">Loading run data…</p></Panel>;
  }

  const totalAttempts = data.byTopic.reduce((s, t) => s + t.attempts, 0);
  const totalCorrect = data.byTopic.reduce((s, t) => s + t.correct, 0);
  const overallAccuracy = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const streak = computeStreak(data.byDay);

  return (
    <div className="space-y-6">
      <Panel kicker="DASHBOARD" title="">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat value={String(streak)} label="Day Streak" />
          <Stat value={`${overallAccuracy}%`} label="Accuracy" accentClass="text-cyber-cyan" />
          <Stat value={String(totalCorrect)} label="Correct" />
          <Stat value={String(totalAttempts)} label="Attempts" accentClass="text-cyber-amber" />
        </div>
      </Panel>

      <Panel kicker="BY_TOPIC">
        <div className="space-y-3">
          {TOPICS.map((t) => {
            const row = data.byTopic.find((r) => r.topic === t.slug);
            const attempts = row?.attempts ?? 0;
            const correct = row?.correct ?? 0;
            const pct = attempts ? Math.round((correct / attempts) * 100) : 0;
            return (
              <div key={t.slug}>
                <div className="flex items-center justify-between">
                  <Link href={`/learn/${t.slug}` as Route}>
                    <span className="font-display text-base tracking-widest" style={{ color: t.accent }}>
                      {t.name.toUpperCase()}
                    </span>
                  </Link>
                  <span className="font-mono text-[11px] text-cyber-cyan">
                    {correct} / {attempts} &middot; {pct}%
                  </span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-sm bg-[#2a1a4a]">
                  <div
                    className="h-full"
                    style={{ width: `${pct}%`, backgroundImage: `linear-gradient(90deg, ${t.accent}, #00e5ff)` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
```

Rewrite `app/progress/page.tsx`:
```typescript
import { ProgressDashboard } from '@/components/progress/progress-dashboard';

export const metadata = { title: 'Progress — AMC // 10' };

export default function ProgressPage() {
  return <ProgressDashboard />;
}
```

Commit:
```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add components/progress/progress-dashboard.tsx app/progress/page.tsx
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(progress): live dashboard reads /api/progress"
```

---

## Phase E — Inactivity reminders (separate Worker)

### Task 11: Create the cron-reminder Worker

**Files:**
- Create: `workers/cron-reminder/package.json`, `wrangler.toml`, `tsconfig.json`, `src/index.ts`
- Modify: root `.gitignore` (add `workers/*/node_modules`)

- [ ] **Step 1: `workers/cron-reminder/package.json`**

```json
{
  "name": "amc10-cron-reminder",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "deploy": "wrangler deploy",
    "dev": "wrangler dev"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20260608.1",
    "typescript": "^5.6.3",
    "wrangler": "^3.86.1"
  }
}
```

- [ ] **Step 2: `workers/cron-reminder/wrangler.toml`** (substitute the D1 UUID)

```toml
name = "amc10-cron-reminder"
main = "src/index.ts"
compatibility_date = "2026-01-01"
compatibility_flags = ["nodejs_compat"]

# Daily at 15:00 UTC (08:00 Pacific approximately during PDT, 07:00 during PST)
[triggers]
crons = ["0 15 * * *"]

[[d1_databases]]
binding = "DB"
database_name = "amc10"
database_id = "31209681-39cf-48af-8d7c-db672ebe9a94"
```

- [ ] **Step 3: `workers/cron-reminder/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["@cloudflare/workers-types"],
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 4: `workers/cron-reminder/src/index.ts`**

```typescript
interface Env {
  DB: D1Database;
  RESEND_API_KEY: string;
  PARENT_EMAIL: string;
  SITE_URL: string;
}

interface DueUser {
  id: string;
  email: string;
  name: string | null;
  last_activity_at: number;
}

const INACTIVITY_SECONDS = 2 * 86400;

async function sendReminder(env: Env, user: DueUser): Promise<boolean> {
  const firstName = user.name?.split(' ')[0] ?? 'there';
  const subject = `Time to practice — AMC // 10`;
  const html = `<p>Hey ${firstName}, you haven't practiced AMC10 in 2 days.</p>
                <p><a href="${env.SITE_URL}/practice">Jump back in →</a></p>`;
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: 'AMC10 <noreply@amc10.kidiyoor.com>',
      to: [user.email, env.PARENT_EMAIL],
      subject,
      html,
    }),
  });
  return resp.ok;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const cutoff = now - INACTIVITY_SECONDS;
    const rs = await env.DB
      .prepare(
        `SELECT id, email, name, last_activity_at
         FROM users
         WHERE last_activity_at < ?
         AND (last_reminder_sent_at IS NULL OR last_reminder_sent_at < last_activity_at)`,
      )
      .bind(cutoff)
      .all<DueUser>();

    const users: DueUser[] = rs.results ?? [];
    for (const u of users) {
      const ok = await sendReminder(env, u);
      if (ok) {
        await env.DB
          .prepare('UPDATE users SET last_reminder_sent_at = ? WHERE id = ?')
          .bind(now, u.id)
          .run();
      }
    }
  },
};
```

- [ ] **Step 5: Update root `.gitignore`** to skip the sub-project's node_modules:

Append:
```
workers/*/node_modules
```

- [ ] **Step 6: Install + commit**

```powershell
Push-Location workers/cron-reminder
npm install
Pop-Location
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add workers/cron-reminder/ .gitignore
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(cron): inactivity reminder Worker (Resend, daily schedule)"
```

---

## Phase F — Deploy + secrets + verify

### Task 12: Set secrets and deploy

**This is where the user provides credentials.**

- [ ] **Step 1: Set secrets on the Pages project**

User provides:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `AUTH_SECRET` (generated in Task 1 Step 1)
- `ALLOWED_EMAILS` (e.g. `ajithkumarky@gmail.com,anyak@gmail.com`)
- `SITE_URL` (start with `https://amc10-de2.pages.dev`; switch to `https://amc10.kidiyoor.com` after Task 14)

Run for each (PowerShell — wrangler prompts for the value):
```powershell
npx wrangler pages secret put GOOGLE_CLIENT_ID --project-name=amc10
npx wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name=amc10
npx wrangler pages secret put AUTH_SECRET --project-name=amc10
npx wrangler pages secret put ALLOWED_EMAILS --project-name=amc10
npx wrangler pages secret put SITE_URL --project-name=amc10
```

- [ ] **Step 2: Build + deploy Pages**

```powershell
npm run build
npx wrangler pages deploy out --project-name=amc10 --branch=main --commit-dirty=true
```

- [ ] **Step 3: Deploy the cron Worker**

User provides:
- `RESEND_API_KEY`
- `PARENT_EMAIL`
- `SITE_URL`

```powershell
Push-Location workers/cron-reminder
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put PARENT_EMAIL
npx wrangler secret put SITE_URL
npm run deploy
Pop-Location
```

- [ ] **Step 4: Smoke-test the auth flow end-to-end**

In a browser:
1. Open `https://amc10-de2.pages.dev/signin`
2. Click "Sign in with Google"
3. Pick the daughter's account (or yours)
4. Should land back on `/` with the avatar in the top nav
5. Visit `/practice/learn?count=5` — answer one problem, submit
6. Visit `/progress` — should show "1 attempts" in stats

If steps fail, capture the response body and the wrangler logs (`npx wrangler pages deployment tail`).

- [ ] **Step 5: Verify cron is registered**

```powershell
Push-Location workers/cron-reminder
npx wrangler triggers list
Pop-Location
```
Should print the `0 15 * * *` schedule.

To dry-run the cron immediately (instead of waiting until 15:00 UTC):
```powershell
Push-Location workers/cron-reminder
npx wrangler cron trigger --schedule "0 15 * * *"
Pop-Location
```
(That command is illustrative; the actual `wrangler cron` subcommand may vary by version.) Alternative: temporarily change `INACTIVITY_SECONDS` to a few seconds, set your `last_activity_at` to long ago, redeploy, wait for the cron, then revert.

- [ ] **Step 6: Push commits**

```powershell
git push
```

---

### Task 13: Attach `amc10.kidiyoor.com` custom domain

- [ ] **Step 1:** Dashboard → Workers & Pages → `amc10` → Custom domains → Set up a custom domain → enter `amc10.kidiyoor.com` → Activate. SSL within ~1 minute.

- [ ] **Step 2:** Update `SITE_URL` secret on the Pages project to `https://amc10.kidiyoor.com` (the OAuth redirect_uri uses this — the Google OAuth client must have this URL whitelisted in its Authorized redirect URIs).

- [ ] **Step 3:** Also update `SITE_URL` on the cron Worker so the reminder email link points to the new URL.

- [ ] **Step 4:** Re-deploy Pages so the new secret takes effect:
```powershell
npx wrangler pages deploy out --project-name=amc10 --branch=main --commit-dirty=true
```

- [ ] **Step 5:** Final smoke test on `https://amc10.kidiyoor.com/`.

---

## Self-Review

- **Spec coverage:** Google sign-in via OAuth ✓, email allowlist ✓, JWT session ✓, recordAttempt ✓, progress dashboard ✓, inactivity-reminder cron via Resend ✓, custom domain ✓. Out of scope: spaced repetition, leaderboards, mobile app, admin UI — all called out in the original spec as non-goals.
- **Placeholder scan:** No TBDs in code. Two intentional placeholders are surfaced as user-provided values: OAuth credentials (Task 12 Step 1) and Resend API key (Task 12 Step 3). These are documented, not hidden.
- **Type consistency:** `SessionClaims`, `AttemptInsert`, `TopicAccuracy`, `SubtopicAccuracy`, `User`, `ProgressData` are each defined once and used consistently.
- **Static export safety:** all new routes are static; the new behavior comes from Pages Functions (server-side) and client components hydrating against them. The build still produces a clean `out/` directory.
- **Risk: cron tooling.** Cloudflare's CLI `wrangler cron trigger` exists but its exact syntax varies. The cron handler itself is reliable; manual-fire commands are convenience-only. The cron will fire daily as configured regardless of our ability to manually trigger it.
- **Risk: OAuth redirect_uri mismatch.** The Google OAuth client must have BOTH `https://amc10-de2.pages.dev/api/auth/google/callback` AND `https://amc10.kidiyoor.com/api/auth/google/callback` in its Authorized redirect URIs. If only one is set, attempting to sign in on the missing URL will fail with a `redirect_uri_mismatch` error.
- **Risk: JWT secret rotation.** If `AUTH_SECRET` is ever changed, all existing session cookies become invalid and users must sign in again. That's acceptable; just be aware.
- **Risk: Resend rate limits.** The cron loops users sequentially (`for (const u of users)`) and `await`s each `sendReminder`. For a tiny user base (1–5 users), this is fine. If the user list grows beyond ~50, batch with `Promise.all` and a small concurrency limiter.

---

## What the user (you) needs to do before Phase F can run

1. **Google Cloud Console** — create OAuth 2.0 Client ID (Web application), with these **Authorized redirect URIs**:
   - `https://amc10-de2.pages.dev/api/auth/google/callback`
   - `https://amc10.kidiyoor.com/api/auth/google/callback`
   - `http://localhost:8788/api/auth/google/callback` (for local `wrangler pages dev`)
2. **Resend** — sign up at resend.com, verify a sending domain (or use the sandbox sender they give you), create an API key. If you want to send from `noreply@amc10.kidiyoor.com`, you'll need to add Resend's SPF/DKIM records to kidiyoor.com on Cloudflare DNS (Resend gives you the records when you add the domain).
3. **AUTH_SECRET** — I generate this in Task 1 Step 1 (PowerShell one-liner).
4. **Allowlist** — decide which emails get in. Just yours + your daughter's to start.

After that, I run Tasks 1–11 without your involvement, then ping you when Phase F is ready and we set the secrets together.
