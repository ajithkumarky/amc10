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

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const onRequestGet = async (ctx: Context): Promise<Response> => {
  const token = readSessionCookie(ctx.request);
  if (!token) return json(401, { error: 'not signed in' });
  const claims = await verifyJwt<{ sub: string }>(token, ctx.env.AUTH_SECRET);
  if (!claims) return json(401, { error: 'invalid session' });

  const [byTopic, bySubtopic, byDay] = await Promise.all([
    topicAccuracy(ctx.env.DB, claims.sub),
    subtopicAccuracy(ctx.env.DB, claims.sub),
    recentDailyAttempts(ctx.env.DB, claims.sub, 30),
  ]);

  return json(200, { byTopic, bySubtopic, byDay });
};
