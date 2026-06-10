import type { UserRow } from './types';

/**
 * Count of users currently in the table. Used by /api/health.
 */
export async function countUsers(db: D1Database): Promise<number> {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>();
  return row?.n ?? 0;
}

/**
 * Look up a user by email. Returns null if not found.
 */
export async function getUserByEmail(
  db: D1Database,
  email: string,
): Promise<UserRow | null> {
  const row = await db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first<UserRow>();
  return row ?? null;
}

/**
 * Insert a new user or update name/image on an existing one. Bumps last_activity_at.
 * Returns the user id (newly generated or existing).
 */
export async function upsertUser(
  db: D1Database,
  args: {
    id: string;        // caller passes a UUID — used only on insert
    email: string;
    name: string | null;
    image_url: string | null;
    now: number;       // unix seconds
  },
): Promise<string> {
  const existing = await getUserByEmail(db, args.email);
  if (existing) {
    await db
      .prepare(
        `UPDATE users
         SET name = ?, image_url = ?, last_activity_at = ?
         WHERE id = ?`,
      )
      .bind(args.name, args.image_url, args.now, existing.id)
      .run();
    return existing.id;
  }
  await db
    .prepare(
      `INSERT INTO users (id, email, name, image_url, created_at, last_activity_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(args.id, args.email, args.name, args.image_url, args.now, args.now)
    .run();
  return args.id;
}

/**
 * Bump last_activity_at on a known user id.
 */
export async function touchUser(db: D1Database, userId: string, now: number): Promise<void> {
  await db
    .prepare('UPDATE users SET last_activity_at = ? WHERE id = ?')
    .bind(now, userId)
    .run();
}

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

/**
 * Insert a single attempt row. Caller is responsible for generating id and created_at.
 */
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

export interface TopicAccuracy {
  topic: string;
  attempts: number;
  correct: number;
}

/**
 * Per-topic attempt counts and correct counts for a given user.
 */
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
    correct: r.correct ?? 0,
  }));
}

export interface SubtopicAccuracy {
  topic: string;
  subtopic: string | null;
  attempts: number;
  correct: number;
}

/**
 * Per-subtopic attempt counts and correct counts for a given user.
 */
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
  return (rs.results ?? []).map((r) => ({
    topic: r.topic,
    subtopic: r.subtopic,
    attempts: r.attempts,
    correct: r.correct ?? 0,
  }));
}

/**
 * Daily attempt counts for the last N days for a given user, ordered by date.
 */
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
