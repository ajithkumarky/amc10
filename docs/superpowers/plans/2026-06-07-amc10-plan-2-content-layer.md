# AMC10 — Plan 2: Content Layer (MDX + KaTeX + concept pages) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the topic tiles on the home page link to real concept pages: a `/learn` hub, `/learn/[topic]` overview pages, and `/learn/[topic]/[subtopic]` concept pages. Content is authored as MDX in `/content/`, rendered with KaTeX math support, and pre-rendered at build time so the static export still ships. Add stub pages for `/practice`, `/papers`, `/progress` so the nav doesn't 404.

**Architecture:** MDX content lives as files under `/content/concepts/<topic>/<subtopic>.mdx` with YAML frontmatter. A build-time indexer (`lib/content.ts`) walks the directory and surfaces a typed catalog. Pages use `next-mdx-remote/rsc` to render MDX in React Server Components. `remark-math` + `rehype-katex` render LaTeX (e.g., `$x^2 + 5x + 6 = 0$`) to KaTeX HTML. All routes use `generateStaticParams` so `output: 'export'` continues to work — no server runtime needed.

**Tech Stack additions:** `next-mdx-remote@5`, `remark-math@6`, `rehype-katex@7`, `katex@0.16`, `gray-matter@4`.

**Parallelism:** Phases A → B → C → D are serial. Within Phase B (Tasks 5–6) and Phase C (Task 11 — stub pages), files are disjoint and can be done quickly back-to-back.

---

## File Structure (locked at planning time)

```
amc10/
├── content/                              # NEW: all hand-authored content
│   └── concepts/
│       ├── algebra/
│       │   ├── index.mdx                 # topic overview
│       │   └── quadratics.mdx            # subtopic
│       ├── geometry/
│       │   ├── index.mdx
│       │   └── triangles.mdx
│       ├── number-theory/
│       │   ├── index.mdx
│       │   └── modular-arithmetic.mdx
│       └── counting-probability/
│           ├── index.mdx
│           └── permutations.mdx
├── lib/
│   ├── content.ts                        # NEW: scans content dir, returns typed catalog
│   └── (existing) cn.ts, topics.ts
├── components/
│   ├── mdx/
│   │   └── render-mdx.tsx                # NEW: wraps MDXRemote with KaTeX + custom components
│   ├── ui/
│   │   └── subtopic-card.tsx             # NEW: card in topic page listing subtopics
│   └── (existing) nav, ui/*, theme/*
├── app/
│   ├── learn/
│   │   ├── page.tsx                      # NEW: /learn hub
│   │   ├── [topic]/
│   │   │   ├── page.tsx                  # NEW: /learn/<topic>
│   │   │   └── [subtopic]/
│   │   │       └── page.tsx              # NEW: /learn/<topic>/<subtopic>
│   ├── practice/page.tsx                 # NEW: stub
│   ├── papers/page.tsx                   # NEW: stub
│   ├── progress/page.tsx                 # NEW: stub
│   └── globals.css                       # MODIFY: import katex.css
└── tests/
    └── lib/
        └── content.test.ts               # NEW: indexer tests
```

