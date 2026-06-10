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
