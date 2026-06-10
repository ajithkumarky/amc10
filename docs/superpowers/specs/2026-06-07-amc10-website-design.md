# AMC10 Practice Website — Design Spec

**Date:** 2026-06-07
**Status:** Draft for review

## Purpose

A private, account-gated AMC10 practice website for a teenager (and optionally a few invited friends). It teaches concepts, lets her practice problems with immediate or test-style feedback, and reviews real past AMC10 papers — all wrapped in a "Cyber Anime / Persona-style" UI to keep it engaging. Progress is tracked per user and a passive reminder email is sent if she hasn't practiced in two days.

## Non-goals (explicitly out of scope for V1)

- Spaced repetition / SRS scheduling
- Leaderboards or multi-user comparisons
- A native mobile app (the web app is responsive)
- An admin UI (content is authored as MDX files in the repo)
- Email notifications beyond the inactivity reminder
- Payments / subscriptions
- Per-concept-page "read" tracking (the `last_activity_at` timestamp on any page visit is sufficient signal for the inactivity reminder)

## Users & access model

- **Primary user:** the owner's teenage daughter. Signs in with Google.
- **Possible secondary users:** a handful of invited friends or classmates.
- **Access control:** an email allowlist (`ALLOWED_EMAILS` env var, comma-separated). Any Google account whose email is not on the list is rejected at sign-in with a friendly "this site is private" page.
- **Public surface (no login required):** concept pages (`/learn/*`) and past-paper review pages (`/papers/*`). Reading math content does not require an account.
- **Login-gated:** `/practice/*` (both Learn and Test modes), `/progress`, recording any attempt, and bookmarks.

## Tech stack

- **Framework:** Next.js 15 (App Router), React Server Components.
- **Content authoring:** MDX via `@next/mdx`, with `remark-math` and `rehype-katex` for LaTeX math. Math is rendered server-side; KaTeX CSS is shipped once.
- **Styling:** Tailwind CSS. shadcn/ui primitives (copy-paste, no runtime lock-in).
- **Deployment:** Cloudflare Pages with `@cloudflare/next-on-pages` adapter (full SSR + API routes on the Workers runtime).
- **Database:** Cloudflare D1 (SQLite at the edge).
- **Server endpoints:** Next.js Server Actions and route handlers running on Pages Functions.
- **Auth:** Auth.js (NextAuth) v5 with the Google provider, JWT session cookies (no DB session table).
- **Email:** Resend, called from a Cloudflare Cron Trigger.
- **Local dev:** `npm run dev`, plus Wrangler for local D1 (`wrangler d1`).

## Visual design language

The UI follows a single coherent "Cyber Anime / Persona" theme — modeled on Persona 5 / Honkai-style game HUDs:

- **Palette:**
  - Background base: deep navy/violet gradient (`#0c0d1a` → `#1a0a2a` → `#0a1a2a`).
  - Neon accents: pink `#ff2e9c` (primary CTA, brand) and cyan `#00e5ff` (info, links, active nav).
  - Highlight: amber `#ffd866` (math expressions in problem statements).
  - Surface: translucent violet panels (`rgba(20, 8, 40, 0.7)`) with a `#6b1eff` outline.
- **Geometry:** panels use clipped corners (CSS `clip-path` polygon with 8–10 px notches) for the angled HUD look.
- **Typography:**
  - Display headings: **Bebas Neue** (wide-tracked uppercase).
  - Body: **Rajdhani** (clean sans, slightly condensed).
  - Status text / kickers / numbers: **JetBrains Mono**.
  - Math: rendered by KaTeX.
- **Surface motifs:** faint grid lines in the background (1 px lines on a 24 px grid in low-opacity pink and cyan).
- **Language:** light gamified framing — "Mission Brief," "Daily Run," "Rank," "Streak," "XP" — used as decoration around the math, not as a replacement for clear math instruction. The math content itself is plain and academic.
- **Accent per topic** (used sparingly in topic tiles and progress bars):
  - Algebra: pink
  - Geometry: cyan
  - Number Theory: violet
  - Counting & Probability: amber
