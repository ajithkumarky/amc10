# AMC10 — Plan 6: Content Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill the site with a deep content library — 27 concept pages, ~243 original problems, and all 52 available past AMC10 papers (2000–2025) with freshly written solutions — pooled into practice, gated by blind-solver verification, shipped in three deploy waves.

**Architecture:** Content stays MDX-on-filesystem (Plans 2/4 formats unchanged). Two code changes precede authoring: (1) paper problems gain `topic/subtopic/difficulty` tags read by `lib/content.ts`, and (2) practice sessions stop embedding every rendered body in the static page — a build script pre-renders each problem to KaTeX HTML and emits per-topic JSON into `public/practice-data/`, which the practice pages fetch client-side. This scales to 1,500+ problems and fixes the existing bug where solutions are visible during a session. Authoring is done by subagent batches (one subtopic or one paper per agent) with a blind-solver quality gate.

**Tech Stack:** Next.js 15 static export, MDX (`next-mdx-remote`), `remark-math`/`rehype-katex`, `unified` pipeline for the build script, vitest, Cloudflare Pages via wrangler.

**Working directory:** `C:/Users/ajith/play/amc10`. PowerShell for npm/git/wrangler. All git commits use `git -c user.email="ajithkumarky@gmail.com" -c user.name="Ajith" ...` (abbreviated to `git` in steps below — apply the `-c` flags on `add`/`commit` invocations as in prior plans).

**Spec:** `docs/superpowers/specs/2026-06-10-amc10-content-design.md` (approved).

---

## File structure changes

```
amc10/
├── lib/
│   ├── subtopics.ts                      # NEW — canonical 27-subtopic registry
│   ├── prose.ts                          # NEW — proseClasses moved out of render-mdx
│   └── content.ts                        # MODIFY — paper problems read subtopic/difficulty; meta reads skipped[]
├── scripts/
│   ├── practice-data-lib.mjs             # NEW — segment extraction + markdown→HTML helpers
│   └── build-practice-data.mjs           # NEW — emits public/practice-data/<topic>.json
├── components/
│   ├── mdx/render-mdx.tsx                # MODIFY — import proseClasses from lib/prose
│   └── practice/
│       ├── session-loader.tsx            # NEW — client loader fetching practice-data JSON
│       ├── learn-session.tsx             # MODIFY — optional solutions prop; subtopic nullable
│       └── test-session.tsx              # MODIFY — optional solutions prop; subtopic nullable
├── app/
│   ├── practice/learn/page.tsx           # REWRITE — thin wrapper around session-loader
│   ├── practice/test/page.tsx            # REWRITE — thin wrapper around session-loader
│   └── papers/[year]/[ab]/page.tsx       # MODIFY — render skipped-problem stubs
├── tests/
│   ├── lib/subtopics.test.ts             # NEW
│   ├── content/content-validation.test.ts# NEW — validates every content file
│   └── scripts/practice-data.test.ts     # NEW — emitter helpers
├── content/
│   ├── redirects.json                    # NEW — old slug → new slug map
│   ├── concepts/** , problems/**         # Wave 1 content (27 subtopics)
│   └── papers/**                         # Waves 2–3 content (52 papers)
├── docs/content-authoring.md             # NEW — templates + agent prompts + gate procedure
├── package.json                          # MODIFY — build chain + 4 devDeps
└── .gitignore                            # MODIFY — ignore public/practice-data/
```

---

# Part 1 — Code foundation

### Task 1: Canonical subtopic registry

**Files:**
- Create: `lib/subtopics.ts`
- Test: `tests/lib/subtopics.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/lib/subtopics.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { SUBTOPICS, isValidSubtopic, allSubtopicPairs } from '@/lib/subtopics';

describe('SUBTOPICS registry', () => {
  it('has 27 subtopics across 4 topics (7+8+6+6)', () => {
    expect(SUBTOPICS['algebra']).toHaveLength(7);
    expect(SUBTOPICS['geometry']).toHaveLength(8);
    expect(SUBTOPICS['number-theory']).toHaveLength(6);
    expect(SUBTOPICS['counting-probability']).toHaveLength(6);
    expect(allSubtopicPairs()).toHaveLength(27);
  });

  it('validates membership case-sensitively', () => {
    expect(isValidSubtopic('algebra', 'quadratics')).toBe(true);
    expect(isValidSubtopic('algebra', 'triangles')).toBe(false);
    expect(isValidSubtopic('counting-probability', 'permutations-combinations')).toBe(true);
    expect(isValidSubtopic('counting-probability', 'permutations')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/subtopics.test.ts`
Expected: FAIL — cannot resolve `@/lib/subtopics`.

- [ ] **Step 3: Implement `lib/subtopics.ts`**

