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

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
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
    id: crypto.randomUUID(),
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