- **Accessibility:** all text/background pairs meet WCAG AA contrast despite the dark theme; KaTeX math has a light foreground regardless of theme; focus rings use the cyan accent.

A reference mockup is preserved at `.superpowers/brainstorm/<session>/content/cyber-fidelity.html` and should be treated as the visual ground truth.

## Information architecture

```
/                          Home — welcome panel + her stats + topic tiles
/signin                    Google sign-in landing
/learn                     Learn hub — 4 topic cards (public)
/learn/[topic]             Topic overview + list of subtopic cards (public)
/learn/[topic]/[subtopic]  Concept page (MDX) + "Practice this section" button (public)
/practice                  Practice hub — pick Learn/Test mode, filters (login required)
/practice/learn            Learn-mode session — one problem at a time, immediate feedback
/practice/test             Test-mode session — set of problems, score at end
/papers                    Past papers index — years × {10A, 10B}, with her % solved
/papers/[year]/[ab]        Single past paper — review or "take as test" toggle
/progress                  Dashboard — accuracy by topic/subtopic, streak, weak areas
```

Header navigation: `HOME · LEARN · PRACTICE · PAPERS · STATS · <avatar>`.

## Content organization

**Topics (4):** Algebra, Geometry, Number Theory, Counting & Probability.

**Subtopics:** each topic page lists 5–8 subtopic cards. Initial subtopic set (can grow over time):

- *Algebra:* Linear Equations & Inequalities, Quadratics, Polynomials, Exponents & Logarithms, Functions, Sequences & Series, Word Problems.
- *Geometry:* Triangles, Circles, Quadrilaterals & Polygons, Coordinate Geometry, 3D / Solids, Similarity & Congruence, Area & Perimeter, Trigonometry basics.
- *Number Theory:* Divisibility & Primes, Modular Arithmetic, GCD/LCM, Number Bases, Digit Problems, Diophantine Equations.
- *Counting & Probability:* Counting Principles, Permutations & Combinations, Pigeonhole, Probability Basics, Expected Value, Geometric Probability.

Subtopic names are illustrative; final list is finalized during implementation.

## Content storage

All concept and problem content lives as **MDX files in the repo**. D1 stores only user-generated data.

```
content/
  concepts/
    <topic>/index.mdx            # topic overview (e.g. content/concepts/algebra/index.mdx)
    <topic>/<subtopic>.mdx       # subtopic concept page
  problems/
    <topic>/<subtopic>/pNNN.mdx  # original practice problems
  papers/
    <year>-<ab>/                 # e.g. 2019-10A
      meta.json                  # year, contest, AoPS link, date
      pNN.mdx                    # one file per problem (p01..p25)
```

**Problem MDX frontmatter:**

```yaml
---
slug: algebra/quadratics/p001       # stable identifier — never reused
topic: algebra
subtopic: quadratics
difficulty: 2                       # 1 (easy) .. 5 (hardest AMC)
answer: C                           # A..E
choices: ["12", "15", "18", "21", "24"]
year: 2019                          # only for past-paper problems
problem_number: 8                   # only for past-paper problems
source: "AMC 10A 2019 Problem 8"    # only for past-paper problems
---
```

**Problem MDX body** uses named React components:

- `<Problem>…</Problem>` — the problem statement.
- `<Solution>…</Solution>` — the primary method, always rendered.
- `<AlternateMethod title="Geometric">…</AlternateMethod>` — zero or more; collapsed by default behind a "Show alternate methods" toggle.

**Build-time index:** `scripts/build-index.ts` walks `/content/` and emits `content-index.json` (a flat array of `{slug, topic, subtopic, difficulty, year, problem_number}`). The runtime reads this index for queries like "give me 10 random Algebra–Quadratics problems."

**Renames / moves:** `content/redirects.json` maps old slug → new slug so historic `attempts.problem_slug` rows still resolve. The progress page silently skips slugs with no current MDX or redirect.

## Data model (D1)

