import { countUsers } from '../../lib/db/queries';

interface Env {
  DB: D1Database;
}

interface Context {
  request: Request;
  env: Env;
}

export const onRequestGet = async (context: Context): Promise<Response> => {
  const startedAt = Date.now();
  try {
    const users = await countUsers(context.env.DB);
    const elapsedMs = Date.now() - startedAt;
    return new Response(
      JSON.stringify({
        ok: true,
        now: Math.floor(Date.now() / 1000),
        users,
        elapsed_ms: elapsedMs,
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      },
    );
  }
};