```typescript
import type { TopicSlug } from './topics';

export interface Subtopic {
  slug: string;
  name: string;
}

export const SUBTOPICS: Record<TopicSlug, readonly Subtopic[]> = {
  algebra: [
    { slug: 'linear-equations-inequalities', name: 'Linear Equations & Inequalities' },
    { slug: 'quadratics', name: 'Quadratics' },
    { slug: 'polynomials', name: 'Polynomials' },
    { slug: 'exponents-logarithms', name: 'Exponents & Logarithms' },
    { slug: 'functions', name: 'Functions' },
    { slug: 'sequences-series', name: 'Sequences & Series' },
    { slug: 'word-problems', name: 'Word Problems' },
  ],
  geometry: [
    { slug: 'triangles', name: 'Triangles' },
    { slug: 'circles', name: 'Circles' },
    { slug: 'quadrilaterals-polygons', name: 'Quadrilaterals & Polygons' },
    { slug: 'coordinate-geometry', name: 'Coordinate Geometry' },
    { slug: 'solids-3d', name: '3D / Solids' },
    { slug: 'similarity-congruence', name: 'Similarity & Congruence' },
    { slug: 'area-perimeter', name: 'Area & Perimeter' },
    { slug: 'trigonometry-basics', name: 'Trigonometry Basics' },
  ],
  'number-theory': [
    { slug: 'divisibility-primes', name: 'Divisibility & Primes' },
    { slug: 'modular-arithmetic', name: 'Modular Arithmetic' },
    { slug: 'gcd-lcm', name: 'GCD / LCM' },
    { slug: 'number-bases', name: 'Number Bases' },
    { slug: 'digit-problems', name: 'Digit Problems' },
    { slug: 'diophantine-equations', name: 'Diophantine Equations' },
  ],
  'counting-probability': [
    { slug: 'counting-principles', name: 'Counting Principles' },
    { slug: 'permutations-combinations', name: 'Permutations & Combinations' },
    { slug: 'pigeonhole', name: 'Pigeonhole' },
    { slug: 'probability-basics', name: 'Probability Basics' },
    { slug: 'expected-value', name: 'Expected Value' },
    { slug: 'geometric-probability', name: 'Geometric Probability' },
  ],
} as const;

export function isValidSubtopic(topic: string, subtopic: string): boolean {
  const list = SUBTOPICS[topic as TopicSlug];
  return Boolean(list?.some((s) => s.slug === subtopic));
}

export function allSubtopicPairs(): { topic: TopicSlug; subtopic: string }[] {
  return (Object.keys(SUBTOPICS) as TopicSlug[]).flatMap((t) =>
    SUBTOPICS[t].map((s) => ({ topic: t, subtopic: s.slug })),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/subtopics.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add lib/subtopics.ts tests/lib/subtopics.test.ts
git commit -m "feat(content): canonical 27-subtopic registry"
```

---

### Task 2: Rename `permutations` → `permutations-combinations` + redirects.json

**Files:**
- Move: `content/problems/counting-probability/permutations/` → `content/problems/counting-probability/permutations-combinations/`
- Move: `content/concepts/counting-probability/permutations.mdx` → `content/concepts/counting-probability/permutations-combinations.mdx`
- Create: `content/redirects.json`

- [ ] **Step 1: Move the files with git mv**

```powershell
git mv content/problems/counting-probability/permutations content/problems/counting-probability/permutations-combinations
git mv content/concepts/counting-probability/permutations.mdx content/concepts/counting-probability/permutations-combinations.mdx
```

- [ ] **Step 2: Update the frontmatter in the two moved problem files**

In `content/problems/counting-probability/permutations-combinations/p001.mdx` and `p002.mdx`, change `subtopic: permutations` to `subtopic: permutations-combinations`. Also update the `title`/`summary` frontmatter of the moved concept page if it names the old slug.

- [ ] **Step 3: Write `content/redirects.json`**

```json
{
  "counting-probability/permutations/p001": "counting-probability/permutations-combinations/p001",
  "counting-probability/permutations/p002": "counting-probability/permutations-combinations/p002"
}
```

(No code consumes this yet — it is the durable record for historic `attempts.problem_slug` rows, per the Plan 2 spec. Any future dashboard work resolves old slugs through it.)

- [ ] **Step 4: Run full test suite + build**

Run: `npm test` then `npm run build`
Expected: all tests PASS; build succeeds (the learn pages derive routes from the filesystem, so `/learn/counting-probability/permutations-combinations` now exists).

- [ ] **Step 5: Commit**

```powershell
git add -A content/
git commit -m "refactor(content): rename permutations -> permutations-combinations with redirect map"
```

---

### Task 3: Content validation test

**Files:**
- Test: `tests/content/content-validation.test.ts`

This test is the standing gate for ALL authored content — every wave batch must keep it green.

- [ ] **Step 1: Write the test**