```sql
CREATE TABLE users (
  id                    TEXT PRIMARY KEY,        -- UUID
  email                 TEXT NOT NULL UNIQUE,    -- Google email
  name                  TEXT,
  image_url             TEXT,
  created_at            INTEGER NOT NULL,        -- unix seconds
  last_activity_at      INTEGER NOT NULL,
  last_reminder_sent_at INTEGER
);

CREATE TABLE attempts (
  id              TEXT PRIMARY KEY,             -- UUID
  user_id         TEXT NOT NULL REFERENCES users(id),
  problem_slug    TEXT NOT NULL,
  topic           TEXT NOT NULL,                -- denormalized for fast dashboard queries
  subtopic        TEXT,                         -- nullable for past-paper problems
  selected_answer TEXT NOT NULL,                -- "A".."E"
  is_correct      INTEGER NOT NULL,             -- 0/1
  mode            TEXT NOT NULL,                -- "learn" | "test"
  time_seconds    INTEGER,
  created_at      INTEGER NOT NULL
);

CREATE INDEX idx_attempts_user_created ON attempts(user_id, created_at DESC);
CREATE INDEX idx_attempts_user_problem ON attempts(user_id, problem_slug);

CREATE TABLE bookmarks (
  user_id      TEXT NOT NULL REFERENCES users(id),
  problem_slug TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  PRIMARY KEY (user_id, problem_slug)
);
```

Notes:
- No `sessions` table — Auth.js JWT cookies hold the session.
- `topic` and `subtopic` are denormalized into `attempts` so per-topic accuracy is a single index scan, independent of content files.
- `last_activity_at` is bumped on any authenticated page view and on every recorded attempt.

## Critical flows

### Flow 1 — Sign-in
1. Visitor clicks "Sign in" → Google OAuth.
2. Auth.js `signIn` callback checks the Google email against `ALLOWED_EMAILS`. Rejection shows a friendly "this site is private" page; no row inserted.
3. First successful sign-in inserts a `users` row with `last_activity_at = now`.

### Flow 2 — Learn-mode practice
1. From `/learn/<topic>/<subtopic>` she clicks "Practice this section."
2. Server action `startLearnSession({ topic, subtopic, count: 10 })` reads `content-index.json`, picks `count` random matching problems, and returns a session object held client-side (sessions are ephemeral — not persisted in D1).
3. Each problem renders one at a time. She picks A–E and submits.
4. Server action `recordAttempt({ problem_slug, selected, time_seconds, mode: "learn" })` inserts an `attempts` row, bumps `last_activity_at`, returns `{ is_correct, correct_answer }`.
5. UI immediately reveals correct/incorrect plus the primary solution. "Show alternate methods" reveals the rest.
6. After the last problem, a session summary shows the score and links missed problems back to their concept page.

### Flow 3 — Test-mode practice
1. From `/practice` she picks Test mode, filters (topic/subtopic/year), count (5/10/25), and an optional timer.
2. Problems render one at a time with no per-question feedback. Submit advances.
3. After the last problem, all attempts are batch-inserted with `mode: "test"`. The score screen lists every problem with correct/incorrect; she expands any to read the full solution.

### Flow 4 — Past papers
1. `/papers` lists years × {10A, 10B}. Each card shows "2019 10A — solved 18/25 · 14 correct" (per-user, when logged in).
2. `/papers/<year>/<ab>` defaults to **Review view:** problem statements, her past answers, correct answers, and primary solutions; alternates collapsed per problem.
3. A "Take it as a test" toggle re-renders the paper in Test mode (no solutions until end-of-test).
4. The page footer includes a link to the canonical AoPS wiki problem index for that paper.

### Flow 5 — Inactivity reminder
1. A Cloudflare Cron Trigger fires daily at 08:00 Pacific.
2. The worker selects users where `now - last_activity_at > 2 days` AND (`last_reminder_sent_at IS NULL` OR `last_reminder_sent_at < last_activity_at`). The second condition prevents re-nagging during the same dry spell.
3. For each match, send one Resend email with both recipients in the `To:` field:
   - Her Google email.
   - Parent email (env var `PARENT_EMAIL`, default `ajithkumarky@gmail.com`).