Working directory: `C:/Users/ajith/play/amc10`. PowerShell tool for `npm` and `git` commands (Bash mis-resolves npx.cmd; that's a known Windows quirk we hit in Plan 1).

---

## Phase A — Foundation: deps, indexer, MDX wrapper (serial)

### Task 1: Install MDX + KaTeX dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime deps**

Run (PowerShell):
```powershell
npm install --save next-mdx-remote@5.0.0 remark-math@6.0.0 rehype-katex@7.0.1 katex@0.16.11 gray-matter@4.0.3
```
Expected: package.json gets the five new dependencies. If `--legacy-peer-deps` is needed, add it.

- [ ] **Step 2: Install type definitions**

Run:
```powershell
npm install --save-dev @types/katex@0.16.7
```

- [ ] **Step 3: Verify install**

Run: `npm test`
Expected: all 17 tests from Plan 1 still pass. No regressions.

- [ ] **Step 4: Commit**

```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add package.json package-lock.json
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "chore: install next-mdx-remote, remark-math, rehype-katex, katex, gray-matter"
```

---

### Task 2: Content indexer (TDD)

**Files:**
- Create: `lib/content.ts`
- Test: `tests/lib/content.test.ts`
- Test fixture: `tests/lib/__fixtures__/content/concepts/algebra/index.mdx`, `tests/lib/__fixtures__/content/concepts/algebra/quadratics.mdx`

**Context:** The indexer reads MDX files from a content root, parses frontmatter, and exposes typed accessors. It MUST be a server-only module (uses `node:fs`) — so it can only be imported from RSC, route handlers, or `generateStaticParams`. We'll make tests pass against a fixture directory under `tests/lib/__fixtures__/content` so the indexer is testable without coupling to the real `/content` tree.

- [ ] **Step 1: Create fixture files**

Create `tests/lib/__fixtures__/content/concepts/algebra/index.mdx`:
```mdx
---
title: Algebra
summary: Equations, functions, and algebraic manipulation.
---

# Algebra

This is the algebra overview.
```

Create `tests/lib/__fixtures__/content/concepts/algebra/quadratics.mdx`:
```mdx
---
title: Quadratics
summary: Working with quadratic equations.
difficulty: 2
---

# Quadratics

Solving $x^2 + 5x + 6 = 0$ by factoring.
```

- [ ] **Step 2: Write the failing tests**

Create `tests/lib/content.test.ts`:
```typescript
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createContentIndex } from '@/lib/content';

const FIXTURE_ROOT = path.resolve(__dirname, '__fixtures__/content');

describe('createContentIndex', () => {
  const index = createContentIndex(FIXTURE_ROOT);

  it('lists all topics that have an index.mdx', () => {
    expect(index.listTopicSlugs().sort()).toEqual(['algebra']);
  });

  it('returns a topic entry with frontmatter title and summary', () => {
    const topic = index.getTopic('algebra');
    expect(topic?.title).toBe('Algebra');
    expect(topic?.summary).toContain('Equations');
    expect(topic?.body).toContain('algebra overview');
  });

  it('lists subtopics for a topic (excludes index.mdx)', () => {
    expect(index.listSubtopicSlugs('algebra')).toEqual(['quadratics']);
  });

  it('returns subtopic entry with frontmatter and body', () => {
    const sub = index.getSubtopic('algebra', 'quadratics');
    expect(sub?.title).toBe('Quadratics');
    expect(sub?.summary).toBe('Working with quadratic equations.');
    expect(sub?.difficulty).toBe(2);
    expect(sub?.body).toContain('$x^2 + 5x + 6 = 0$');
  });

  it('returns undefined for unknown topic / subtopic', () => {
    expect(index.getTopic('nope')).toBeUndefined();
    expect(index.getSubtopic('algebra', 'nope')).toBeUndefined();
    expect(index.getSubtopic('nope', 'quadratics')).toBeUndefined();
  });

  it('listAllSubtopics returns flat (topic, subtopic) tuples for static params', () => {
    expect(index.listAllSubtopics()).toEqual([
      { topic: 'algebra', subtopic: 'quadratics' },
    ]);
  });
});
```

- [ ] **Step 3: Run failing tests**

Run: `npm test -- tests/lib/content.test.ts`
Expected: FAIL — cannot resolve `@/lib/content`.

- [ ] **Step 4: Implement `lib/content.ts`**

Create `lib/content.ts`:
```typescript
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export interface TopicEntry {
  slug: string;
  title: string;
  summary: string;
  body: string;
}

export interface SubtopicEntry {
  topic: string;
  slug: string;
  title: string;
  summary: string;
  difficulty?: number;
  body: string;
}

export interface ContentIndex {
  listTopicSlugs(): string[];
  getTopic(slug: string): TopicEntry | undefined;
  listSubtopicSlugs(topic: string): string[];
  getSubtopic(topic: string, slug: string): SubtopicEntry | undefined;
  listAllSubtopics(): { topic: string; subtopic: string }[];
}

function readMdx(filePath: string): { data: Record<string, unknown>; content: string } | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  return { data, content };
}

export function createContentIndex(rootDir: string): ContentIndex {
  const conceptsRoot = path.join(rootDir, 'concepts');

  function topicDir(topic: string): string {
    return path.join(conceptsRoot, topic);
  }

  function topicSlugsDir(): string[] {
    if (!fs.existsSync(conceptsRoot)) return [];
    return fs
      .readdirSync(conceptsRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .filter((name) => fs.existsSync(path.join(conceptsRoot, name, 'index.mdx')))
      .sort();
  }

  function subSlugsDir(topic: string): string[] {
    const dir = topicDir(topic);
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.mdx') && f !== 'index.mdx')
      .map((f) => f.slice(0, -4))
      .sort();
  }

  return {
    listTopicSlugs(): string[] {
      return topicSlugsDir();
    },

    getTopic(slug: string): TopicEntry | undefined {
      const file = readMdx(path.join(topicDir(slug), 'index.mdx'));
      if (!file) return undefined;
      return {
        slug,
        title: String(file.data.title ?? slug),
        summary: String(file.data.summary ?? ''),
        body: file.content,
      };
    },

    listSubtopicSlugs(topic: string): string[] {
      return subSlugsDir(topic);
    },

    getSubtopic(topic: string, slug: string): SubtopicEntry | undefined {
      const file = readMdx(path.join(topicDir(topic), `${slug}.mdx`));
      if (!file) return undefined;
      const difficulty =
        typeof file.data.difficulty === 'number' ? (file.data.difficulty as number) : undefined;
      return {
        topic,
        slug,
        title: String(file.data.title ?? slug),
        summary: String(file.data.summary ?? ''),
        difficulty,
        body: file.content,
      };
    },

    listAllSubtopics(): { topic: string; subtopic: string }[] {
      const out: { topic: string; subtopic: string }[] = [];
      for (const t of topicSlugsDir()) {
        for (const s of subSlugsDir(t)) out.push({ topic: t, subtopic: s });
      }
      return out;
    },
  };
}

/** Default singleton bound to the project's /content directory. */
export const contentIndex: ContentIndex = createContentIndex(
  path.join(process.cwd(), 'content'),
);
```

- [ ] **Step 5: Re-run tests**

Run: `npm test -- tests/lib/content.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add lib/content.ts tests/lib/content.test.ts tests/lib/__fixtures__/
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(content): MDX indexer with topic/subtopic accessors"
```

---

### Task 3: MDX rendering wrapper with KaTeX

**Files:**
- Create: `components/mdx/render-mdx.tsx`
- Modify: `app/globals.css` (one-line katex CSS import)

- [ ] **Step 1: Add KaTeX CSS import to `app/globals.css`**

Edit `app/globals.css` — add this line at the very top, before `@tailwind base;`:
```css
@import 'katex/dist/katex.min.css';
```

The full top of the file should now look like:
```css
@import 'katex/dist/katex.min.css';

@tailwind base;
@tailwind components;
@tailwind utilities;

/* ... rest unchanged ... */
```

- [ ] **Step 2: Create the MDX render wrapper**

Create `components/mdx/render-mdx.tsx`:
```typescript
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { MDXComponents } from 'mdx/types';
import { cn } from '@/lib/cn';

const proseClasses = cn(
  'prose prose-invert max-w-none',
  'prose-headings:font-display prose-headings:tracking-widest prose-headings:text-cyber-ink',
  'prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl',
  'prose-p:text-cyber-mute prose-p:leading-relaxed',
  'prose-strong:text-cyber-ink',
  'prose-a:text-cyber-cyan hover:prose-a:underline',
  'prose-code:text-cyber-amber prose-code:font-mono',
  'prose-li:text-cyber-mute',
);

const components: MDXComponents = {};

export interface RenderMdxProps {
  source: string;
  className?: string;
}

export function RenderMdx({ source, className }: RenderMdxProps) {
  return (
    <div className={cn(proseClasses, className)}>
      <MDXRemote
        source={source}
        components={components}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkMath],
            rehypePlugins: [[rehypeKatex, { strict: false }]],
          },
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Add `@tailwindcss/typography` so the `prose` classes work**

Run (PowerShell):
```powershell
npm install --save-dev @tailwindcss/typography@0.5.15
```

Edit `tailwind.config.ts` — add the plugin to the `plugins` array:
```typescript
import typography from '@tailwindcss/typography';
// ...
const config: Config = {
  // ...
  plugins: [typography],
};
```

- [ ] **Step 4: Verify build still passes**

Run: `npm test` then `npm run build`
Expected: tests pass, build succeeds. (The MDX wrapper isn't used yet — we're just confirming no regression from the deps + CSS.)

- [ ] **Step 5: Commit**

```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add components/mdx/render-mdx.tsx app/globals.css tailwind.config.ts package.json package-lock.json
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(mdx): RenderMdx wrapper with KaTeX + tailwind typography"
```

---

## Phase B — Content authoring (Tasks 4–5 are mostly independent)

### Task 4: Four topic-index MDX files

**Files:**
- Create: `content/concepts/algebra/index.mdx`
- Create: `content/concepts/geometry/index.mdx`
- Create: `content/concepts/number-theory/index.mdx`
- Create: `content/concepts/counting-probability/index.mdx`

- [ ] **Step 1: `content/concepts/algebra/index.mdx`**

```mdx
---
title: Algebra
summary: Equations, inequalities, polynomials, functions, and sequences — the largest single category on AMC10.
---

## What Algebra means on the AMC10

Roughly a third of every AMC10 paper tests algebraic reasoning. You will see:

- **Linear and quadratic equations** and systems of them
- **Polynomials** — factoring, roots, Vieta's formulas
- **Exponents and logarithms** — rules and clever rewrites
- **Functions** — domain/range, composition, simple transformations
- **Sequences and series** — arithmetic, geometric, telescoping

The key skill is **noticing structure** so you can pick the fast solution.
Many AMC10 algebra problems have an "ugly" path and a one-line path; the goal of
this section is to train your eye for the second.

## How to use this section

Pick a subtopic, read the concept page, then jump into Practice. Each problem
includes the primary solution and (where useful) an alternate method.
```

- [ ] **Step 2: `content/concepts/geometry/index.mdx`**

```mdx
---
title: Geometry
summary: Triangles, circles, polygons, coordinate geometry, and a little trig — about a quarter of every paper.
---

## What Geometry means on the AMC10

Geometry on the AMC10 rewards **drawing carefully** and **seeing similar
triangles**. The recurring tools:

- **Triangles** — congruence, similarity, the Pythagorean theorem, special right triangles
- **Circles** — central and inscribed angles, power of a point, chords and tangents
- **Polygons** — interior angles, areas via decomposition
- **Coordinate geometry** — distance, slope, midpoint, intersections
- **Three-dimensional figures** — volume and surface area of prisms, pyramids, cones, cylinders, spheres
- **Trigonometry basics** — sine and cosine of common angles, the Law of Cosines when needed

If you find yourself doing heavy algebra on a geometry problem, stop and look
for a similar-triangles shortcut. There almost always is one.
```

- [ ] **Step 3: `content/concepts/number-theory/index.mdx`**

```mdx
---
title: Number Theory
summary: Divisibility, primes, modular arithmetic, GCD/LCM, digits, and bases.
---

## What Number Theory means on the AMC10

Number theory questions are about the **structure of the integers**. The most
common tools:

- **Divisibility and primes** — divisibility tests, prime factorization
- **GCD and LCM** — the relationship $\gcd(a,b)\cdot\mathrm{lcm}(a,b) = a\cdot b$
- **Modular arithmetic** — solving "what is the remainder when..." problems quickly
- **Digit problems** — units digit, sum of digits, palindromes
- **Number bases** — converting and reasoning in non-base-10

A surprising fraction of these problems collapse to **mod 9** or **mod 10**
tricks once you spot the pattern.
```

- [ ] **Step 4: `content/concepts/counting-probability/index.mdx`**

```mdx
---
title: Counting & Probability
summary: Combinatorics, permutations, probability, expected value, and the pigeonhole principle.
---

## What Counting & Probability mean on the AMC10

This section is about **counting carefully without double-counting** and
**translating word problems into probability expressions**. Key tools:

- **Counting principles** — addition, multiplication, complementary counting
- **Permutations and combinations** — $P(n,r)$ and $\binom{n}{r}$
- **The pigeonhole principle** — "with $k$ pigeonholes and $k+1$ pigeons..."
- **Probability basics** — favorable / total, independence, conditional
- **Expected value** — weighted averages of outcomes
- **Geometric probability** — area- or length-based probability

When stuck, try **complementary counting** ("what's the probability it does
*not* happen") — it cuts many problems in half.
```

- [ ] **Step 5: Commit**

```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add content/concepts/
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "content: four topic overview pages (algebra/geometry/nt/cp)"
```

---

### Task 5: Four sample subtopic MDX files (one per topic)

**Files:**
- Create: `content/concepts/algebra/quadratics.mdx`
- Create: `content/concepts/geometry/triangles.mdx`
- Create: `content/concepts/number-theory/modular-arithmetic.mdx`
- Create: `content/concepts/counting-probability/permutations.mdx`

- [ ] **Step 1: `content/concepts/algebra/quadratics.mdx`**

```mdx
---
title: Quadratics
summary: Solving and reasoning about quadratic equations on the AMC10.
difficulty: 2
---

## The toolkit

A quadratic equation is anything you can rewrite as

$$ax^2 + bx + c = 0$$

with $a \ne 0$. The three things you should be able to do quickly:

1. **Factor**, when the roots are integer-ish: $x^2 + 5x + 6 = (x+2)(x+3) = 0$.
2. **Use the quadratic formula** when factoring doesn't fall out:

$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}.$$

3. **Use Vieta's formulas** — without solving:
   - **Sum of roots:** $r_1 + r_2 = -\dfrac{b}{a}$
   - **Product of roots:** $r_1 r_2 = \dfrac{c}{a}$

Vieta is the single biggest time-saver on AMC10 quadratics. Most "find the
sum/product of values of $x$" problems are one-liners with Vieta.

## Worked example

> If $x^2 + 5x + 6 = 0$, what is the sum of all distinct values of $x$?

By Vieta, the sum of roots is $-\dfrac{5}{1} = -5$. Done — no factoring needed.

## When to slow down

If the problem asks for a specific root (not the sum/product), you usually need
to factor or use the formula. If the discriminant $b^2 - 4ac$ is a perfect
square, factoring will work.
```

- [ ] **Step 2: `content/concepts/geometry/triangles.mdx`**

```mdx
---
title: Triangles
summary: Congruence, similarity, the Pythagorean theorem, and special right triangles.
difficulty: 2
---

## What you should know cold

- **Triangle inequality:** the sum of any two sides exceeds the third.
- **Angle sum:** $180°$ for every triangle.
- **Pythagorean theorem:** for a right triangle with legs $a$, $b$ and hypotenuse $c$,
  $a^2 + b^2 = c^2$.
- **Special right triangles** — memorize the side ratios:
  - **45–45–90:** $1 : 1 : \sqrt{2}$
  - **30–60–90:** $1 : \sqrt{3} : 2$
- **Similar triangles:** when two triangles have the same angles, their sides are
  in proportion. This is the *single most useful tool* on AMC10 geometry.

## Worked example

> A right triangle has legs 5 and 12. Find the length of the altitude from the
> right angle to the hypotenuse.

The hypotenuse is $\sqrt{5^2 + 12^2} = 13$. Use the area two ways: the area is
$\tfrac{1}{2}\cdot 5\cdot 12 = 30$, and it is also $\tfrac{1}{2}\cdot 13\cdot h$
where $h$ is the altitude. So $h = \dfrac{60}{13}$.

## Habit to build

On every triangle problem, look for a similar triangle before reaching for the
Law of Cosines or coordinate bashing. Nine times out of ten, similarity wins.
```

- [ ] **Step 3: `content/concepts/number-theory/modular-arithmetic.mdx`**

```mdx
---
title: Modular Arithmetic
summary: Reasoning about remainders without doing the division.
difficulty: 3
---

## The idea

We write $a \equiv b \pmod{n}$ to mean "$a$ and $b$ have the same remainder
when divided by $n$." Equivalently, $n$ divides $a - b$.

For example, $17 \equiv 2 \pmod{5}$ because $17 = 3\cdot 5 + 2$.

## Why it matters on AMC10

Many problems ask for a units digit, a remainder, or a divisibility property.
Working mod 10 (units digit) or mod 9 (digit sum) turns ugly arithmetic into
small-number arithmetic.

## Rules you can use

Modular arithmetic respects addition, subtraction, and multiplication:

$$a \equiv b \pmod n \;\text{and}\; c \equiv d \pmod n \implies a + c \equiv b + d \pmod n$$
$$\text{and}\; a\cdot c \equiv b\cdot d \pmod n.$$

Division is trickier and only works if $\gcd(\text{divisor}, n) = 1$.

## Worked example

> What is the units digit of $7^{2024}$?

Work mod 10. The units digit of $7^k$ cycles: $7, 9, 3, 1, 7, 9, 3, 1, \ldots$,
with period 4. Since $2024 = 4 \cdot 506$, we're at the end of a cycle, so
$7^{2024} \equiv 1 \pmod{10}$. The units digit is $1$.
```

- [ ] **Step 4: `content/concepts/counting-probability/permutations.mdx`**

```mdx
---
title: Permutations & Combinations
summary: Ordered and unordered counting — when to use which.
difficulty: 2
---

## The two formulas

- **Permutations** (order matters): the number of ways to arrange $r$ items
  chosen from $n$ distinct items is
$$P(n, r) = \frac{n!}{(n-r)!}.$$
- **Combinations** (order doesn't matter): the number of ways to choose $r$
  items from $n$ distinct items is
$$\binom{n}{r} = \frac{n!}{r!\,(n-r)!}.$$

The relationship: $\binom{n}{r} = \dfrac{P(n,r)}{r!}$ — divide out the orderings
you're not distinguishing.

## When to use which

- "How many ways to arrange / line up / order?" → permutation.
- "How many ways to **choose** / pick a team / a subset?" → combination.
- "How many distinct seating arrangements around a round table?" → circular permutation,
  which is $(n-1)!$ because rotations are equivalent.

## Worked example

> A 4-person committee is chosen from a group of 10. How many different
> committees are possible?

Order doesn't matter (committees are unordered), so the answer is
$$\binom{10}{4} = \frac{10!}{4!\,6!} = 210.$$

## Common trap

If the problem says "the committee has a chair, a treasurer, and two members,"
you are picking roles — that's an ordered situation in disguise. Use
permutations (or pick the chair, then the treasurer, then a combination for
the remaining two).
```

- [ ] **Step 5: Commit**

```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add content/concepts/
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "content: four sample subtopic concept pages with KaTeX math"
```

---

## Phase C — Routes & UI components (serial)

### Task 6: `SubtopicCard` component (TDD)

**Files:**
- Create: `components/ui/subtopic-card.tsx`
- Test: `tests/components/subtopic-card.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/subtopic-card.test.tsx`:
```typescript
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubtopicCard } from '@/components/ui/subtopic-card';

describe('SubtopicCard', () => {
  it('renders title and summary', () => {
    render(
      <SubtopicCard
        topic="algebra"
        slug="quadratics"
        title="Quadratics"
        summary="Working with quadratic equations."
        accent="#ff2e9c"
      />,
    );
    expect(screen.getByText('Quadratics')).toBeInTheDocument();
    expect(screen.getByText(/quadratic equations/i)).toBeInTheDocument();
  });

  it('links to /learn/<topic>/<subtopic>', () => {
    render(
      <SubtopicCard
        topic="algebra"
        slug="quadratics"
        title="Quadratics"
        summary="x"
        accent="#ff2e9c"
      />,
    );
    expect(screen.getByRole('link').getAttribute('href')).toBe('/learn/algebra/quadratics');
  });

  it('shows difficulty as dots when provided', () => {
    const { container } = render(
      <SubtopicCard
        topic="algebra"
        slug="quadratics"
        title="Q"
        summary="x"
        accent="#ff2e9c"
        difficulty={2}
      />,
    );
    const dots = container.querySelectorAll('[data-testid="difficulty-dot"]');
    expect(dots.length).toBe(5);
    const active = container.querySelectorAll('[data-testid="difficulty-dot"][data-active="true"]');
    expect(active.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `npm test -- tests/components/subtopic-card.test.tsx`
Expected: FAIL — cannot resolve `@/components/ui/subtopic-card`.

- [ ] **Step 3: Implement `components/ui/subtopic-card.tsx`**

Create `components/ui/subtopic-card.tsx`:
```typescript
import Link from 'next/link';
import type { Route } from 'next';
import { cn } from '@/lib/cn';

export interface SubtopicCardProps {
  topic: string;
  slug: string;
  title: string;
  summary: string;
  accent: string;
  difficulty?: number;
  className?: string;
}

export function SubtopicCard({
  topic,
  slug,
  title,
  summary,
  accent,
  difficulty,
  className,
}: SubtopicCardProps) {
  return (
    <Link
      href={`/learn/${topic}/${slug}` as Route}
      className={cn(
        'block rounded-[4px] border border-[#2a1a4a] bg-[rgba(20,8,40,0.5)] p-4',
        'transition-colors hover:border-cyber-cyan',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className="font-display text-lg tracking-widest text-cyber-ink"
          style={{ color: accent }}
        >
          {title.toUpperCase()}
        </span>
        {typeof difficulty === 'number' && (
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                data-testid="difficulty-dot"
                data-active={i < difficulty}
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  i < difficulty ? 'bg-cyber-cyan' : 'bg-[#2a1a4a]',
                )}
              />
            ))}
          </div>
        )}
      </div>
      <p className="mt-2 text-sm text-cyber-mute">{summary}</p>
    </Link>
  );
}
```

- [ ] **Step 4: Re-run test**

Run: `npm test -- tests/components/subtopic-card.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add components/ui/subtopic-card.tsx tests/components/subtopic-card.test.tsx
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(ui): SubtopicCard with difficulty dots"
```

---

### Task 7: `/learn` hub page

**Files:**
- Create: `app/learn/page.tsx`

- [ ] **Step 1: Implement the page**

Create `app/learn/page.tsx`:
```typescript
import { Panel } from '@/components/ui/panel';
import { TopicTile } from '@/components/ui/topic-tile';
import { TOPICS } from '@/lib/topics';

export const metadata = {
  title: 'Learn — AMC // 10',
};

export default function LearnHub() {
  return (
    <div className="space-y-6">
      <Panel kicker="LEARN_HUB">
        <h1 className="font-display text-3xl tracking-widest text-cyber-ink">
          PICK A MISSION
        </h1>
        <p className="mt-2 text-sm text-cyber-mute">
          Each topic has a short concept page and a list of subtopics. Read the
          concept, then jump into Practice when ready.
        </p>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2">
        {TOPICS.map((t) => (
          <TopicTile key={t.slug} slug={t.slug} name={t.name} progress={0} accent={t.accent} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add app/learn/page.tsx
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(learn): /learn hub page"
```

---

### Task 8: `/learn/[topic]` page

**Files:**
- Create: `app/learn/[topic]/page.tsx`

**Context:** This is a dynamic route. For static export we MUST provide `generateStaticParams`. Topics come from `lib/topics.ts` (the canonical four), but we should also verify each topic has a content file via `contentIndex`.

- [ ] **Step 1: Implement the page**

Create `app/learn/[topic]/page.tsx`:
```typescript
import { notFound } from 'next/navigation';
import { Panel } from '@/components/ui/panel';
import { SubtopicCard } from '@/components/ui/subtopic-card';
import { RenderMdx } from '@/components/mdx/render-mdx';
import { contentIndex } from '@/lib/content';
import { TOPICS, getTopic } from '@/lib/topics';

export function generateStaticParams() {
  return TOPICS.map((t) => ({ topic: t.slug }));
}

export function generateMetadata({ params }: { params: { topic: string } }) {
  const topic = getTopic(params.topic);
  return {
    title: topic ? `${topic.name} — AMC // 10` : 'AMC // 10',
  };
}

export default async function TopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: topicSlug } = await params;
  const topicMeta = getTopic(topicSlug);
  const topicEntry = contentIndex.getTopic(topicSlug);
  if (!topicMeta || !topicEntry) notFound();

  const subSlugs = contentIndex.listSubtopicSlugs(topicSlug);
  const subs = subSlugs
    .map((s) => contentIndex.getSubtopic(topicSlug, s))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  return (
    <div className="space-y-6">
      <Panel kicker={`TOPIC // ${topicMeta.name.toUpperCase()}`}>
        <h1
          className="font-display text-3xl tracking-widest"
          style={{ color: topicMeta.accent }}
        >
          {topicEntry.title.toUpperCase()}
        </h1>
        <p className="mt-2 text-sm text-cyber-mute">{topicEntry.summary}</p>
      </Panel>

      <RenderMdx source={topicEntry.body} />

      <div className="space-y-3">
        <h2 className="font-display text-xl tracking-widest text-cyber-ink">
          SUBTOPICS
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {subs.map((s) => (
            <SubtopicCard
              key={s.slug}
              topic={topicSlug}
              slug={s.slug}
              title={s.title}
              summary={s.summary}
              difficulty={s.difficulty}
              accent={topicMeta.accent}
            />
          ))}
        </div>
        {subs.length === 0 && (
          <p className="text-sm text-cyber-mute">More subtopics coming soon.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add app/learn/[topic]/page.tsx
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(learn): topic page with MDX body and subtopic cards"
```

---

### Task 9: `/learn/[topic]/[subtopic]` page

**Files:**
- Create: `app/learn/[topic]/[subtopic]/page.tsx`

- [ ] **Step 1: Implement the page**

Create `app/learn/[topic]/[subtopic]/page.tsx`:
```typescript
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Panel } from '@/components/ui/panel';
import { Chip } from '@/components/ui/chip';
import { RenderMdx } from '@/components/mdx/render-mdx';
import { contentIndex } from '@/lib/content';
import { getTopic } from '@/lib/topics';

export function generateStaticParams() {
  return contentIndex.listAllSubtopics().map(({ topic, subtopic }) => ({
    topic,
    subtopic,
  }));
}

export function generateMetadata({
  params,
}: {
  params: { topic: string; subtopic: string };
}) {
  const sub = contentIndex.getSubtopic(params.topic, params.subtopic);
  const topic = getTopic(params.topic);
  if (!sub || !topic) return { title: 'AMC // 10' };
  return { title: `${sub.title} · ${topic.name} — AMC // 10` };
}

export default async function SubtopicPage({
  params,
}: {
  params: Promise<{ topic: string; subtopic: string }>;
}) {
  const { topic: topicSlug, subtopic: subSlug } = await params;
  const topicMeta = getTopic(topicSlug);
  const sub = contentIndex.getSubtopic(topicSlug, subSlug);
  if (!topicMeta || !sub) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-cyber-mute">
        <Link href="/learn" className="hover:text-cyber-cyan">
          LEARN
        </Link>
        <span>{'>'}</span>
        <Link
          href={`/learn/${topicSlug}` as Route}
          className="hover:text-cyber-cyan"
          style={{ color: topicMeta.accent }}
        >
          {topicMeta.name.toUpperCase()}
        </Link>
        <span>{'>'}</span>
        <span className="text-cyber-ink">{sub.title.toUpperCase()}</span>
      </div>

      <Panel kicker={`CONCEPT // ${topicMeta.name.toUpperCase()}`}>
        <h1
          className="font-display text-3xl tracking-widest"
          style={{ color: topicMeta.accent }}
        >
          {sub.title.toUpperCase()}
        </h1>
        <p className="mt-2 text-sm text-cyber-mute">{sub.summary}</p>
        <div className="mt-4">
          <Chip href="/practice">PRACTICE THIS SECTION</Chip>
        </div>
      </Panel>

      <RenderMdx source={sub.body} />
    </div>
  );
}
```

**Note:** Add `import type { Route } from 'next';` at the top alongside the other imports.

The final import block should look like:
```typescript
import Link from 'next/link';
import type { Route } from 'next';
import { notFound } from 'next/navigation';
import { Panel } from '@/components/ui/panel';
import { Chip } from '@/components/ui/chip';
import { RenderMdx } from '@/components/mdx/render-mdx';
import { contentIndex } from '@/lib/content';
import { getTopic } from '@/lib/topics';
```

- [ ] **Step 2: Commit**

```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add app/learn/[topic]/[subtopic]/page.tsx
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(learn): subtopic concept page with MDX body and breadcrumb"
```

---

### Task 10: Stub pages for `/practice`, `/papers`, `/progress`

**Files:**
- Create: `app/practice/page.tsx`
- Create: `app/papers/page.tsx`
- Create: `app/progress/page.tsx`

**Context:** The nav links to these routes. Until Plans 3–5 implement them, they should render themed "Coming soon" placeholders rather than 404.

- [ ] **Step 1: `app/practice/page.tsx`**

Create:
```typescript
import { Panel } from '@/components/ui/panel';
import { Chip } from '@/components/ui/chip';

export const metadata = { title: 'Practice — AMC // 10' };

export default function PracticeStub() {
  return (
    <Panel kicker="PRACTICE // LOCKED">
      <h1 className="font-display text-3xl tracking-widest text-cyber-pink">
        SECTOR INCOMING
      </h1>
      <p className="mt-2 text-sm text-cyber-mute">
        Practice missions ship in the next milestone (sign-in + problem drills).
        For now, study the concept pages and bookmark sections you want to drill.
      </p>
      <div className="mt-4">
        <Chip href="/learn">BROWSE CONCEPTS</Chip>
      </div>
    </Panel>
  );
}
```

- [ ] **Step 2: `app/papers/page.tsx`**

Create:
```typescript
import { Panel } from '@/components/ui/panel';
import { Chip } from '@/components/ui/chip';

export const metadata = { title: 'Past Papers — AMC // 10' };

export default function PapersStub() {
  return (
    <Panel kicker="PAPERS // LOCKED">
      <h1 className="font-display text-3xl tracking-widest text-cyber-pink">
        ARCHIVE INCOMING
      </h1>
      <p className="mt-2 text-sm text-cyber-mute">
        Past AMC10 papers with our solutions land after the practice milestone.
        Each paper will include a primary solution and at least one alternate
        method per problem.
      </p>
      <div className="mt-4">
        <Chip href="/learn">BROWSE CONCEPTS</Chip>
      </div>
    </Panel>
  );
}
```

- [ ] **Step 3: `app/progress/page.tsx`**

Create:
```typescript
import { Panel } from '@/components/ui/panel';
import { Chip } from '@/components/ui/chip';

export const metadata = { title: 'Progress — AMC // 10' };

export default function ProgressStub() {
  return (
    <Panel kicker="STATS // LOCKED">
      <h1 className="font-display text-3xl tracking-widest text-cyber-pink">
        NO RUN DATA YET
      </h1>
      <p className="mt-2 text-sm text-cyber-mute">
        Progress tracking unlocks when you sign in and complete your first
        practice mission. Coming with the auth milestone.
      </p>
      <div className="mt-4">
        <Chip href="/learn">BROWSE CONCEPTS</Chip>
      </div>
    </Panel>
  );
}
```

- [ ] **Step 4: Commit**

```powershell
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" add app/practice/page.tsx app/papers/page.tsx app/progress/page.tsx
git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" commit -m "feat(stubs): themed coming-soon pages for /practice, /papers, /progress"
```

---

## Phase D — Verification & deploy (serial)

### Task 11: Full test suite + Next.js build

**No new files.**

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: ALL tests pass — at minimum 17 (Plan 1) + 6 (content indexer) + 3 (subtopic card) = 26. If anything fails, STOP and report BLOCKED.

- [ ] **Step 2: Run the build**

Run (PowerShell): `npm run build`
Expected: build succeeds, exports static output to `out/`. Route table should include:
- `/`
- `/_not-found`
- `/learn`
- `/learn/algebra`
- `/learn/geometry`
- `/learn/number-theory`
- `/learn/counting-probability`
- `/learn/algebra/quadratics`
- `/learn/geometry/triangles`
- `/learn/number-theory/modular-arithmetic`
- `/learn/counting-probability/permutations`
- `/practice`
- `/papers`
- `/progress`

If the build fails with a typed-routes error on the `as Route` casts, that's expected and likely fine; just verify the final route table.

If it fails because of MDX rendering at build time, capture the exact error and report.

- [ ] **Step 3: Verify a sample page rendered KaTeX correctly**

Run: `Select-String -Path out/learn/algebra/quadratics.html -Pattern "katex"`
Expected: matches found — the static HTML should contain rendered KaTeX HTML (look for `<span class="katex">` or similar). If no match, KaTeX isn't being applied — investigate (likely a rehype-katex setup issue).

---

### Task 12: Deploy to Cloudflare Pages

**No new files.**

- [ ] **Step 1: Deploy via wrangler**

Run (PowerShell):
```powershell
npx wrangler pages deploy out --project-name=amc10 --branch=main --commit-dirty=true
```
Expected: "Deployment complete!" with a preview URL like `https://<hash>.amc10-de2.pages.dev`.

- [ ] **Step 2: Verify the deployed home page is unchanged**

```powershell
Invoke-WebRequest -Uri https://amc10-de2.pages.dev/ -UseBasicParsing | Select-Object -ExpandProperty StatusCode
```
Expected: 200.

- [ ] **Step 3: Verify the new `/learn` hub is live**

```powershell
Invoke-WebRequest -Uri https://amc10-de2.pages.dev/learn -UseBasicParsing | Select-Object -ExpandProperty StatusCode
```
Expected: 200.

- [ ] **Step 4: Verify a subtopic page renders KaTeX**

```powershell
$body = (Invoke-WebRequest -Uri https://amc10-de2.pages.dev/learn/algebra/quadratics -UseBasicParsing).Content
$body -match 'class="katex"'
```
Expected: `True`.

- [ ] **Step 5: Push to GitHub**

```powershell
git push
```
Expected: pushes the ~8 new commits from this plan to origin/main.

- [ ] **Step 6: Final report**

Report: number of tests passing, number of routes in the build, the deploy URL, and a confirmation that KaTeX renders in the static HTML.

---

## Self-Review

- **Spec coverage:** `/learn` hub, `/learn/[topic]`, `/learn/[topic]/[subtopic]`, MDX with KaTeX, content stored as MDX in repo, stub pages for the other routes. Matches Plan 2 scope from the spec.
- **Placeholder scan:** no TBDs; every file's full content is in the plan.
- **Type consistency:** `TopicEntry`, `SubtopicEntry`, `ContentIndex`, `SubtopicCardProps`, `RenderMdxProps` defined once and reused. `getTopic` (from `lib/topics.ts`) is the canonical topic-metadata accessor; `contentIndex.getTopic` is the canonical MDX-content accessor — distinct names by design.
- **Static export safety:** every dynamic route has `generateStaticParams`. No runtime data fetching. `lib/content.ts` uses Node `fs` only via build-time-safe RSC imports.
- **Risk: MDX async params.** Next.js 15 makes route params async (returned as a `Promise`). Tasks 8 and 9 use `await params` per the modern App Router signature. If this breaks at build time (older type definitions), the fix is to remove the `Promise` wrapper and access `params` synchronously — but Next 15.0.3 expects the Promise form.
- **Risk: typed routes + dynamic href.** The `as Route` cast on `Link href={`/learn/${slug}/${sub}` as Route}` keeps typedRoutes quiet while still allowing dynamic paths. We added this pattern in Plan 1's verification fix, so it's already familiar.
- **Risk: prose styling on MDX.** We rely on `@tailwindcss/typography`'s `prose-invert` plus our overrides. If math display blocks look cramped, we'll adjust spacing in a follow-up; non-blocking for Plan 2 acceptance.
