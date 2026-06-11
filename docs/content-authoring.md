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
