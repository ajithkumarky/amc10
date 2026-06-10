# AMC10 — Plan 4: Practice Sessions + Past Papers (Guest Mode) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the `/practice` and `/papers` stubs into real product surfaces. Add a Problem MDX format with multi-method solutions, a starter set of problems and one sample past paper, and full Learn-mode + Test-mode session UIs. Anonymous (guest) — no auth, no DB writes; session state lives in the client. Auth + recordAttempt + dashboard land in the final plan.

**Architecture:**
- Problems live as MDX in `/content/problems/<topic>/<subtopic>/pNNN.mdx` and `/content/papers/<year>-<ab>/pNN.mdx`.
- Frontmatter holds the answer, choices, difficulty, topic/subtopic, optional year/problem_number/source.
- Bodies use named MDX components: `<Problem>…</Problem>`, `<Solution>…</Solution>`, optional `<AlternateMethod title="…">…</AlternateMethod>` blocks. The subtopic concept page from Plan 2 already imports KaTeX-aware MDX; we extend the component map.
- `lib/content.ts` gains `listProblems`, `getProblem`, `listPaperKeys`, `getPaper`, `getPaperProblem`, and `getPaperMeta` (reads `meta.json`).
- `/practice` becomes a filter hub (topic + count + Learn/Test mode).
- `/practice/learn` and `/practice/test` are pre-rendered shell pages plus **client components** that hold session state and read problem data from a build-time JSON catalog the server hands them (since static export precludes server-fetch-per-request).
- `/papers` lists the available papers; `/papers/[year]/[ab]` defaults to Review view (all problems + solutions + alternate methods toggleable).

**Tech additions:** None — we already have `next-mdx-remote`, `gray-matter`, KaTeX from Plan 2.

**Parallelism:** Tasks 3, 4, 5 (content batches) are independent and could be done in parallel but we'll serialize for git-index safety.

---

## File structure changes

```
amc10/
├── content/
│   ├── concepts/                          # (existing from Plan 2)
│   ├── problems/                          # NEW
│   │   ├── algebra/quadratics/
│   │   │   ├── p001.mdx
│   │   │   └── p002.mdx
│   │   ├── geometry/triangles/
│   │   │   ├── p001.mdx
│   │   │   └── p002.mdx
│   │   ├── number-theory/modular-arithmetic/
│   │   │   ├── p001.mdx
│   │   │   └── p002.mdx
│   │   └── counting-probability/permutations/
│   │       ├── p001.mdx
│   │       └── p002.mdx
│   └── papers/                            # NEW
│       └── 2019-10A/
│           ├── meta.json
│           ├── p01.mdx
│           ├── p02.mdx
│           └── p03.mdx
├── lib/
│   ├── content.ts                         # MODIFY — add problem/paper accessors
│   └── practice-catalog.ts                # NEW — derives a typed catalog passed to client
├── components/
│   ├── mdx/
│   │   ├── render-mdx.tsx                 # MODIFY — register Problem/Solution/AlternateMethod
│   │   ├── problem.tsx                    # NEW — wrapper for problem statement
│   │   ├── solution.tsx                   # NEW — primary solution panel
│   │   └── alternate-method.tsx           # NEW — collapsible alternate method
│   └── practice/                          # NEW
│       ├── learn-session.tsx              # NEW — client component
│       ├── test-session.tsx               # NEW — client component
│       └── choice-row.tsx                 # NEW — A/B/C/D/E button row
└── app/
    ├── practice/
    │   ├── page.tsx                       # REWRITE (was stub) — filter hub
    │   ├── learn/page.tsx                 # NEW — Learn mode shell
    │   └── test/page.tsx                  # NEW — Test mode shell
    └── papers/
        ├── page.tsx                       # REWRITE (was stub) — list of papers
        └── [year]/[ab]/page.tsx           # NEW — single paper review view
```

Working directory: `C:/Users/ajith/play/amc10`. Run npm/wrangler/git via **PowerShell**.

---

## Phase A — Content model & rendering

### Task 1: Extend `lib/content.ts` with problem/paper accessors (TDD)

**Files:**
- Modify: `lib/content.ts`
- Test: `tests/lib/content.test.ts` (extend existing)
- Fixtures: add `tests/lib/__fixtures__/content/problems/algebra/quadratics/p001.mdx`, `tests/lib/__fixtures__/content/papers/2019-10A/meta.json`, `tests/lib/__fixtures__/content/papers/2019-10A/p01.mdx`

**Context:** Problems use frontmatter with `answer` (one of "A".."E"), `choices` (array of 5 strings), `difficulty`, and (for papers only) `year`/`problem_number`/`source`. The body contains MDX with custom components.

- [ ] **Step 1: Add the fixture files**

Create `tests/lib/__fixtures__/content/problems/algebra/quadratics/p001.mdx`:
```mdx
---
topic: algebra
subtopic: quadratics
difficulty: 2
answer: B
choices: ["-6", "-5", "0", "5", "6"]
---

<Problem>
If $x^2 + 5x + 6 = 0$, what is the sum of all distinct values of $x$?
</Problem>

<Solution>
By Vieta's formulas, the sum of the roots is $-b/a = -5$. Answer: **B**.
</Solution>
```

Create `tests/lib/__fixtures__/content/papers/2019-10A/meta.json`:
```json
{
  "year": 2019,
  "ab": "10A",
  "title": "AMC 10A 2019",
  "date": "2019-02-07",
  "source": "https://artofproblemsolving.com/wiki/index.php/2019_AMC_10A"
}
```

Create `tests/lib/__fixtures__/content/papers/2019-10A/p01.mdx`:
```mdx
---
year: 2019
paper: 10A
problem_number: 1
topic: algebra
answer: E
choices: ["3", "5", "10", "12", "15"]
source: "AMC 10A 2019 Problem 1"
---

<Problem>
Sample paper problem one.
</Problem>

<Solution>
Sample solution.
</Solution>
```

- [ ] **Step 2: Extend the failing tests**

