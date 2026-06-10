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
