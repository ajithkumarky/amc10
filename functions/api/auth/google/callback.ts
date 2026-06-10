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
  let tokens: GoogleTokenResponse;
  try {
    tokens = (await tokenResp.json()) as GoogleTokenResponse;
  } catch {
    return new Response('Malformed response from Google', { status: 500 });
  }
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
    id: crypto.randomUUID(),
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

  const headers = new Headers({ location: `${ctx.env.SITE_URL}/` });
  headers.append('set-cookie', sessionCookie(jwt, ttl, secure));
  headers.append('set-cookie', stateCookie('', 0, secure));
  return new Response(null, { status: 302, headers });
};
