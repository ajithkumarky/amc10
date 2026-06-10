# AMC10 — Plan 3: D1 Database + Schema + Health Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the persistent backend the rest of the app will need. Create a Cloudflare D1 database, define and apply the schema (`users`, `attempts`, `bookmarks`), wire a Pages Function that proves D1 is reachable from the deployed site, and add the small `lib/db.ts` helpers we'll lean on in Plans 4 and 5.

**Architecture decisions locked here:**
- **Static export stays.** No SSR. The site continues to ship as a static `out/` directory deployed to Cloudflare Pages. Backend logic lives in **Pages Functions** (`/functions/api/*.ts`), each a tiny Worker.
- **Bindings via `wrangler.toml`.** The D1 binding declaration sits in `wrangler.toml`; the production binding is managed in the Cloudflare dashboard after the first deploy. We'll also generate a local `.dev.vars` and `wrangler.local.toml` for local previews.
- **No ORM.** D1 takes prepared SQL via the runtime binding. With three tables, raw SQL is clearer than Drizzle for this codebase.
- **Auth deferred to Plan 4.** Plan 3 only needs `/api/health` returning `{ ok: true, now: <unix>, users: <count> }` to verify the binding works end-to-end. Plan 4 will add the OAuth Pages Functions.

**Tech additions:** Cloudflare D1 (production database), `@cloudflare/workers-types@4.x` (TypeScript types for the Pages Functions runtime). No npm runtime dependencies added.

**Parallelism:** Phases run serially. Within Phase A, the schema and migration scripts can be authored in parallel but applied serially.

---

## File structure changes

```
amc10/
├── functions/                              # NEW — Pages Functions
│   ├── _middleware.ts                      # NEW — CORS + json header helpers (optional shell)
│   └── api/
│       └── health.ts                       # NEW — GET /api/health: pings D1, returns counts
├── lib/
│   ├── db/
│   │   ├── types.ts                        # NEW — User, Attempt, Bookmark row types
│   │   └── queries.ts                      # NEW — small typed helpers (countUsers, upsertUser, ...)
│   └── (existing) cn.ts, topics.ts, content.ts
├── migrations/                             # NEW — D1 migration files
│   └── 0001_init.sql                       # NEW — users + attempts + bookmarks
├── wrangler.toml                           # MODIFY — add [[d1_databases]] block, add functions setting
└── (existing) app/, components/, etc.
```

Working directory: `C:/Users/ajith/play/amc10`. Run wrangler / npm commands from **PowerShell** (Git Bash misresolves `npx.cmd` on this machine).

---

## Phase A — D1 database creation & schema (serial)

### Task 1: Create the D1 database

**Files:** `wrangler.toml` (modify)

- [ ] **Step 1: Create the production D1 database**

Run (PowerShell):
```powershell
npx wrangler d1 create amc10
```
Expected output (the database UUID will differ):
```
✅ Successfully created DB 'amc10'

[[d1_databases]]
binding = "DB"
database_name = "amc10"
database_id = "00000000-aaaa-bbbb-cccc-000000000000"
```

**Capture the `database_id`** — Task 2 needs it.

- [ ] **Step 2: Wire the binding in `wrangler.toml`**

Read the current `wrangler.toml` first. Then replace its contents with this template, substituting the actual `database_id` from Step 1:

```toml
name = "amc10"
compatibility_date = "2026-01-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "out"

[[d1_databases]]
binding = "DB"
database_name = "amc10"
database_id = "<paste the id from Step 1 here>"

# Local-dev override: a local SQLite under .wrangler/state
# (wrangler creates this on first `wrangler pages dev` invocation)
```

- [ ] **Step 3: Commit**

```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add wrangler.toml
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "chore(d1): create amc10 D1 database, wire binding in wrangler.toml"
```

---

### Task 2: Author the schema migration

**Files:** Create `migrations/0001_init.sql`

- [ ] **Step 1: Create the migration file**

Create `migrations/0001_init.sql`:
```sql
-- 0001_init.sql
-- Initial schema for AMC10: users, attempts, bookmarks.
-- All timestamps are unix seconds (INTEGER).

CREATE TABLE IF NOT EXISTS users (
  id                    TEXT PRIMARY KEY,        -- UUID
  email                 TEXT NOT NULL UNIQUE,    -- Google email
  name                  TEXT,
  image_url             TEXT,
  created_at            INTEGER NOT NULL,
  last_activity_at      INTEGER NOT NULL,
  last_reminder_sent_at INTEGER
);

CREATE TABLE IF NOT EXISTS attempts (
  id              TEXT PRIMARY KEY,             -- UUID
  user_id         TEXT NOT NULL REFERENCES users(id),
  problem_slug    TEXT NOT NULL,
  topic           TEXT NOT NULL,                -- denormalized
  subtopic        TEXT,                         -- nullable for past-paper problems
  selected_answer TEXT NOT NULL,                -- "A".."E"
  is_correct      INTEGER NOT NULL,             -- 0 or 1
  mode            TEXT NOT NULL,                -- "learn" or "test"
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
```