`tests/content/content-validation.test.ts`:
```typescript
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { TOPICS } from '@/lib/topics';
import { isValidSubtopic } from '@/lib/subtopics';

const ROOT = path.join(process.cwd(), 'content');
const TOPIC_SLUGS = TOPICS.map((t) => t.slug as string);
const ANSWERS = ['A', 'B', 'C', 'D', 'E'];

function mdxFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...mdxFiles(p));
    else if (entry.name.endsWith('.mdx')) out.push(p);
  }
  return out;
}

describe('original problems', () => {
  const files = mdxFiles(path.join(ROOT, 'problems'));

  it('exist', () => expect(files.length).toBeGreaterThan(0));

  it.each(files.map((f) => [path.relative(ROOT, f), f]))('%s is valid', (_rel, file) => {
    const { data, content } = matter(fs.readFileSync(file as string, 'utf8'));
    expect(TOPIC_SLUGS).toContain(data.topic);
    expect(isValidSubtopic(String(data.topic), String(data.subtopic))).toBe(true);
    expect(Number.isInteger(data.difficulty)).toBe(true);
    expect(data.difficulty).toBeGreaterThanOrEqual(1);
    expect(data.difficulty).toBeLessThanOrEqual(5);
    expect(ANSWERS).toContain(data.answer);
    expect(Array.isArray(data.choices) && data.choices.length === 5).toBe(true);
    expect(content).toMatch(/<Problem>[\s\S]*<\/Problem>/);
    expect(content).toMatch(/<Solution>[\s\S]*<\/Solution>/);
    // path agrees with frontmatter
    const parts = path.relative(path.join(ROOT, 'problems'), file as string).split(path.sep);
    expect(parts[0]).toBe(data.topic);
    expect(parts[1]).toBe(data.subtopic);
  });
});

describe('paper problems', () => {
  const papersRoot = path.join(ROOT, 'papers');
  const files = mdxFiles(papersRoot);

  it.each(files.map((f) => [path.relative(ROOT, f), f]))('%s is valid', (_rel, file) => {
    const { data, content } = matter(fs.readFileSync(file as string, 'utf8'));
    expect(ANSWERS).toContain(data.answer);
    expect(Array.isArray(data.choices) && data.choices.length === 5).toBe(true);
    expect(content).toMatch(/<Problem>[\s\S]*<\/Problem>/);
    expect(content).toMatch(/<Solution>[\s\S]*<\/Solution>/);
    if (data.topic !== undefined) expect(TOPIC_SLUGS).toContain(data.topic);
    if (data.difficulty !== undefined) {
      expect(Number.isInteger(data.difficulty)).toBe(true);
      expect(data.difficulty).toBeGreaterThanOrEqual(1);
      expect(data.difficulty).toBeLessThanOrEqual(5);
    }
    if (data.subtopic !== undefined && data.subtopic !== null) {
      expect(isValidSubtopic(String(data.topic), String(data.subtopic))).toBe(true);
    }
  });

  it('every paper dir has a valid meta.json', () => {
    if (!fs.existsSync(papersRoot)) return;
    for (const dir of fs.readdirSync(papersRoot)) {
      const metaPath = path.join(papersRoot, dir, 'meta.json');
      expect(fs.existsSync(metaPath), `${dir}/meta.json missing`).toBe(true);
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      expect(typeof meta.year).toBe('number');
      expect(typeof meta.ab).toBe('string');
      expect(typeof meta.title).toBe('string');
      if (meta.skipped !== undefined) {
        expect(Array.isArray(meta.skipped)).toBe(true);
        for (const s of meta.skipped) {
          expect(Number.isInteger(s.n)).toBe(true);
          expect(typeof s.reason).toBe('string');
        }
      }
    }
  });
});

describe('concept pages', () => {
  it('every non-index concept file maps to a registered subtopic', () => {
    const conceptsRoot = path.join(ROOT, 'concepts');
    for (const topic of fs.readdirSync(conceptsRoot)) {
      const dir = path.join(conceptsRoot, topic);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith('.mdx') || f === 'index.mdx') continue;
        expect(isValidSubtopic(topic, f.slice(0, -4)), `${topic}/${f}`).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Run it**

Run: `npm test -- tests/content/content-validation.test.ts`
Expected: PASS against the seed content (Tasks 1–2 made the registry and the rename consistent). If a seed file fails, fix the seed file (not the test).

- [ ] **Step 3: Commit**

```powershell
git add tests/content/content-validation.test.ts
git commit -m "test(content): standing validation gate for all content files"
```

---

### Task 4: Paper problems carry tags; paper pages render skipped stubs

**Files:**
- Modify: `lib/content.ts` (PaperProblemEntry + PaperMeta)
- Modify: `app/papers/[year]/[ab]/page.tsx`

- [ ] **Step 1: Extend `lib/content.ts`**

In `PaperProblemEntry` (lib/content.ts:33-42), add two fields:
```typescript
export interface PaperProblemEntry {
  year: number;
  ab: string;
  problem_number: number;
  topic: string;
  subtopic: string | null;     // NEW
  difficulty: number | null;   // NEW
  answer: 'A' | 'B' | 'C' | 'D' | 'E';
  choices: Choice[];
  source?: string;
  body: string;
}
```

In `getPaperProblem` (lib/content.ts:247-260), populate them:
```typescript
      return {
        year: Number(file.data.year ?? Number(year)),
        ab: String(file.data.paper ?? ab),
        problem_number: n,
        topic: String(file.data.topic ?? 'unknown'),
        subtopic: file.data.subtopic ? String(file.data.subtopic) : null,
        difficulty: typeof file.data.difficulty === 'number' ? file.data.difficulty : null,
        answer: readAnswer(file.data.answer),
        choices: readChoices(file.data.choices),
        source: file.data.source ? String(file.data.source) : undefined,
        body: file.content,
      };
```

In `PaperMeta` (lib/content.ts:44-50) add `skipped?: { n: number; reason: string }[];` and in `getPaperMeta` add:
```typescript
        skipped: Array.isArray(raw.skipped)
          ? raw.skipped.map((s: { n: number; reason: string }) => ({ n: Number(s.n), reason: String(s.reason) }))
          : undefined,
```

- [ ] **Step 2: Render skipped stubs on the paper page**

In `app/papers/[year]/[ab]/page.tsx`, after the `problems.map(...)` block (line 69-76), merge skipped stubs in problem-number order. Replace the `<div className="space-y-6">` problems block with:

```tsx
      <div className="space-y-6">
        {[...problems.map((p) => ({ kind: 'p' as const, n: p.problem_number, p })),
          ...(meta.skipped ?? []).map((s) => ({ kind: 's' as const, n: s.n, s }))]
          .sort((a, b) => a.n - b.n)
          .map((item) =>
            item.kind === 'p' ? (
              <div key={item.n} className="space-y-2">
                <div className="font-mono text-[11px] uppercase tracking-widest text-cyber-cyan">
                  {`// PROBLEM ${item.n} · ANSWER: ${item.p.answer}`}
                </div>
                <RenderMdx source={item.p.body} />
              </div>
            ) : (
              <div key={item.n} className="space-y-2">
                <div className="font-mono text-[11px] uppercase tracking-widest text-cyber-mute">
                  {`// PROBLEM ${item.n} · NOT TRANSCRIBED (${item.s.reason})`}
                </div>
                {meta.source && (
                  <p className="text-sm">
                    <a href={meta.source} target="_blank" rel="noopener noreferrer" className="text-cyber-cyan hover:underline">
                      View this problem on AoPS Wiki &uarr;
                    </a>
                  </p>
                )}
              </div>
            ),
          )}
      </div>
```

- [ ] **Step 3: Run tests + build**

Run: `npm test` then `npm run build`
Expected: PASS / build succeeds (seed paper has no tags and no skipped — both optional).

- [ ] **Step 4: Commit**

```powershell
git add lib/content.ts "app/papers/[year]/[ab]/page.tsx"
git commit -m "feat(papers): subtopic/difficulty tags on paper problems; skipped-problem stubs"
```

---

### Task 5: Practice-data emitter (build script)

**Files:**
- Create: `scripts/practice-data-lib.mjs`, `scripts/build-practice-data.mjs`
- Test: `tests/scripts/practice-data.test.ts`
- Modify: `package.json`, `.gitignore`

- [ ] **Step 1: Install devDependencies**

```powershell
npm install --save-dev unified@^11 remark-parse@^11 remark-rehype@^11 rehype-stringify@^10
```
(`remark-math` and `rehype-katex` are already direct dependencies.)

- [ ] **Step 2: Write the failing test**

`tests/scripts/practice-data.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
// @ts-expect-error - plain .mjs module without type declarations
import { extractSegments, renderMarkdown, collectPoolRecords } from '../../scripts/practice-data-lib.mjs';
import path from 'node:path';

