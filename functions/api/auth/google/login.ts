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