- [ ] **Step 2: Commit**

```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add migrations/0001_init.sql
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(d1): initial schema migration (users, attempts, bookmarks)"
```

---

### Task 3: Apply the migration

**No new files.**

- [ ] **Step 1: Apply locally (creates .wrangler/state/d1)**

Run (PowerShell):
```powershell
npx wrangler d1 execute amc10 --local --file=migrations/0001_init.sql
```
Expected: "🌀 Mapping SQL input into an array of statements" → "✅ Successfully executed N commands".

- [ ] **Step 2: Apply to the production D1**

Run:
```powershell
npx wrangler d1 execute amc10 --remote --file=migrations/0001_init.sql
```
Expected: same success message, but against the production database. Wrangler will confirm "Executing on remote database amc10".

- [ ] **Step 3: Verify by listing tables remotely**

Run:
```powershell
npx wrangler d1 execute amc10 --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```
Expected output should include rows for `attempts`, `bookmarks`, `users` (and the internal `d1_migrations` / `sqlite_*` tables).

If it doesn't show all three, STOP and report BLOCKED with the actual output.

---

## Phase B — Pages Functions setup (serial)

### Task 4: Install Cloudflare Workers types & add db helpers

**Files:**
- Modify: `package.json`
- Create: `lib/db/types.ts`, `lib/db/queries.ts`

- [ ] **Step 1: Install Cloudflare Workers TypeScript types**

Run (PowerShell):
```powershell
npm install --save-dev @cloudflare/workers-types@4.20251101.0
```

- [ ] **Step 2: Reference Workers types in `tsconfig.json`**

Read `tsconfig.json` first. Add `"@cloudflare/workers-types"` to the `types` array (or create one if missing).

The relevant `compilerOptions` should include:
```json
"types": ["@cloudflare/workers-types"],
```

If a `types` field already exists, append `"@cloudflare/workers-types"` to it. Don't remove other entries.

- [ ] **Step 3: Create row types**

Create `lib/db/types.ts`:
```typescript
export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  image_url: string | null;
  created_at: number;
  last_activity_at: number;
  last_reminder_sent_at: number | null;
}

export interface AttemptRow {
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

export interface BookmarkRow {
  user_id: string;
  problem_slug: string;
  created_at: number;
}
```

- [ ] **Step 4: Create the query helpers**

Create `lib/db/queries.ts`:
```typescript
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
 * Bump last_activity_at on a known user id. No-op for unknown ids.
 */
export async function touchUser(db: D1Database, userId: string, now: number): Promise<void> {
  await db
    .prepare('UPDATE users SET last_activity_at = ? WHERE id = ?')
    .bind(now, userId)
    .run();
}
```

- [ ] **Step 5: Verify TypeScript still compiles**

Run (PowerShell):
```powershell
npx tsc --noEmit
```
Expected: no errors. If `D1Database` is unknown, the Cloudflare Workers types from Step 1 weren't picked up — check tsconfig.

- [ ] **Step 6: Commit**

```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add package.json package-lock.json tsconfig.json lib/db/
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(db): Workers types + row types + first query helpers"
```

---

### Task 5: Health endpoint as a Pages Function

**Files:**
- Create: `functions/api/health.ts`

**Context:** A Cloudflare Pages Function receives a `context` object with `env` (bindings) and `request`. We `export async function onRequestGet(context)` for GET requests at `/api/health`.

- [ ] **Step 1: Create the function**

Create `functions/api/health.ts`:
```typescript
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
```

- [ ] **Step 2: Commit**

```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add functions/api/health.ts
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(api): GET /api/health Pages Function pings D1"
```

---

## Phase C — Verify & deploy (serial)

### Task 6: Local verification

**No new files.**

- [ ] **Step 1: Build the static export**

Run (PowerShell): `npm run build`
Expected: build succeeds; route table unchanged from Plan 2 (all 13 routes). The new files under `functions/` and `lib/db/` are NOT included in the Next.js build output — Cloudflare picks them up separately during deploy.