const BODY = `
<Problem>
If $x^2 = 9$ and $x > 0$, what is $x$?
</Problem>

<Solution>
$x = 3$ since $x > 0$.
</Solution>

<AlternateMethod title="Guess and check">
Try $x = 3$: $3^2 = 9$. ✓
</AlternateMethod>
`;

describe('extractSegments', () => {
  it('splits problem, solution, and alternates', () => {
    const seg = extractSegments(BODY);
    expect(seg.problem).toContain('what is $x$?');
    expect(seg.solution).toContain('$x = 3$');
    expect(seg.alternates).toHaveLength(1);
    expect(seg.alternates[0].title).toBe('Guess and check');
    expect(seg.alternates[0].content).toContain('Try $x = 3$');
  });

  it('returns empty alternates when none present', () => {
    const seg = extractSegments('<Problem>q</Problem>\n<Solution>s</Solution>');
    expect(seg.alternates).toEqual([]);
  });
});

describe('renderMarkdown', () => {
  it('renders math to KaTeX HTML', async () => {
    const html = await renderMarkdown('What is $x^2$?');
    expect(html).toContain('katex');
  });
});

describe('collectPoolRecords', () => {
  it('collects seed originals with required fields', async () => {
    const records = await collectPoolRecords(path.join(process.cwd(), 'content'));
    expect(records.length).toBeGreaterThanOrEqual(8);
    const r = records.find((x: { slug: string }) => x.slug === 'algebra/quadratics/p001');
    expect(r).toBeDefined();
    expect(r.topic).toBe('algebra');
    expect(r.answer).toBe('B');
    expect(r.choices).toHaveLength(5);
    expect(r.problemHtml).toContain('katex');
    expect(r.solutionHtml.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- tests/scripts/practice-data.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `scripts/practice-data-lib.mjs`**

```javascript
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';

function matchAll(body, tag) {
  const re = new RegExp(`<${tag}(?:\\s+title="([^"]*)")?\\s*>([\\s\\S]*?)</${tag}>`, 'g');
  const out = [];
  let m;
  while ((m = re.exec(body)) !== null) {
    out.push({ title: m[1] ?? '', content: m[2].trim() });
  }
  return out;
}

export function extractSegments(body) {
  const problems = matchAll(body, 'Problem');
  const solutions = matchAll(body, 'Solution');
  return {
    problem: problems[0]?.content ?? '',
    solution: solutions[0]?.content ?? '',
    alternates: matchAll(body, 'AlternateMethod'),
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkMath)
  .use(remarkRehype)
  .use(rehypeKatex, { strict: false })
  .use(rehypeStringify);

export async function renderMarkdown(md) {
  return String(await processor.process(md));
}

async function toRecord(slug, data, body) {
  const seg = extractSegments(body);
  return {
    slug,
    topic: String(data.topic),
    subtopic: data.subtopic ? String(data.subtopic) : null,
    difficulty: Number(data.difficulty ?? 0) || null,
    answer: String(data.answer),
    choices: (data.choices ?? []).map(String),
    problemHtml: await renderMarkdown(seg.problem),
    solutionHtml: await renderMarkdown(seg.solution),
    alternates: await Promise.all(
      seg.alternates.map(async (a) => ({ title: a.title, html: await renderMarkdown(a.content) })),
    ),
  };
}

export async function collectPoolRecords(contentRoot) {
  const records = [];

  // Originals: content/problems/<topic>/<subtopic>/*.mdx — always pooled.
  const problemsRoot = path.join(contentRoot, 'problems');
  if (fs.existsSync(problemsRoot)) {
    for (const topic of fs.readdirSync(problemsRoot)) {
      const tDir = path.join(problemsRoot, topic);
      if (!fs.statSync(tDir).isDirectory()) continue;
      for (const sub of fs.readdirSync(tDir)) {
        const sDir = path.join(tDir, sub);
        if (!fs.statSync(sDir).isDirectory()) continue;
        for (const f of fs.readdirSync(sDir)) {
          if (!f.endsWith('.mdx')) continue;
          const { data, content } = matter(fs.readFileSync(path.join(sDir, f), 'utf8'));
          records.push(await toRecord(`${topic}/${sub}/${f.slice(0, -4)}`, data, content));
        }
      }
    }
  }

  // Paper problems: pooled only when tagged with a known topic AND a difficulty.
  const papersRoot = path.join(contentRoot, 'papers');
  if (fs.existsSync(papersRoot)) {
    for (const dir of fs.readdirSync(papersRoot)) {
      const pDir = path.join(papersRoot, dir);
      if (!fs.statSync(pDir).isDirectory()) continue;
      for (const f of fs.readdirSync(pDir)) {
        if (!/^p\d+\.mdx$/.test(f)) continue;
        const { data, content } = matter(fs.readFileSync(path.join(pDir, f), 'utf8'));
        if (!data.topic || typeof data.difficulty !== 'number') continue;
        records.push(await toRecord(`papers/${dir}/${f.slice(0, -4)}`, data, content));
      }
    }
  }

  return records;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/scripts/practice-data.test.ts`
Expected: PASS.

- [ ] **Step 6: Implement `scripts/build-practice-data.mjs`**

```javascript
import fs from 'node:fs';
import path from 'node:path';
import { collectPoolRecords } from './practice-data-lib.mjs';

const TOPICS = ['algebra', 'geometry', 'number-theory', 'counting-probability'];

const contentRoot = path.join(process.cwd(), 'content');
const outDir = path.join(process.cwd(), 'public', 'practice-data');

const records = await collectPoolRecords(contentRoot);
fs.mkdirSync(outDir, { recursive: true });

for (const topic of TOPICS) {
  const subset = records.filter((r) => r.topic === topic);
  fs.writeFileSync(path.join(outDir, `${topic}.json`), JSON.stringify(subset));
  console.log(`practice-data: ${topic}.json — ${subset.length} problems`);
}

const unknown = records.filter((r) => !TOPICS.includes(r.topic));
if (unknown.length > 0) {
  console.error(`practice-data: ${unknown.length} records with unknown topic — first: ${unknown[0].slug}`);
  process.exit(1);
}
```

- [ ] **Step 7: Wire into the build + ignore generated output**

In `package.json` scripts, change:
```json
    "build": "node scripts/build-practice-data.mjs && next build",
    "dev": "node scripts/build-practice-data.mjs && next dev",
```
Append to `.gitignore`:
```
public/practice-data/
```

- [ ] **Step 8: Run the script + build**

Run: `node scripts/build-practice-data.mjs`
Expected: four `practice-data: <topic>.json — N problems` lines (algebra 2, geometry 2, number-theory 2, counting-probability 2 with seed content).
Run: `npm run build`
Expected: build succeeds; `out/practice-data/algebra.json` exists after export.

- [ ] **Step 9: Commit**

```powershell
git add scripts/ tests/scripts/practice-data.test.ts package.json package-lock.json .gitignore
git commit -m "feat(practice): build-time practice-data JSON emitter (KaTeX HTML per problem)"
```

---

### Task 6: Practice pages fetch the pool client-side

**Files:**
- Create: `lib/prose.ts`, `components/practice/session-loader.tsx`
- Modify: `components/mdx/render-mdx.tsx`, `components/practice/learn-session.tsx`, `components/practice/test-session.tsx`
- Rewrite: `app/practice/learn/page.tsx`, `app/practice/test/page.tsx`

This removes the all-problems-embedded-in-the-page pattern (unscalable past a few hundred problems) and fixes the pre-existing bug where `<Solution>` is rendered inside the body *during* a session.

- [ ] **Step 1: Extract `proseClasses` to `lib/prose.ts`**

```typescript
import { cn } from '@/lib/cn';

export const proseClasses = cn(
  'prose prose-invert max-w-none',
  'prose-headings:font-display prose-headings:tracking-widest prose-headings:text-cyber-ink',
  'prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl',
  'prose-p:text-cyber-mute prose-p:leading-relaxed',
  'prose-strong:text-cyber-ink',
  'prose-a:text-cyber-cyan hover:prose-a:underline',
  'prose-code:text-cyber-amber prose-code:font-mono',
  'prose-li:text-cyber-mute',
);
```

In `components/mdx/render-mdx.tsx`, delete the local `proseClasses` constant (lines 9-18) and `import { proseClasses } from '@/lib/prose';` instead.

- [ ] **Step 2: Widen session subtopic types and add the optional `solutions` prop**

In `components/practice/learn-session.tsx`:
- `LearnSessionProblem.subtopic` becomes `string | null`.
- `LearnSessionProps` gains `solutions?: ReactNode[];` and the function signature becomes `export function LearnSession({ problems, bodies, solutions }: LearnSessionProps)`.
- After the body render (`<div>{currentBody}</div>`, line 165), insert:
```tsx
        {attempt.submitted && solutions?.[currentProblemIdx]}
```
- In the header line that shows `currentProblem.subtopic.toUpperCase()` (line 159), use `{(currentProblem.subtopic ?? 'mixed').toUpperCase()}`.
- In the done-screen list item (line 141), `{p.topic} / {p.subtopic ?? 'mixed'} / ...`.

In `components/practice/test-session.tsx` make the same three changes:
- `TestSessionProblem.subtopic` becomes `string | null`; props gain `solutions?: ReactNode[]`; signature `({ problems, bodies, solutions }: TestSessionProps)`.
- In the finished-review `<details>` block, after `<div className="mt-3">{bodies[origIdx]}</div>` (line 105), insert `{solutions?.[origIdx]}`.
- The summary line's `{p.subtopic}` (line 103) becomes `{p.subtopic ?? 'mixed'}`.

- [ ] **Step 3: Write `components/practice/session-loader.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { proseClasses } from '@/lib/prose';
import { Solution } from '@/components/mdx/solution';
import { AlternateMethod } from '@/components/mdx/alternate-method';
import { LearnSession } from './learn-session';
import { TestSession } from './test-session';

export interface PracticeRecord {
  slug: string;
  topic: string;
  subtopic: string | null;
  difficulty: number | null;
  answer: 'A' | 'B' | 'C' | 'D' | 'E';
  choices: string[];
  problemHtml: string;
  solutionHtml: string;
  alternates: { title: string; html: string }[];
}

const PRACTICE_TOPICS = ['algebra', 'geometry', 'number-theory', 'counting-probability'];

async function fetchPracticePool(topic?: string): Promise<PracticeRecord[]> {
  const topics = topic && PRACTICE_TOPICS.includes(topic) ? [topic] : PRACTICE_TOPICS;
  const results = await Promise.all(
    topics.map(async (t) => {
      const r = await fetch(`/practice-data/${t}.json`);
      if (!r.ok) return [] as PracticeRecord[];
      return (await r.json()) as PracticeRecord[];
    }),
  );
  return results.flat();
}

export function PracticeSessionLoader({ mode }: { mode: 'learn' | 'test' }) {
  const searchParams = useSearchParams();
  const topic = searchParams.get('topic') ?? undefined;
  const [pool, setPool] = useState<PracticeRecord[] | null>(null);

  useEffect(() => {
    let aborted = false;
    fetchPracticePool(topic)
      .then((p) => {
        if (!aborted) setPool(p);
      })
      .catch(() => {
        if (!aborted) setPool([]);
      });
    return () => {
      aborted = true;
    };
  }, [topic]);

  if (!pool) {
    return <div className="font-mono text-[11px] text-cyber-mute">LOADING PROBLEM BANK...</div>;
  }

  const problems = pool.map((r) => ({
    slug: r.slug,
    topic: r.topic,
    subtopic: r.subtopic,
    answer: r.answer,
    choices: r.choices,
  }));
  const bodies = pool.map((r) => (
    <div key={r.slug} className={proseClasses} dangerouslySetInnerHTML={{ __html: r.problemHtml }} />
  ));
  const solutions = pool.map((r) => (
    <div key={r.slug}>
      <Solution>
        <div className={proseClasses} dangerouslySetInnerHTML={{ __html: r.solutionHtml }} />
      </Solution>
      {r.alternates.map((a, i) => (
        <AlternateMethod key={i} title={a.title}>
          <div className={proseClasses} dangerouslySetInnerHTML={{ __html: a.html }} />
        </AlternateMethod>
      ))}
    </div>
  ));

  return mode === 'learn' ? (
    <LearnSession problems={problems} bodies={bodies} solutions={solutions} />
  ) : (
    <TestSession problems={problems} bodies={bodies} solutions={solutions} />
  );
}
```

(If `Solution` or `AlternateMethod` fail to import into a client component because of a server-only dependency, they are plain presentational components — check; both render static divs. `AlternateMethod` may use `<details>` or client state for its collapse toggle; either is client-safe.)

- [ ] **Step 4: Rewrite the two practice pages**

`app/practice/learn/page.tsx`:
```tsx
import { Suspense } from 'react';
import { PracticeSessionLoader } from '@/components/practice/session-loader';

export const metadata = { title: 'Learn Run — AMC // 10' };

export default function LearnRunPage() {
  return (
    <Suspense fallback={<div className="font-mono text-[11px] text-cyber-mute">LOADING...</div>}>
      <PracticeSessionLoader mode="learn" />
    </Suspense>
  );
}
```

`app/practice/test/page.tsx`:
```tsx
import { Suspense } from 'react';
import { PracticeSessionLoader } from '@/components/practice/session-loader';

export const metadata = { title: 'Test Run — AMC // 10' };

export default function TestRunPage() {
  return (
    <Suspense fallback={<div className="font-mono text-[11px] text-cyber-mute">LOADING...</div>}>
      <PracticeSessionLoader mode="test" />
    </Suspense>
  );
}
```

`lib/practice-catalog.ts` has no remaining consumers after this — delete it and its import sites (verify with `Grep "practice-catalog"`), or leave if a test references it; if a test does, update the test to target `collectPoolRecords` semantics instead.

- [ ] **Step 5: Run tests + build + manual smoke**

Run: `npm test` — expected: PASS (existing session component tests still compile; `solutions` is optional).
Run: `npm run build` — expected: success.
Run: `npx wrangler pages dev out` and open `http://localhost:8788/practice/learn?topic=algebra&count=2` — problem renders with KaTeX, solution appears only AFTER submit. Ctrl-C when verified.

- [ ] **Step 6: Commit**

```powershell
git add lib/prose.ts components/ app/practice/ lib/practice-catalog.ts
git commit -m "refactor(practice): fetch problem pool from practice-data JSON; reveal solutions only after submit"
```

---

### Task 7: Authoring guide (templates + agent prompts + gate)

**Files:**
- Create: `docs/content-authoring.md`

This document is the single source the wave subagents are pointed at. Write it with EXACTLY the following content (it is consumed verbatim by authoring agents):

- [ ] **Step 1: Write `docs/content-authoring.md`**

````markdown
# AMC10 Content Authoring Guide

All content is MDX with KaTeX math ($...$ inline, $$...$$ display). House rules:
- Choices are exactly 5 strings, frontmatter `answer` is the correct letter A–E.
- LaTeX: plain KaTeX syntax. No Asymptote. No \begin{tikzpicture}. Tables in markdown.
- Diagrams: simple figures as inline SVG inside the <Problem> block (viewBox, stroke="#00e5ff", fill="none", max-width 360px). If a faithful figure is impractical, augment the problem text with a precise textual description instead. If the problem is unusable without a complex diagram, skip it (papers only — record in meta.json "skipped").
- Voice: clear, friendly, aimed at a strong middle-schooler. Solutions explain WHY, not just compute.

## Original problem file — content/problems/<topic>/<subtopic>/pNNN.mdx

```mdx
---
topic: <topic-slug>
subtopic: <subtopic-slug>
difficulty: <1-5>
answer: <A-E>
choices: ["...", "...", "...", "...", "..."]
---

<Problem>
(statement)
</Problem>

<Solution>
(primary method, ends with: Answer: **X**.)
</Solution>

<AlternateMethod title="(method name)">
(optional, zero or more)
</AlternateMethod>
```

Numbering: continue from the highest existing pNNN in the directory (seed files occupy p001–p002 in 4 subtopics).
Difficulty rubric: 1 = AMC 1–5 (one idea, one step), 2 = AMC 6–10, 3 = AMC 11–15 (two ideas combined), 4 = AMC 16–20, 5 = AMC 21–25 (multi-step, non-obvious insight).
Batch answer-letter distribution: within one subtopic batch of 9, each letter appears at least once; no letter more than 3 times.
Originality: problems must be NEW — not restatements of well-known AMC problems. Numbers and contexts must differ from any source you consulted.

## Paper problem file — content/papers/<year>-<ab>/pNN.mdx (NN zero-padded to 2)

```mdx
---
year: <number>
paper: <"10A" | "10B" | "10">
topic: <topic-slug>
subtopic: <subtopic-slug or omit if genuinely cross-topic>
difficulty: <1-5>
answer: <A-E>
choices: ["...", "...", "...", "...", "..."]
---

<Problem>
(faithful transcription of the official statement)
</Problem>

<Solution>
(FRESH solution in our own words — never copied from AoPS)
</Solution>
```

Difficulty default by position: 1–5→1, 6–10→2, 11–15→3, 16–20→4, 21–25→5; adjust ±1 only when the problem is clearly mis-positioned.
Topic/subtopic: choose the single best fit from lib/subtopics.ts; omit subtopic when the problem genuinely spans topics (keep topic = the dominant one).

## Paper meta.json

```json
{
  "year": 2019,
  "ab": "10A",
  "title": "AMC 10A 2019",
  "date": "2019-02-07",
  "source": "https://artofproblemsolving.com/wiki/index.php/2019_AMC_10A_Problems",
  "skipped": [{ "n": 14, "reason": "complex diagram" }]
}
```
`skipped` only when problems were skipped. For 2000/2001 single papers: ab = "10", dir = `2000-10`, title "AMC 10 2000". For 2021 Fall: dir `2021Fall-10A`, title "AMC 10A 2021 Fall", year 2021.

## Concept page — content/concepts/<topic>/<subtopic>.mdx

```mdx
---
title: <Display Name>
summary: <one sentence>
---

## Overview
(2-3 paragraphs: what this is, why AMC loves it)

## Key facts
(bulleted formulas/theorems with one-line "when to use")

## Worked example 1
(easy, full reasoning)

## Worked example 2
(AMC mid-difficulty, full reasoning)

## Common traps
(3-5 bullets of classic mistakes)
```

## AoPS source URLs

- 2002–2025: `https://artofproblemsolving.com/wiki/index.php/<YEAR>_AMC_10<A|B>_Problems` and `..._Answer_Key`
- 2021 Fall: `https://artofproblemsolving.com/wiki/index.php/2021_Fall_AMC_10<A|B>_Problems`
- 2000, 2001: `https://artofproblemsolving.com/wiki/index.php/<YEAR>_AMC_10_Problems`

## Quality gate (run for EVERY batch before commit)

1. **Blind solve:** for each problem, a verifier agent receives ONLY the statement + choices (never the intended answer or solution) and must return its answer letter with reasoning. Verifier prompt:
   > You are an expert AMC10 solver. Solve this problem and answer with your reasoning followed by a final line exactly of the form `FINAL: <letter>`. Statement: <problem text> Choices: (A) ... (B) ... (C) ... (D) ... (E) ...
2. Mismatch → the author fixes the problem/solution/choices or discards and replaces it (originals) / re-checks the transcription against AoPS (papers). Re-run the blind solve. Max 2 fix rounds per problem; a problem failing twice is discarded (originals) or recorded in `skipped` (papers).
3. **Papers only — answer-key check:** every frontmatter `answer` must equal the official AoPS answer key entry.
4. **Concept pages — fact check:** a verifier agent reviews each formula and re-derives each worked example's arithmetic. Errors → fix, no re-review round needed.
5. `npm test` (content-validation gate) must pass.
````

- [ ] **Step 2: Commit**

```powershell
git add docs/content-authoring.md
git commit -m "docs: content authoring guide (templates, prompts, quality gate)"
```

---

# Part 2 — Wave 1: concepts + original problems (27 batches)

### Task 8: Author the 27 subtopic batches

**Files (per batch):** `content/concepts/<topic>/<subtopic>.mdx` (create or rewrite seed), `content/problems/<topic>/<subtopic>/p001..p009.mdx` (create; seeded subtopics start at p003 and add 7 more to reach 9).

**Batch procedure (repeat per subtopic, parallelizable 3–4 at a time — disjoint directories):**

1. Dispatch an **author subagent**: "Read `docs/content-authoring.md` and `lib/subtopics.ts` in C:/Users/ajith/play/amc10. Author the Wave-1 batch for `<topic>/<subtopic>`: the concept page and enough new original problems to bring the directory to 9 total, difficulty spread 2× (1–2), 4× (3), 3× (4–5), following the templates exactly. Read any existing problems in the directory first and do not duplicate their ideas. Return the list of files written."
2. Dispatch **blind-solver subagents** (one per new problem, in parallel) with the verifier prompt from the guide, passing ONLY statement + choices extracted from each file.
3. Compare `FINAL: <letter>` to each file's frontmatter `answer`. On mismatch, send the file plus the verifier's reasoning back to an author subagent to fix or replace; re-verify. Max 2 rounds, then discard and have the author write a replacement problem (which is itself blind-verified).
4. Dispatch a **fact-check subagent** for the concept page: "Verify every formula and re-derive both worked examples in `<file>`. Report errors or NONE." Fix any errors.
5. Run `npm test -- tests/content/content-validation.test.ts` — must PASS.
6. Commit: `git add content/concepts/<topic>/ content/problems/<topic>/<subtopic>/` then `git commit -m "content(wave1): <topic>/<subtopic> concept + problems (9)"`.

**Batch checklist:**

- [ ] algebra/linear-equations-inequalities
- [ ] algebra/quadratics (seed: 2 existing problems)
- [ ] algebra/polynomials
- [ ] algebra/exponents-logarithms
- [ ] algebra/functions
- [ ] algebra/sequences-series
- [ ] algebra/word-problems
- [ ] geometry/triangles (seed: 2 existing problems)
- [ ] geometry/circles
- [ ] geometry/quadrilaterals-polygons
- [ ] geometry/coordinate-geometry
- [ ] geometry/solids-3d
- [ ] geometry/similarity-congruence
- [ ] geometry/area-perimeter
- [ ] geometry/trigonometry-basics
- [ ] number-theory/divisibility-primes
- [ ] number-theory/modular-arithmetic (seed: 2 existing problems)
- [ ] number-theory/gcd-lcm
- [ ] number-theory/number-bases
- [ ] number-theory/digit-problems
- [ ] number-theory/diophantine-equations
- [ ] counting-probability/counting-principles
- [ ] counting-probability/permutations-combinations (seed: 2 existing problems)
- [ ] counting-probability/pigeonhole
- [ ] counting-probability/probability-basics
- [ ] counting-probability/expected-value
- [ ] counting-probability/geometric-probability

### Task 9: Wave 1 deploy

- [ ] **Step 1:** `npm test` — all suites PASS (validation gate covers all 243+ problems).
- [ ] **Step 2:** `node scripts/build-practice-data.mjs` — expect roughly 63/72/54/54 problems per topic line.
- [ ] **Step 3:** `npm run build` — succeeds; 27 subtopic learn routes in the route list.
- [ ] **Step 4:** `npx wrangler pages deploy out --project-name=amc10 --branch=main --commit-dirty=true`
- [ ] **Step 5:** Smoke: `https://amc10.kidiyoor.com/learn` shows all subtopic cards; a learn run for each of the 4 topics serves problems; solution appears only after submit.
- [ ] **Step 6:** `git push`

---

# Part 3 — Wave 2: papers 2015–2025 (24 papers)

### Task 10: Transcribe + author the 24 recent papers

**Files (per paper):** `content/papers/<dir>/meta.json`, `p01.mdx` … `p25.mdx` (minus skipped).

**Paper procedure (repeat per paper, parallelizable 3–4 at a time):**

1. Dispatch a **transcriber subagent**: "Read `docs/content-authoring.md` in C:/Users/ajith/play/amc10. Build the paper `<dir>`: WebFetch the AoPS problems page and answer key for `<paper name>` (URL patterns in the guide; fetch individual problem pages `<problems URL>/Problem_<n>` when the listing is truncated). Write meta.json and p01–p25 per the templates: faithful statement transcription, official answer letter, topic/subtopic/difficulty tags, and a FRESH solution in your own words (do not copy AoPS solutions). Apply the diagram policy; record unusable problems in meta.json `skipped`. Return the file list and any skipped problems."
2. Dispatch **blind-solver subagents** (one per problem, parallel, batches of ~8). Mismatch handling per the guide: a mismatch means either a transcription error or a wrong solution — the fixer re-checks against the AoPS source first, then re-verifies. Twice-failing problems move to `skipped` with reason "could not verify".
3. Spot-check transcription fidelity: a **fidelity subagent** re-fetches 5 random problems of the paper from AoPS and diffs meaning (not formatting) against our files. Any discrepancy → fix and re-verify that problem.
4. Run `npm test -- tests/content/content-validation.test.ts` — PASS.
5. Commit: `git add content/papers/<dir>/` then `git commit -m "content(wave2): <paper name> (25 problems, fresh solutions)"`.

**Deploy checkpoint after every ~6 papers:** `npm test` → `npm run build` → `npx wrangler pages deploy out --project-name=amc10 --branch=main --commit-dirty=true` → smoke the newest paper page → `git push`.

**Paper checklist (dir names):**

- [ ] 2025-10A · - [ ] 2025-10B
- [ ] 2024-10A · - [ ] 2024-10B
- [ ] 2023-10A · - [ ] 2023-10B
- [ ] 2022-10A · - [ ] 2022-10B
- [ ] 2021Fall-10A · - [ ] 2021Fall-10B
- [ ] 2021-10A · - [ ] 2021-10B
- [ ] 2020-10A · - [ ] 2020-10B
- [ ] 2019-10A (complete the existing 3-problem seed to 25) · - [ ] 2019-10B
- [ ] 2018-10A · - [ ] 2018-10B
- [ ] 2017-10A · - [ ] 2017-10B
- [ ] 2016-10A · - [ ] 2016-10B
- [ ] 2015-10A · - [ ] 2015-10B

---

# Part 4 — Wave 3: papers 2000–2014 backfill (28 papers)

### Task 11: Transcribe + author the 28 older papers

Same per-paper procedure and deploy checkpoints as Task 10.

**Paper checklist (dir names):**

- [ ] 2014-10A · - [ ] 2014-10B
- [ ] 2013-10A · - [ ] 2013-10B
- [ ] 2012-10A · - [ ] 2012-10B
- [ ] 2011-10A · - [ ] 2011-10B
- [ ] 2010-10A · - [ ] 2010-10B
- [ ] 2009-10A · - [ ] 2009-10B
- [ ] 2008-10A · - [ ] 2008-10B
- [ ] 2007-10A · - [ ] 2007-10B
- [ ] 2006-10A · - [ ] 2006-10B
- [ ] 2005-10A · - [ ] 2005-10B
- [ ] 2004-10A · - [ ] 2004-10B
- [ ] 2003-10A · - [ ] 2003-10B
- [ ] 2002-10A · - [ ] 2002-10B
- [ ] 2001-10 (single paper, ab "10")
- [ ] 2000-10 (single paper, ab "10")

### Task 12: Final regression + wrap-up

- [ ] **Step 1:** `npm test` — full suite green over the complete library.
- [ ] **Step 2:** `node scripts/build-practice-data.mjs` — record final per-topic counts; total should be ≈1,450–1,550 (243 originals + tagged paper problems minus skipped/untagged).
- [ ] **Step 3:** `npm run build` && deploy && `git push`.
- [ ] **Step 4:** Full smoke on `https://amc10.kidiyoor.com`: papers index lists ~52 papers grouped sensibly; a 2003 paper renders; mixed test run draws from paper problems (check a slug starting `papers/` in the end-of-test review).
- [ ] **Step 5:** Update the project memory file: Plan 6 status, per-wave completion.

---

## Self-Review

- **Spec coverage:** subtopic registry + rename/redirect (Tasks 1–2) ✓; validation gate (Task 3) ✓; tags + skipped stubs (Task 4) ✓; pooling at scale via practice-data JSON (Tasks 5–6 — implementation choice for the spec's "verify index and practice filters behave at ~1,550 entries") ✓; templates/gate (Task 7) ✓; Wave 1/2/3 (Tasks 8–11) ✓; per-wave deploys ✓; final regression (Task 12) ✓. Out-of-scope items untouched ✓.
- **Placeholder scan:** no TBDs. Authoring content itself is parameterized by procedure + checklist (inherent to a content plan); every template, prompt, and gate criterion is spelled out in Task 7.
- **Type consistency:** `PracticeRecord` (session-loader) matches the emitter's record shape field-for-field; `subtopic: string | null` widening is applied in both sessions and the loader; `PaperProblemEntry.subtopic/difficulty` match the validation test's optional rules; `skipped` shape identical in meta template, content.ts, and validation test.
- **Risk — KaTeX HTML in JSON:** KaTeX markup inflates JSON (~2-4 KB/problem rendered). Per-topic files at full library ≈ 1-2 MB raw, 150-300 KB gzipped — acceptable; Cloudflare serves them compressed and the browser caches them.
- **Risk — AoPS fetchability:** if WebFetch is blocked by AoPS, pause the wave and surface to the user; Wave 1 has no external dependency.
- **Risk — answer-key ambiguity on old papers:** some pre-2005 AoPS pages have inconsistent formatting; the blind-solve + answer-key double check catches transcription drift.