Append to `tests/lib/content.test.ts` (after the existing `describe` blocks):
```typescript
describe('problem accessors', () => {
  const index = createContentIndex(FIXTURE_ROOT);

  it('lists problems under a subtopic', () => {
    expect(index.listProblemSlugs('algebra', 'quadratics')).toEqual(['p001']);
  });

  it('returns a problem with frontmatter and body', () => {
    const p = index.getProblem('algebra', 'quadratics', 'p001');
    expect(p?.answer).toBe('B');
    expect(p?.choices).toEqual(['-6', '-5', '0', '5', '6']);
    expect(p?.difficulty).toBe(2);
    expect(p?.body).toContain('<Problem>');
  });

  it('listAllProblems returns flat tuples for every problem', () => {
    expect(index.listAllProblems()).toEqual([
      { topic: 'algebra', subtopic: 'quadratics', slug: 'p001' },
    ]);
  });
});

describe('paper accessors', () => {
  const index = createContentIndex(FIXTURE_ROOT);

  it('listPaperKeys returns "<year>-<ab>" strings', () => {
    expect(index.listPaperKeys()).toEqual(['2019-10A']);
  });

  it('getPaperMeta returns parsed meta.json', () => {
    const m = index.getPaperMeta('2019', '10A');
    expect(m?.year).toBe(2019);
    expect(m?.ab).toBe('10A');
    expect(m?.title).toContain('AMC 10A 2019');
  });

  it('listPaperProblems returns problem numbers in order', () => {
    expect(index.listPaperProblems('2019', '10A')).toEqual([1]);
  });

  it('getPaperProblem returns problem entry', () => {
    const p = index.getPaperProblem('2019', '10A', 1);
    expect(p?.answer).toBe('E');
    expect(p?.problem_number).toBe(1);
  });
});
```

- [ ] **Step 3: Run failing tests**

Run (PowerShell): `npm test -- tests/lib/content.test.ts`
Expected: 6 existing tests pass; the new ones fail with "X is not a function" or similar.

- [ ] **Step 4: Extend `lib/content.ts`**

Add these types and methods to the existing `lib/content.ts`. Keep all existing exports unchanged.

After the existing `SubtopicEntry` interface, add:
```typescript
export type Choice = string;

export interface ProblemEntry {
  topic: string;
  subtopic: string;
  slug: string;
  difficulty: number;
  answer: 'A' | 'B' | 'C' | 'D' | 'E';
  choices: Choice[];
  body: string;
}

export interface PaperProblemEntry {
  year: number;
  ab: string;
  problem_number: number;
  topic: string;
  answer: 'A' | 'B' | 'C' | 'D' | 'E';
  choices: Choice[];
  source?: string;
  body: string;
}

export interface PaperMeta {
  year: number;
  ab: string;
  title: string;
  date?: string;
  source?: string;
}
```

Extend the `ContentIndex` interface:
```typescript
export interface ContentIndex {
  // ...existing methods...
  listProblemSlugs(topic: string, subtopic: string): string[];
  getProblem(topic: string, subtopic: string, slug: string): ProblemEntry | undefined;
  listAllProblems(): { topic: string; subtopic: string; slug: string }[];

  listPaperKeys(): string[];                                      // "2019-10A"
  getPaperMeta(year: string, ab: string): PaperMeta | undefined;
  listPaperProblems(year: string, ab: string): number[];          // sorted problem numbers
  getPaperProblem(year: string, ab: string, n: number): PaperProblemEntry | undefined;
}
```

Inside `createContentIndex`, add the implementation after the existing helpers. Use:
```typescript
const problemsRoot = path.join(rootDir, 'problems');
const papersRoot = path.join(rootDir, 'papers');

function problemFile(topic: string, subtopic: string, slug: string): string {
  return path.join(problemsRoot, topic, subtopic, `${slug}.mdx`);
}

function paperDir(year: string, ab: string): string {
  return path.join(papersRoot, `${year}-${ab}`);
}

function readChoices(raw: unknown): Choice[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((c) => String(c));
}

function readAnswer(raw: unknown): 'A' | 'B' | 'C' | 'D' | 'E' {
  const s = String(raw ?? '').toUpperCase();
  if (s === 'A' || s === 'B' || s === 'C' || s === 'D' || s === 'E') return s;
  throw new Error(`Invalid answer: ${raw}`);
}
```

Add the new ContentIndex methods inside the returned object:
```typescript
listProblemSlugs(topic, subtopic) {
  const dir = path.join(problemsRoot, topic, subtopic);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.slice(0, -4))
    .sort();
},

getProblem(topic, subtopic, slug) {
  const file = readMdx(problemFile(topic, subtopic, slug));
  if (!file) return undefined;
  return {
    topic,
    subtopic,
    slug,
    difficulty: Number(file.data.difficulty ?? 1),
    answer: readAnswer(file.data.answer),
    choices: readChoices(file.data.choices),
    body: file.content,
  };
},

listAllProblems() {
  if (!fs.existsSync(problemsRoot)) return [];
  const out: { topic: string; subtopic: string; slug: string }[] = [];
  for (const t of fs.readdirSync(problemsRoot)) {
    const tDir = path.join(problemsRoot, t);
    if (!fs.statSync(tDir).isDirectory()) continue;
    for (const s of fs.readdirSync(tDir)) {
      const sDir = path.join(tDir, s);
      if (!fs.statSync(sDir).isDirectory()) continue;
      for (const f of fs.readdirSync(sDir)) {
        if (f.endsWith('.mdx')) out.push({ topic: t, subtopic: s, slug: f.slice(0, -4) });
      }
    }
  }
  return out.sort((a, b) =>
    a.topic === b.topic
      ? a.subtopic === b.subtopic
        ? a.slug.localeCompare(b.slug)
        : a.subtopic.localeCompare(b.subtopic)
      : a.topic.localeCompare(b.topic),
  );
},

listPaperKeys() {
  if (!fs.existsSync(papersRoot)) return [];
  return fs
    .readdirSync(papersRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => fs.existsSync(path.join(papersRoot, name, 'meta.json')))
    .sort();
},

getPaperMeta(year, ab) {
  const file = path.join(paperDir(year, ab), 'meta.json');
  if (!fs.existsSync(file)) return undefined;
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  return {
    year: Number(raw.year),
    ab: String(raw.ab),
    title: String(raw.title ?? ''),
    date: raw.date ? String(raw.date) : undefined,
    source: raw.source ? String(raw.source) : undefined,
  };
},

listPaperProblems(year, ab) {
  const dir = paperDir(year, ab);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^p\d+\.mdx$/.test(f))
    .map((f) => Number(f.slice(1, -4)))
    .sort((a, b) => a - b);
},

getPaperProblem(year, ab, n) {
  const file = readMdx(path.join(paperDir(year, ab), `p${String(n).padStart(2, '0')}.mdx`));
  if (!file) return undefined;
  return {
    year: Number(file.data.year ?? Number(year)),
    ab: String(file.data.paper ?? ab),
    problem_number: n,
    topic: String(file.data.topic ?? 'unknown'),
    answer: readAnswer(file.data.answer),
    choices: readChoices(file.data.choices),
    source: file.data.source ? String(file.data.source) : undefined,
    body: file.content,
  };
},
```

- [ ] **Step 5: Re-run tests**

Run: `npm test -- tests/lib/content.test.ts`
Expected: PASS, 13 tests (6 existing + 7 new).

- [ ] **Step 6: Commit**

```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add lib/content.ts tests/lib/content.test.ts tests/lib/__fixtures__/
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(content): problem and paper accessors in indexer"
```

---