If the build fails because TypeScript complains about `D1Database` in `functions/`, that's a `tsconfig` issue from Task 4: `functions/` may not be in the include path. Check `tsconfig.json` `include` — by default it covers `**/*.ts` so `functions/api/health.ts` SHOULD be type-checked. The compile should pass.

- [ ] **Step 2: Run the test suite (no regressions)**

Run: `npm test`
Expected: 26 tests pass.

- [ ] **Step 3: Local D1 quick sanity check**

Run (PowerShell):
```powershell
npx wrangler d1 execute amc10 --local --command "SELECT COUNT(*) AS n FROM users;"
```
Expected: `n = 0`. Confirms the local D1 has the schema and is queryable.

---

### Task 7: Deploy to Cloudflare Pages and bind D1 in the dashboard

**No new files.**

**IMPORTANT** — Pages Functions D1 bindings are configured in the **dashboard** for each Pages project. `wrangler.toml`'s `[[d1_databases]]` block IS read by `wrangler pages dev` for local previews but is NOT automatically applied to the production project on `wrangler pages deploy`. You need a one-time dashboard step.

- [ ] **Step 1: Deploy the static export + functions**

Run (PowerShell):
```powershell
npx wrangler pages deploy out --project-name=amc10 --branch=main --commit-dirty=true
```
Expected: deployment succeeds with a new preview URL. Wrangler should auto-detect `functions/` and bundle them as Pages Functions.

The output should mention "Compiled Worker successfully" or similar — that's the functions being built.

- [ ] **Step 2: Bind D1 in the Cloudflare dashboard (one-time)**

This step requires the **user** to do it; agentic execution should pause here and surface the instructions:

1. Open `dash.cloudflare.com` → Workers & Pages → click the `amc10` project.
2. Click **Settings** → **Functions** → **D1 database bindings** → **Add binding**.
3. Variable name: `DB`. Database: `amc10`. Click **Save**.
4. Trigger a re-deploy so the new binding takes effect: just push again — `npx wrangler pages deploy out --project-name=amc10 --branch=main --commit-dirty=true`.

Report status NEEDS_CONTEXT after running Step 1 with the deployed URL, and ask the user to complete the dashboard binding step. Once they confirm, re-run the deploy and proceed to Step 3.

- [ ] **Step 3: Smoke check `/api/health`**

After the re-deploy with the binding active:

```powershell
Invoke-WebRequest -Uri https://amc10-de2.pages.dev/api/health -UseBasicParsing | Select-Object -ExpandProperty Content
```
Expected: `{"ok":true,"now":<unix-seconds>,"users":0,"elapsed_ms":<some-ms>}`.

If `ok: false`, capture the error message and report. If the response is HTML (404 from Pages), the function wasn't deployed — investigate.

- [ ] **Step 4: Push commits**

```powershell
git push
```

- [ ] **Step 5: Final report**

- The deployed URL
- The body of `/api/health`
- Confirmation that all 13 pages from Plan 2 still serve 200
- Anything unusual

---

## Self-Review

- **Spec coverage for Plan 3's scope:** Cloudflare D1 production database ✓, schema for `users`/`attempts`/`bookmarks` ✓, indices ✓, D1 binding declared in `wrangler.toml` ✓, query helpers in `lib/db/` ✓, `/api/health` Pages Function ✓. Out of scope for Plan 3: Auth.js / OAuth, sign-in UI, user upsert on sign-in — all in Plan 4.
- **Placeholder scan:** Task 1 Step 2 has `<paste the id from Step 1 here>` — that's intentional, the user/agent runs `wrangler d1 create` first and substitutes. No other placeholders.
- **Type consistency:** `D1Database` comes from `@cloudflare/workers-types` (Task 4 Step 1); all query helpers take it as a parameter. `UserRow`/`AttemptRow`/`BookmarkRow` are declared once in `lib/db/types.ts` and reused.
- **Static-export safety:** the only build artifact is still `out/`. Pages Functions deploy separately, untouched by Next.js. Plans 1–2 keep working unchanged.
- **Idempotent migration:** `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` mean re-running the migration is safe. Good for both local re-runs and accidental remote re-applies.
- **Risk: Pages Functions tsconfig.** Default Next.js `tsconfig` doesn't exclude `functions/`, so `tsc --noEmit` will type-check those files. The `@cloudflare/workers-types` reference makes `D1Database` available globally. If the agent sees errors there, the fix is adding `"@cloudflare/workers-types"` to `compilerOptions.types`.
- **Risk: dashboard binding step.** This is the only out-of-band action — flagged explicitly in Task 7 Step 2. The agent should NOT skip it; if `/api/health` returns "DB is not defined" or similar, the binding hasn't been applied.