4. Email body: short and plain — "Hey {firstName}, you haven't practiced AMC10 in 2 days. Jump back in: <link>." `{firstName}` comes from the user's Google profile; falls back to "there" if missing. `<link>` is the deployed site URL.
5. Update `last_reminder_sent_at = now`.

### Flow 6 — Progress dashboard
- `/progress` aggregates `attempts` for the current user:
  - Per-topic accuracy bar (Algebra 72%, Geometry 58%, …).
  - Per-subtopic accuracy table with weakest subtopics highlighted.
  - Past-7-day activity (count of attempts per day).
  - Current streak (consecutive calendar days with ≥1 attempt).
- Weak-subtopic rows link directly into a Learn-mode session pre-filtered to that subtopic.

## Edge cases & error handling

- **Renamed/moved problem MDX:** `content/redirects.json` resolves old slugs. Truly missing slugs are skipped silently on the progress page; the build emits a warning.
- **Email allowlist mismatch:** rejected sign-ins land on a friendly page, not a stack trace.
- **Sign-in on new device:** progress follows (D1 keyed by user id, JWT cookie issued fresh).
- **Server action failures during a session:** the client keeps the answer locally and retries; if retries fail, the session can still complete in-memory and the user is offered a "Sync attempts" button.
- **Daily cron failure:** acceptable to skip a day; idempotency comes from `last_reminder_sent_at < last_activity_at`, not from missing-day make-up logic.
- **Rate limiting:** not required at this scale (small private user list). Cloudflare provides baseline DDoS protection.

## Repository layout

```
amc10/
  app/                        # Next.js App Router pages
    (public)/                 # public concept + papers routes
    (auth)/                   # login-required routes (practice, progress)
    api/                      # route handlers (auth, cron entry, attempts)
  components/                 # React components (panels, choices, KaTeX wrappers)
  content/                    # MDX content (see "Content storage")
  lib/                        # auth, db, content indexing, mdx rendering
  scripts/
    build-index.ts            # build content-index.json
  migrations/                 # D1 SQL migrations
  styles/                     # Tailwind + theme tokens
  workers/
    cron-reminder.ts          # Cloudflare Cron Trigger handler
  wrangler.toml               # Cloudflare config (D1 binding, cron schedule, env vars)
  docs/superpowers/specs/     # this spec
```

## Environment variables

| Name | Where | Purpose |
| --- | --- | --- |
| `AUTH_SECRET` | runtime | Auth.js JWT signing key |
| `GOOGLE_CLIENT_ID` | runtime | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | runtime | Google OAuth |
| `ALLOWED_EMAILS` | runtime | Comma-separated email allowlist |
| `PARENT_EMAIL` | cron worker | Parent recipient for reminder emails |
| `RESEND_API_KEY` | cron worker | Email delivery |
| `SITE_URL` | cron worker | Used in email link |

## Open questions for implementation

- Final subtopic list (proposed above; may be trimmed during content authoring).
- Initial seed of original problems per subtopic (target ~5 per subtopic for V1 launch — enough to make Learn mode useful immediately).
- Which past papers to include at launch (proposal: last 5 years × 10A and 10B = ~10 papers).
- KaTeX vs MathJax fallback only if any AMC notation is unsupported by KaTeX (KaTeX covers everything AMC10 uses in practice).

## Success criteria

- She signs in once, lands on the dashboard, and the Cyber Anime UI is recognizable and not janky.
- She can read at least one concept per topic, attempt at least one practice problem, and see immediate feedback.
- A past paper can be reviewed with our solutions, including at least one problem that demonstrates the "alternate method" toggle.
- The inactivity-reminder cron sends correctly to both her and the parent address on a simulated 2-day-quiet user (verified end-to-end before launch).
- The site loads in under 1.5 s (LCP) on Cloudflare Pages from a typical home connection.
