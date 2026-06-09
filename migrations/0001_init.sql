-- 0001_init.sql
-- Initial schema for AMC10: users, attempts, bookmarks.
-- All timestamps are unix seconds (INTEGER).

CREATE TABLE IF NOT EXISTS users (
  id                    TEXT PRIMARY KEY,
  email                 TEXT NOT NULL UNIQUE,
  name                  TEXT,
  image_url             TEXT,
  created_at            INTEGER NOT NULL,
  last_activity_at      INTEGER NOT NULL,
  last_reminder_sent_at INTEGER
);

CREATE TABLE IF NOT EXISTS attempts (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  problem_slug    TEXT NOT NULL,
  topic           TEXT NOT NULL,
  subtopic        TEXT,
  selected_answer TEXT NOT NULL,
  is_correct      INTEGER NOT NULL,
  mode            TEXT NOT NULL,
  time_seconds    INTEGER,
  created_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attempts_user_created
  ON attempts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_attempts_user_problem
  ON attempts(user_id, problem_slug);

CREATE TABLE IF NOT EXISTS bookmarks (
  user_id      TEXT NOT NULL REFERENCES users(id),
  problem_slug TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  PRIMARY KEY (user_id, problem_slug)
);
