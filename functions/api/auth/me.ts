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
