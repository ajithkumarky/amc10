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