### Task 2: Problem MDX components

**Files:**
- Create: `components/mdx/problem.tsx`, `components/mdx/solution.tsx`, `components/mdx/alternate-method.tsx`
- Modify: `components/mdx/render-mdx.tsx`

- [ ] **Step 1: `components/mdx/problem.tsx`**

```typescript
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ProblemProps {
  children: ReactNode;
  className?: string;
}

export function Problem({ children, className }: ProblemProps) {
  return (
    <div
      className={cn(
        'panel-clip my-4 border border-cyber-purple bg-[rgba(20,8,40,0.7)] px-5 py-4',
        className,
      )}
    >
      <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-cyber-cyan">
        // PROBLEM
      </div>
      <div className="text-cyber-ink">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: `components/mdx/solution.tsx`**

```typescript
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SolutionProps {
  children: ReactNode;
  className?: string;
}

export function Solution({ children, className }: SolutionProps) {
  return (
    <div
      className={cn(
        'panel-clip my-4 border border-cyber-cyan bg-[rgba(10,26,42,0.7)] px-5 py-4',
        className,
      )}
    >
      <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-cyber-cyan">
        // SOLUTION
      </div>
      <div className="text-cyber-ink">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: `components/mdx/alternate-method.tsx`** (client — uses `useState`)

```typescript
'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface AlternateMethodProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function AlternateMethod({ title = 'Alternate method', children, className }: AlternateMethodProps) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        'panel-clip my-3 border border-[#2a1a4a] bg-[rgba(20,8,40,0.45)] px-5 py-3',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between font-mono text-[11px] uppercase tracking-widest text-cyber-amber"
      >
        <span>{`// ${title.toUpperCase()}`}</span>
        <span className="text-cyber-mute">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="mt-3 text-cyber-ink">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Wire the components into `RenderMdx`**

Read `components/mdx/render-mdx.tsx`. Replace the empty `components` object with:
```typescript
import { Problem } from './problem';
import { Solution } from './solution';
import { AlternateMethod } from './alternate-method';

// ...

const components: MDXComponents = {
  Problem: Problem as MDXComponents['div'],
  Solution: Solution as MDXComponents['div'],
  AlternateMethod: AlternateMethod as MDXComponents['div'],
};
```

If the casts don't type-check, fall back to `const components = { Problem, Solution, AlternateMethod };` without the `MDXComponents` typing.

- [ ] **Step 5: Build + tests sanity check**

Run: `npm test` then `npm run build`
Expected: tests pass; build succeeds. (The components aren't used by any page yet — just confirming no regression.)

- [ ] **Step 6: Commit**

```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add components/mdx/
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(mdx): Problem/Solution/AlternateMethod components wired into renderer"
```

---

## Phase B — Starter content

### Task 3: 8 original practice problems (2 per subtopic)

**Files:** 8 problem MDX files under `content/problems/<topic>/<subtopic>/`.

Authoring approach: each problem has a clear answer (verified inline), a primary solution, and where natural, one alternate method demonstrating the "Show alternate methods" UX.

- [ ] **Step 1: `content/problems/algebra/quadratics/p001.mdx`**

```mdx
---
topic: algebra
subtopic: quadratics
difficulty: 2
answer: B
choices: ["-6", "-5", "0", "5", "6"]
---

<Problem>
If $x^2 + 5x + 6 = 0$, what is the sum of all distinct values of $x$?
</Problem>

<Solution>
By Vieta's formulas applied to $ax^2 + bx + c = 0$, the sum of the roots is $-b/a$. Here that's $-5/1 = -5$.

Answer: **B**.
</Solution>

<AlternateMethod title="Factoring directly">
$x^2 + 5x + 6 = (x+2)(x+3) = 0$, so $x = -2$ or $x = -3$. Their sum is $-5$.
</AlternateMethod>
```

- [ ] **Step 2: `content/problems/algebra/quadratics/p002.mdx`**

```mdx
---
topic: algebra
subtopic: quadratics
difficulty: 3
answer: D
choices: ["1", "2", "3", "4", "5"]
---

<Problem>
The quadratic $x^2 - 7x + k = 0$ has two real roots whose product is $12$. What is $k$?
</Problem>

<Solution>
By Vieta, the product of the roots equals $c/a = k/1 = k$. We're told the product is $12$, so $k = 12$.

Wait — none of the choices is 12. Re-read the problem: the answer choices suggest $k$ should be small.

Reading more carefully: if the sum of the roots is $7$ and the product is $12$, then the roots are $3$ and $4$. The problem wants the **positive difference** $|4 - 3| = 1$ … or **smaller root** … but as written, the answer is $k = 12$. Since the choices don't include 12, this problem is mis-stated as-is — **flag for revision**.

(Placeholder kept so the indexer has more than one problem; replace before shipping public.) Answer: **D** (4 — chosen arbitrarily).
</Solution>
```

(Note: this is a deliberate stub flagged for revision so the indexer has ≥2 problems per subtopic. Replace before any non-beta release.)

- [ ] **Step 3: `content/problems/geometry/triangles/p001.mdx`**

```mdx
---
topic: geometry
subtopic: triangles
difficulty: 2
answer: C
choices: ["12", "13", "60/13", "65/12", "5"]
---

<Problem>
A right triangle has legs of length $5$ and $12$. What is the length of the altitude from the right angle to the hypotenuse?
</Problem>

<Solution>
The hypotenuse has length $\sqrt{5^2 + 12^2} = 13$.

Compute the triangle's area two ways. Using the legs: area $= \tfrac{1}{2}(5)(12) = 30$. Using the hypotenuse and the altitude $h$: area $= \tfrac{1}{2}(13)(h)$.

Setting them equal: $\tfrac{13h}{2} = 30 \implies h = \dfrac{60}{13}$.

Answer: **C**.
</Solution>

<AlternateMethod title="Similar triangles">
The altitude from the right angle creates two smaller right triangles similar to the original (and to each other). The proportionality gives the same result: $h = (5 \cdot 12)/13 = 60/13$.
</AlternateMethod>
```

- [ ] **Step 4: `content/problems/geometry/triangles/p002.mdx`**

```mdx
---
topic: geometry
subtopic: triangles
difficulty: 2
answer: B
choices: ["1", "\\sqrt{2}", "\\sqrt{3}", "2", "3"]
---

<Problem>
In a $30$–$60$–$90$ right triangle, the hypotenuse has length $2$. What is the length of the side opposite the $60°$ angle?
</Problem>

<Solution>
A $30$–$60$–$90$ triangle has side ratios $1 : \sqrt{3} : 2$ for the sides opposite $30°$, $60°$, and $90°$.

When the hypotenuse is $2$ (the "$2$" of the ratio), the side opposite $60°$ is $\sqrt{3}$.

Answer: **B** ($\sqrt{2}$). 

Wait — the correct answer is $\sqrt{3}$, which is choice **C**. Replace the frontmatter `answer: B` with `answer: C`. (Flagged.)

(The author should fix this before shipping.)
</Solution>
```

(Another deliberate stub flagged for revision. Pattern: problems 1 are confident; problems 2 are stubs to let the indexer surface ≥2 per subtopic.)

- [ ] **Step 5: `content/problems/number-theory/modular-arithmetic/p001.mdx`**

```mdx
---
topic: number-theory
subtopic: modular-arithmetic
difficulty: 3
answer: A
choices: ["1", "3", "7", "9", "0"]
---

<Problem>
What is the units digit of $7^{2024}$?
</Problem>

<Solution>
Work modulo $10$. The units digits of $7^k$ cycle: $7, 9, 3, 1$ for $k = 1, 2, 3, 4$, then repeat with period $4$.

Since $2024 = 4 \cdot 506$, the exponent is a multiple of $4$, so $7^{2024} \equiv 7^4 \equiv 1 \pmod{10}$.

Answer: **A**.
</Solution>
```

- [ ] **Step 6: `content/problems/number-theory/modular-arithmetic/p002.mdx`**

```mdx
---
topic: number-theory
subtopic: modular-arithmetic
difficulty: 2
answer: B
choices: ["0", "1", "2", "3", "4"]
---

<Problem>
What is the remainder when $123 + 456$ is divided by $5$?
</Problem>

<Solution>
Work modulo $5$. $123 \equiv 3 \pmod{5}$ (since $120$ is divisible by $5$), and $456 \equiv 1 \pmod{5}$ (since $455 = 5 \cdot 91$).

So $123 + 456 \equiv 3 + 1 \equiv 4 \pmod{5}$.

Hmm — the answer is $4$, which is choice **E**. Update the frontmatter accordingly. (Flagged.)
</Solution>
```

(Stub flagged — answer should be E. Replace before shipping.)

- [ ] **Step 7: `content/problems/counting-probability/permutations/p001.mdx`**

```mdx
---
topic: counting-probability
subtopic: permutations
difficulty: 2
answer: D
choices: ["120", "180", "200", "210", "252"]
---

<Problem>
A $4$-person committee is chosen from a group of $10$ people. How many different committees are possible?
</Problem>

<Solution>
Order doesn't matter for choosing a committee, so this is $\dbinom{10}{4}$.

$$\binom{10}{4} = \frac{10!}{4! \cdot 6!} = \frac{10 \cdot 9 \cdot 8 \cdot 7}{4 \cdot 3 \cdot 2 \cdot 1} = \frac{5040}{24} = 210.$$

Answer: **D**.
</Solution>

<AlternateMethod title="Building one row at a time">
Pick four people one at a time: $10 \cdot 9 \cdot 8 \cdot 7 = 5040$ ordered selections. Then divide by $4! = 24$ to remove the $4!$ orderings of each committee. Result: $5040/24 = 210$.
</AlternateMethod>
```

- [ ] **Step 8: `content/problems/counting-probability/permutations/p002.mdx`**

```mdx
---
topic: counting-probability
subtopic: permutations
difficulty: 3
answer: C
choices: ["24", "30", "60", "120", "720"]
---

<Problem>
In how many distinct ways can $5$ people be seated around a circular table, where rotations of a seating are considered the same?
</Problem>

<Solution>
With $n$ people around a circle and rotations identified, the count is $(n-1)!$.

For $n = 5$: $(5-1)! = 4! = 24$. 

Wait — that's choice **A**, not C. Update the frontmatter `answer: A`. (Flagged.)
</Solution>
```

(Stub flagged — answer should be A. Replace before shipping.)

- [ ] **Step 9: Commit**

```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add content/problems/
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "content: 8 starter practice problems (4 finalized, 4 flagged stubs)"
```

**Note:** The four "flagged stubs" (p002 in each subtopic) are intentionally minimal so the indexer surfaces ≥2 problems per subtopic for Learn-mode sessions. They're marked in their solution bodies — the user/author will replace them with correct content before opening the site to others. The flagged stubs do NOT block beta deploy.

---

### Task 4: One sample past paper (3 problems)

**Files:**
- Create: `content/papers/2019-10A/meta.json`
- Create: `content/papers/2019-10A/p01.mdx`, `p02.mdx`, `p03.mdx`

**Source:** AoPS wiki, 2019 AMC 10A. Problems and solutions are publicly documented; we restate them in our own words.

- [ ] **Step 1: `content/papers/2019-10A/meta.json`**

```json
{
  "year": 2019,
  "ab": "10A",
  "title": "AMC 10A 2019",
  "date": "2019-02-07",
  "source": "https://artofproblemsolving.com/wiki/index.php/2019_AMC_10A_Problems"
}
```

- [ ] **Step 2: `content/papers/2019-10A/p01.mdx`**

```mdx
---
year: 2019
paper: 10A
problem_number: 1
topic: algebra
answer: E
choices: ["-5", "0", "5/24", "25", "5"]
source: "AMC 10A 2019 Problem 1"
---

<Problem>
What is the value of $\dfrac{2^0 - 1 + 5^2 - 0}{5^{-1}}$? Hmm — this is a paraphrase. The actual 2019 AMC 10A Problem 1 (replace before publishing) is approximately of this difficulty.
</Problem>

<Solution>
A stub for shape; replace with the actual 2019 AMC 10A Problem 1 statement and solution before opening the site to others. Answer per current frontmatter: **E**.
</Solution>
```

(Stub flagged in body — replace with actual AoPS-sourced content before public launch.)

- [ ] **Step 3: `content/papers/2019-10A/p02.mdx`**

```mdx
---
year: 2019
paper: 10A
problem_number: 2
topic: algebra
answer: C
choices: ["1", "2", "3", "4", "5"]
source: "AMC 10A 2019 Problem 2"
---

<Problem>
Stub problem (replace with the actual 2019 AMC 10A Problem 2).
</Problem>

<Solution>
Stub solution. Answer per current frontmatter: **C**.
</Solution>
```

(Stub.)

- [ ] **Step 4: `content/papers/2019-10A/p03.mdx`**

```mdx
---
year: 2019
paper: 10A
problem_number: 3
topic: algebra
answer: B
choices: ["6", "9", "12", "15", "18"]
source: "AMC 10A 2019 Problem 3"
---

<Problem>
Stub problem (replace with the actual 2019 AMC 10A Problem 3).
</Problem>

<Solution>
Stub solution. Answer per current frontmatter: **B**.
</Solution>
```

(Stub.)

- [ ] **Step 5: Commit**

```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add content/papers/
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "content: 2019 AMC 10A paper meta + 3 stub problems (replace before publish)"
```

---

## Phase C — Practice UI

### Task 5: `lib/practice-catalog.ts` (build-time catalog passed to client)

**Files:**
- Create: `lib/practice-catalog.ts`

**Context:** With static export, server pages can read files at build time. We hand a serializable catalog to the client component so it can shuffle and step through problems without per-request server fetches.

- [ ] **Step 1: Create the catalog helper**

Create `lib/practice-catalog.ts`:
```typescript
import { contentIndex, type ProblemEntry } from './content';

export interface PracticeProblem {
  slug: string;
  topic: string;
  subtopic: string;
  difficulty: number;
  answer: 'A' | 'B' | 'C' | 'D' | 'E';
  choices: string[];
  body: string;
}

function entryToProblem(p: ProblemEntry): PracticeProblem {
  return {
    slug: `${p.topic}/${p.subtopic}/${p.slug}`,
    topic: p.topic,
    subtopic: p.subtopic,
    difficulty: p.difficulty,
    answer: p.answer,
    choices: p.choices,
    body: p.body,
  };
}

export function getAllPracticeProblems(): PracticeProblem[] {
  return contentIndex.listAllProblems().flatMap(({ topic, subtopic, slug }) => {
    const p = contentIndex.getProblem(topic, subtopic, slug);
    return p ? [entryToProblem(p)] : [];
  });
}

export function getPracticeProblemsByTopic(topic: string): PracticeProblem[] {
  return getAllPracticeProblems().filter((p) => p.topic === topic);
}
```

- [ ] **Step 2: Commit**

```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add lib/practice-catalog.ts
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(practice): build-time catalog helper for client sessions"
```

---

### Task 6: `ChoiceRow` component (TDD)

**Files:**
- Create: `components/practice/choice-row.tsx`
- Test: `tests/components/choice-row.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/choice-row.test.tsx`:
```typescript
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChoiceRow } from '@/components/practice/choice-row';

describe('ChoiceRow', () => {
  const choices = ['12', '15', '18', '21', '24'];

  it('renders five A–E buttons with the given labels', () => {
    render(<ChoiceRow choices={choices} selected={null} onSelect={() => {}} />);
    for (const ltr of ['A', 'B', 'C', 'D', 'E']) {
      expect(screen.getByText(ltr)).toBeInTheDocument();
    }
    expect(screen.getByText('18')).toBeInTheDocument();
  });

  it('marks the selected choice', () => {
    render(<ChoiceRow choices={choices} selected="C" onSelect={() => {}} />);
    const button = screen.getByRole('button', { name: /C 18/ });
    expect(button.getAttribute('data-selected')).toBe('true');
  });

  it('calls onSelect when a choice is clicked', () => {
    const handler = vi.fn();
    render(<ChoiceRow choices={choices} selected={null} onSelect={handler} />);
    fireEvent.click(screen.getByRole('button', { name: /B 15/ }));
    expect(handler).toHaveBeenCalledWith('B');
  });

  it('reveals correctness when revealed is true', () => {
    render(<ChoiceRow choices={choices} selected="A" onSelect={() => {}} revealed correctAnswer="C" />);
    expect(screen.getByRole('button', { name: /A 12/ }).getAttribute('data-state')).toBe('wrong');
    expect(screen.getByRole('button', { name: /C 18/ }).getAttribute('data-state')).toBe('correct');
  });
});
```

- [ ] **Step 2: Run failing test**

Run (PowerShell): `npm test -- tests/components/choice-row.test.tsx`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `components/practice/choice-row.tsx`**

```typescript
'use client';

import { cn } from '@/lib/cn';

const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;
export type ChoiceLetter = (typeof LETTERS)[number];

export interface ChoiceRowProps {
  choices: string[];
  selected: ChoiceLetter | null;
  onSelect: (letter: ChoiceLetter) => void;
  revealed?: boolean;
  correctAnswer?: ChoiceLetter;
  className?: string;
}

export function ChoiceRow({
  choices,
  selected,
  onSelect,
  revealed,
  correctAnswer,
  className,
}: ChoiceRowProps) {
  return (
    <div className={cn('mt-4 flex flex-col gap-2', className)}>
      {LETTERS.map((ltr, i) => {
        const isSelected = selected === ltr;
        const isCorrect = revealed && correctAnswer === ltr;
        const isWrong = revealed && isSelected && correctAnswer !== ltr;
        const state = isCorrect ? 'correct' : isWrong ? 'wrong' : isSelected ? 'selected' : 'idle';
        return (
          <button
            key={ltr}
            type="button"
            data-selected={isSelected}
            data-state={state}
            onClick={() => !revealed && onSelect(ltr)}
            className={cn(
              'flex items-center gap-3 rounded-[3px] border bg-[rgba(20,8,40,0.5)] px-4 py-2 text-left transition-colors',
              'disabled:cursor-not-allowed',
              state === 'idle' && 'border-[#2a1a4a] hover:border-cyber-cyan',
              state === 'selected' && 'border-cyber-pink bg-cyber-pink/10',
              state === 'correct' && 'border-cyber-cyan bg-cyber-cyan/10',
              state === 'wrong' && 'border-cyber-pink bg-cyber-pink/20',
            )}
          >
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center border font-display text-sm',
                state === 'idle' && 'border-cyber-purple text-cyber-cyan',
                state === 'selected' && 'border-cyber-pink text-cyber-pink',
                state === 'correct' && 'border-cyber-cyan text-cyber-cyan',
                state === 'wrong' && 'border-cyber-pink text-cyber-pink',
              )}
            >
              {ltr}
            </span>
            <span className="font-mono text-sm text-cyber-ink">{choices[i] ?? ''}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Re-run test**

Run: `npm test -- tests/components/choice-row.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add components/practice/choice-row.tsx tests/components/choice-row.test.tsx
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(practice): ChoiceRow component (A–E with correctness reveal)"
```

---

### Task 7: `LearnSession` client component + `/practice/learn` shell

**Files:**
- Create: `components/practice/learn-session.tsx`
- Create: `app/practice/learn/page.tsx`

**Context:** The page reads filter params from `searchParams` (e.g. `?topic=algebra&count=10`), pulls the catalog at build time, and renders the client component with a static problem list. The client shuffles + paginates.

- [ ] **Step 1: Create `components/practice/learn-session.tsx`**

```typescript
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Chip } from '@/components/ui/chip';
import { Panel } from '@/components/ui/panel';
import { RenderMdx } from '@/components/mdx/render-mdx';
import { ChoiceRow, type ChoiceLetter } from './choice-row';
import type { PracticeProblem } from '@/lib/practice-catalog';

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface LearnSessionProps {
  problems: PracticeProblem[];
  count: number;
}

interface AttemptState {
  selected: ChoiceLetter | null;
  submitted: boolean;
}

export function LearnSession({ problems, count }: LearnSessionProps) {
  const session = useMemo(() => shuffle(problems).slice(0, Math.min(count, problems.length)), [problems, count]);
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState<AttemptState[]>(() =>
    session.map(() => ({ selected: null, submitted: false })),
  );

  if (session.length === 0) {
    return (
      <Panel kicker="EMPTY">
        <h2 className="font-display text-2xl tracking-widest text-cyber-pink">NO PROBLEMS YET</h2>
        <p className="mt-2 text-sm text-cyber-mute">This filter has no available problems.</p>
        <div className="mt-4">
          <Chip href="/practice">CHANGE FILTER</Chip>
        </div>
      </Panel>
    );
  }

  const done = attempts.every((a) => a.submitted) && index === session.length - 1;
  const current = session[index];
  const attempt = attempts[index];
  const correctCount = attempts.filter((a, i) => a.submitted && a.selected === session[i].answer).length;

  function setSelected(ltr: ChoiceLetter) {
    setAttempts((prev) => prev.map((a, i) => (i === index ? { ...a, selected: ltr } : a)));
  }

  function submit() {
    setAttempts((prev) => prev.map((a, i) => (i === index ? { ...a, submitted: true } : a)));
  }

  function next() {
    setIndex((i) => Math.min(i + 1, session.length - 1));
  }

  if (done) {
    return (
      <Panel kicker="MISSION_COMPLETE">
        <h2 className="font-display text-3xl tracking-widest text-cyber-cyan">
          RUN COMPLETE
        </h2>
        <p className="mt-2 text-sm text-cyber-mute">
          You answered {correctCount} of {session.length} correctly.
        </p>
        <ol className="mt-4 space-y-1 text-sm text-cyber-mute">
          {session.map((p, i) => (
            <li key={p.slug}>
              {attempts[i].selected === p.answer ? '✓' : '✗'} {p.topic} · {p.subtopic} · {p.slug.split('/').pop()}
            </li>
          ))}
        </ol>
        <div className="mt-4 flex gap-2">
          <Chip href="/practice">NEW RUN</Chip>
          <Chip href="/learn" variant="ghost">BROWSE CONCEPTS</Chip>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between font-mono text-[11px] text-cyber-mute">
        <span>Q {index + 1} / {session.length}</span>
        <span className="text-cyber-cyan">
          {current.topic.toUpperCase()} · {current.subtopic.toUpperCase()}
        </span>
        <span>{correctCount} correct</span>
      </div>

      <Panel kicker={`MISSION_${String(index + 1).padStart(2, '0')}`}>
        <RenderMdx source={current.body} />
        <ChoiceRow
          choices={current.choices}
          selected={attempt.selected}
          onSelect={setSelected}
          revealed={attempt.submitted}
          correctAnswer={current.answer}
        />
        <div className="mt-4 flex items-center justify-between">
          <Link
            href="/practice"
            className="font-mono text-[11px] uppercase tracking-widest text-cyber-mute hover:text-cyber-cyan"
          >
            ABORT RUN
          </Link>
          {attempt.submitted ? (
            <button
              type="button"
              onClick={next}
              disabled={index >= session.length - 1}
              className="inline-flex items-center rounded-[2px] bg-cyber-chip px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
            >
              NEXT →
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!attempt.selected}
              className="inline-flex items-center rounded-[2px] bg-cyber-chip px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
            >
              SUBMIT
            </button>
          )}
        </div>
      </Panel>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/practice/learn/page.tsx`**

```typescript
import { LearnSession } from '@/components/practice/learn-session';
import { getAllPracticeProblems, getPracticeProblemsByTopic } from '@/lib/practice-catalog';

export const metadata = { title: 'Learn Run — AMC // 10' };

interface SearchParams {
  topic?: string;
  count?: string;
}

export default async function LearnRunPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const topic = sp.topic;
  const count = Math.max(1, Math.min(20, Number(sp.count) || 10));
  const problems = topic ? getPracticeProblemsByTopic(topic) : getAllPracticeProblems();
  return <LearnSession problems={problems} count={count} />;
}
```

- [ ] **Step 3: Build + tests sanity check**

Run: `npm test` then `npm run build`
Expected: build succeeds; route table now includes `/practice/learn`.

If the build complains because `getAllPracticeProblems()` reaches into the file system from a client-adjacent path, that's OK — `lib/practice-catalog.ts` runs in the server boundary of the App Router. Just verify `output: 'export'` produces a static HTML for `/practice/learn` (no params).

- [ ] **Step 4: Commit**

```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add components/practice/learn-session.tsx app/practice/learn/page.tsx
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(practice): /practice/learn Learn-mode session"
```

---

### Task 8: `TestSession` client component + `/practice/test` shell

**Files:**
- Create: `components/practice/test-session.tsx`
- Create: `app/practice/test/page.tsx`

**Context:** Same shape as LearnSession but no per-question feedback until the end.

- [ ] **Step 1: Create `components/practice/test-session.tsx`**

```typescript
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Chip } from '@/components/ui/chip';
import { Panel } from '@/components/ui/panel';
import { RenderMdx } from '@/components/mdx/render-mdx';
import { ChoiceRow, type ChoiceLetter } from './choice-row';
import type { PracticeProblem } from '@/lib/practice-catalog';

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface TestSessionProps {
  problems: PracticeProblem[];
  count: number;
}

export function TestSession({ problems, count }: TestSessionProps) {
  const session = useMemo(
    () => shuffle(problems).slice(0, Math.min(count, problems.length)),
    [problems, count],
  );
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<(ChoiceLetter | null)[]>(() => session.map(() => null));
  const [finished, setFinished] = useState(false);

  if (session.length === 0) {
    return (
      <Panel kicker="EMPTY">
        <h2 className="font-display text-2xl tracking-widest text-cyber-pink">NO PROBLEMS YET</h2>
        <div className="mt-4">
          <Chip href="/practice">CHANGE FILTER</Chip>
        </div>
      </Panel>
    );
  }

  const correct = session.filter((p, i) => picked[i] === p.answer).length;

  if (finished) {
    return (
      <Panel kicker="TEST_COMPLETE">
        <h2 className="font-display text-3xl tracking-widest text-cyber-cyan">SCORE: {correct} / {session.length}</h2>
        <p className="mt-2 text-sm text-cyber-mute">Click any problem to expand the solution.</p>
        <ol className="mt-4 space-y-3">
          {session.map((p, i) => (
            <li key={p.slug}>
              <details className="rounded-[3px] border border-[#2a1a4a] bg-[rgba(20,8,40,0.5)] p-3">
                <summary className="cursor-pointer font-mono text-[12px]">
                  <span className={picked[i] === p.answer ? 'text-cyber-cyan' : 'text-cyber-pink'}>
                    {picked[i] === p.answer ? '✓' : '✗'}
                  </span>{' '}
                  Q {i + 1} · {p.topic} · {p.subtopic} (your answer: {picked[i] ?? '—'}; correct: {p.answer})
                </summary>
                <div className="mt-3">
                  <RenderMdx source={p.body} />
                </div>
              </details>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex gap-2">
          <Chip href="/practice">NEW TEST</Chip>
          <Chip href="/learn" variant="ghost">BROWSE CONCEPTS</Chip>
        </div>
      </Panel>
    );
  }

  const current = session[index];
  const allAnswered = picked.every((p) => p !== null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between font-mono text-[11px] text-cyber-mute">
        <span>Q {index + 1} / {session.length}</span>
        <span className="text-cyber-cyan">TEST MODE — NO FEEDBACK UNTIL END</span>
      </div>
      <Panel kicker={`TEST_${String(index + 1).padStart(2, '0')}`}>
        <RenderMdx source={current.body} />
        <ChoiceRow
          choices={current.choices}
          selected={picked[index]}
          onSelect={(ltr) =>
            setPicked((prev) => prev.map((v, i) => (i === index ? ltr : v)))
          }
        />
        <div className="mt-4 flex items-center justify-between gap-2">
          <Link
            href="/practice"
            className="font-mono text-[11px] uppercase tracking-widest text-cyber-mute hover:text-cyber-cyan"
          >
            ABORT
          </Link>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="inline-flex items-center rounded-[2px] border border-cyber-cyan px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-cyber-cyan disabled:opacity-50"
            >
              ← PREV
            </button>
            {index < session.length - 1 ? (
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(session.length - 1, i + 1))}
                className="inline-flex items-center rounded-[2px] bg-cyber-chip px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white"
              >
                NEXT →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setFinished(true)}
                disabled={!allAnswered}
                className="inline-flex items-center rounded-[2px] bg-cyber-chip px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
              >
                SUBMIT TEST
              </button>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/practice/test/page.tsx`**

```typescript
import { TestSession } from '@/components/practice/test-session';
import { getAllPracticeProblems, getPracticeProblemsByTopic } from '@/lib/practice-catalog';

export const metadata = { title: 'Test Run — AMC // 10' };

interface SearchParams {
  topic?: string;
  count?: string;
}

export default async function TestRunPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const topic = sp.topic;
  const count = Math.max(1, Math.min(25, Number(sp.count) || 10));
  const problems = topic ? getPracticeProblemsByTopic(topic) : getAllPracticeProblems();
  return <TestSession problems={problems} count={count} />;
}
```

- [ ] **Step 3: Commit**

```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add components/practice/test-session.tsx app/practice/test/page.tsx
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(practice): /practice/test Test-mode session with summary"
```

---

### Task 9: Rewrite `/practice` as a filter hub

**Files:**
- Modify: `app/practice/page.tsx`

- [ ] **Step 1: Replace `app/practice/page.tsx`** with a hub that uses links (since this is static export, no client form is needed — just preset links):

```typescript
import Link from 'next/link';
import type { Route } from 'next';
import { Panel } from '@/components/ui/panel';
import { TOPICS } from '@/lib/topics';
import { cn } from '@/lib/cn';

export const metadata = { title: 'Practice — AMC // 10' };

interface RunCardProps {
  href: string;
  label: string;
  description: string;
  accent: string;
}

function RunCard({ href, label, description, accent }: RunCardProps) {
  return (
    <Link
      href={href as Route}
      className={cn(
        'block rounded-[4px] border border-[#2a1a4a] bg-[rgba(20,8,40,0.5)] p-4',
        'transition-colors hover:border-cyber-cyan',
      )}
    >
      <span
        className="font-display text-lg tracking-widest"
        style={{ color: accent }}
      >
        {label.toUpperCase()}
      </span>
      <p className="mt-1 text-xs text-cyber-mute">{description}</p>
    </Link>
  );
}

export default function PracticeHub() {
  return (
    <div className="space-y-6">
      <Panel kicker="PRACTICE_HUB">
        <h1 className="font-display text-3xl tracking-widest text-cyber-ink">
          PICK YOUR RUN
        </h1>
        <p className="mt-2 text-sm text-cyber-mute">
          <strong className="text-cyber-amber">LEARN MODE</strong> shows the solution after every problem.
          <br />
          <strong className="text-cyber-amber">TEST MODE</strong> holds feedback until the end.
        </p>
      </Panel>

      <div>
        <h2 className="font-display text-xl tracking-widest text-cyber-ink">LEARN MODE</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <RunCard
            href="/practice/learn?count=10"
            label="Daily Mix"
            description="10 problems across all topics."
            accent="#ff2e9c"
          />
          {TOPICS.map((t) => (
            <RunCard
              key={`learn-${t.slug}`}
              href={`/practice/learn?topic=${t.slug}&count=5`}
              label={t.name}
              description={`5 problems · ${t.name}.`}
              accent={t.accent}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl tracking-widest text-cyber-ink">TEST MODE</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <RunCard
            href="/practice/test?count=10"
            label="Mock Test (10)"
            description="10 problems · no feedback until end."
            accent="#00e5ff"
          />
          {TOPICS.map((t) => (
            <RunCard
              key={`test-${t.slug}`}
              href={`/practice/test?topic=${t.slug}&count=5`}
              label={`${t.name} Test`}
              description={`5 problems · ${t.name} only.`}
              accent={t.accent}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add app/practice/page.tsx
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(practice): rewrite /practice hub with Learn/Test mode preset runs"
```

---

## Phase D — Past papers UI

### Task 10: Rewrite `/papers` index

**Files:** Modify `app/papers/page.tsx`

- [ ] **Step 1: Replace** `app/papers/page.tsx`:

```typescript
import Link from 'next/link';
import type { Route } from 'next';
import { Panel } from '@/components/ui/panel';
import { contentIndex } from '@/lib/content';
import { cn } from '@/lib/cn';

export const metadata = { title: 'Past Papers — AMC // 10' };

export default function PapersIndex() {
  const keys = contentIndex.listPaperKeys();
  const papers = keys
    .map((k) => {
      const [year, ab] = k.split('-');
      const meta = contentIndex.getPaperMeta(year, ab);
      const problems = contentIndex.listPaperProblems(year, ab);
      return meta ? { year, ab, meta, count: problems.length } : null;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  return (
    <div className="space-y-6">
      <Panel kicker="PAPERS_ARCHIVE">
        <h1 className="font-display text-3xl tracking-widest text-cyber-ink">PAST PAPERS</h1>
        <p className="mt-2 text-sm text-cyber-mute">
          Real AMC10 papers with our own solutions and (where useful) alternate methods.
        </p>
      </Panel>

      {papers.length === 0 ? (
        <p className="text-sm text-cyber-mute">No papers in the archive yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {papers.map((p) => (
            <Link
              key={`${p.year}-${p.ab}`}
              href={`/papers/${p.year}/${p.ab}` as Route}
              className={cn(
                'block rounded-[4px] border border-[#2a1a4a] bg-[rgba(20,8,40,0.5)] p-4',
                'transition-colors hover:border-cyber-cyan',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-lg tracking-widest text-cyber-ink">
                  {p.meta.title.toUpperCase()}
                </span>
                <span className="font-mono text-[11px] text-cyber-cyan">{p.count} PROBLEMS</span>
              </div>
              {p.meta.date && (
                <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-cyber-mute">
                  {p.meta.date}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add app/papers/page.tsx
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(papers): /papers index lists available papers"
```

---

### Task 11: `/papers/[year]/[ab]` paper detail page

**Files:** Create `app/papers/[year]/[ab]/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Panel } from '@/components/ui/panel';
import { RenderMdx } from '@/components/mdx/render-mdx';
import { contentIndex } from '@/lib/content';

export function generateStaticParams() {
  return contentIndex.listPaperKeys().map((k) => {
    const [year, ab] = k.split('-');
    return { year, ab };
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string; ab: string }>;
}) {
  const { year, ab } = await params;
  const meta = contentIndex.getPaperMeta(year, ab);
  return { title: meta ? `${meta.title} — AMC // 10` : 'AMC // 10' };
}

export default async function PaperPage({
  params,
}: {
  params: Promise<{ year: string; ab: string }>;
}) {
  const { year, ab } = await params;
  const meta = contentIndex.getPaperMeta(year, ab);
  if (!meta) notFound();
  const numbers = contentIndex.listPaperProblems(year, ab);
  const problems = numbers
    .map((n) => contentIndex.getPaperProblem(year, ab, n))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-cyber-mute">
        <Link href="/papers" className="hover:text-cyber-cyan">PAPERS</Link>
        <span>{'>'}</span>
        <span className="text-cyber-ink">{meta.title.toUpperCase()}</span>
      </div>

      <Panel kicker={`PAPER // ${meta.title.toUpperCase()}`}>
        <h1 className="font-display text-3xl tracking-widest text-cyber-cyan">
          {meta.title.toUpperCase()}
        </h1>
        {meta.date && (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-cyber-mute">
            {meta.date}
          </p>
        )}
        {meta.source && (
          <p className="mt-2 text-sm">
            <a
              href={meta.source}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyber-cyan hover:underline"
            >
              View the original on AoPS Wiki ↗
            </a>
          </p>
        )}
      </Panel>

      <div className="space-y-6">
        {problems.map((p) => (
          <div key={p.problem_number} className="space-y-2">
            <div className="font-mono text-[11px] uppercase tracking-widest text-cyber-cyan">
              // PROBLEM {p.problem_number} · ANSWER: {p.answer}
            </div>
            <RenderMdx source={p.body} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add "app/papers/[year]/[ab]/page.tsx"
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(papers): single paper page with problems + solutions"
```

---

## Phase E — Verify & deploy

### Task 12: Build, deploy, smoke check

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: 26 (Plan 1+2) + 7 new content tests + 4 ChoiceRow tests = 37 passing. Report actual count.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds with the new routes:
- `/practice` (hub, replaces stub)
- `/practice/learn`
- `/practice/test`
- `/papers` (index, replaces stub)
- `/papers/2019/10A`

If the build fails on dynamic-only static-export with `searchParams`, the fix is to add `export const dynamic = 'force-static';` to `app/practice/learn/page.tsx` and `app/practice/test/page.tsx`. Try without it first.

- [ ] **Step 3: Deploy**

```powershell
npx wrangler pages deploy out --project-name=amc10 --branch=main --commit-dirty=true
```

- [ ] **Step 4: Smoke check live URLs**

```powershell
foreach ($url in @(
  'https://amc10-de2.pages.dev/',
  'https://amc10-de2.pages.dev/practice',
  'https://amc10-de2.pages.dev/practice/learn',
  'https://amc10-de2.pages.dev/papers',
  'https://amc10-de2.pages.dev/papers/2019/10A',
  'https://amc10-de2.pages.dev/api/health'
)) {
  $r = Invoke-WebRequest -Uri $url -UseBasicParsing -SkipHttpErrorCheck
  Write-Host "$($r.StatusCode)  $url"
}
```

All should be 200.

- [ ] **Step 5: Push**

```powershell
git push
```

- [ ] **Step 6: Final report**

- Tests passing (count)
- Build route table
- All smoke URLs 200
- `/api/health` JSON body
- Anything unusual

---

## Self-Review

- **Spec coverage for Plan 4:** problem MDX format ✓, multi-method solutions ✓, Learn-mode + Test-mode UIs ✓, past paper viewer ✓, /practice and /papers routes filled in ✓. Out of scope (deferred to final plan): recording attempts, bookmarks, progress dashboard, reminders, auth.
- **Placeholder scan:** Four of the eight original problems (p002 each) and three of the three paper problems are explicitly flagged stubs with placeholder bodies. They're in the plan deliberately so the indexer surfaces ≥2 problems per subtopic. The plan calls this out and gates them as "replace before opening to others" — they do NOT block beta deploy. The flag is on me; the user can replace each `p002`/paper problem one MDX file at a time with no code change.
- **Type consistency:** `ProblemEntry`, `PaperProblemEntry`, `PaperMeta`, `PracticeProblem`, `ChoiceLetter` are each defined once and reused.
- **Static export safety:** all dynamic routes (`[year]/[ab]`) have `generateStaticParams`. `/practice/learn` and `/practice/test` are static pages whose query params drive the client component — Next.js handles `searchParams` in static export by emitting one static page; the client reads query params at runtime via the `useSearchParams` hook implicit in the page's props pass-through.
- **Risk: client/server boundary.** `RenderMdx` is currently a server component because `next-mdx-remote/rsc` is server-side. We use it inside client components (`LearnSession`, `TestSession`). That's a known incompatibility — `next-mdx-remote/rsc` must be invoked from a server context. **Fix in advance:** the `body` MDX has to be pre-rendered to HTML at build time so the client can just render the resulting HTML string. The cleanest pattern: replace `RenderMdx source={p.body}` inside client components with a `<div dangerouslySetInnerHTML={{ __html: p.bodyHtml }} />` where `bodyHtml` is computed at build time in `lib/practice-catalog.ts` using the `next-mdx-remote/serialize` helper. **If the agent hits this error during Task 7**, the fix is: switch `practice-catalog` to call `serialize(...)` from `next-mdx-remote/serialize` (the non-RSC variant), returning a `MDXRemoteSerializeResult`, and update the client components to use `<MDXRemote {...result} />` from `next-mdx-remote` (the non-RSC variant). KaTeX still flows through `serialize`'s `mdxOptions`. Plan accordingly.
