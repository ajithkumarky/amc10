# AMC10 Site — Plan 6 Spec: Content Library (Concepts, Original Problems, Past Papers)

**Date:** 2026-06-10
**Status:** Approved by user (Approach A — waves, practice-first)

## Goal

Fill the AMC10 site's content layer. The platform (Plans 1–5) is complete and deployed at https://amc10.kidiyoor.com; the content is seed-only (8 original problems, 8 concept pages, 3 problems of one paper). This plan produces a deep library: every subtopic taught and practicable, and every available past AMC10 paper on the site with fresh solutions.

The user chose the **deep library** volume tier, **all available paper years**, **fresh full solutions** for every problem, and **pooling paper problems into practice**.

## Inventory

### Subtopics — 27, finalized

| Topic | Subtopics |
|---|---|
| Algebra (7) | linear-equations-inequalities, quadratics, polynomials, exponents-logarithms, functions, sequences-series, word-problems |
| Geometry (8) | triangles, circles, quadrilaterals-polygons, coordinate-geometry, solids-3d, similarity-congruence, area-perimeter, trigonometry-basics |
| Number Theory (6) | divisibility-primes, modular-arithmetic, gcd-lcm, number-bases, digit-problems, diophantine-equations |
| Counting & Probability (6) | counting-principles, permutations-combinations, pigeonhole, probability-basics, expected-value, geometric-probability |

Existing seed subtopic slugs (`quadratics`, `triangles`, `modular-arithmetic`, `permutations`) are kept; `permutations` is renamed to `permutations-combinations` with an entry in `content/redirects.json` so recorded attempts still resolve.

### Per subtopic

- **1 concept page** (`content/concepts/<topic>/<subtopic>.mdx`): overview → key facts/formulas → 2 worked examples → common traps → "Practice this section" (existing page layout).
- **9 original problems** (`content/problems/<topic>/<subtopic>/pNNN.mdx`): difficulty spread ≈ 2 easy (1–2), 4 medium (3), 3 hard (4–5). Total ≈ 243 original problems. Existing frontmatter schema unchanged (`topic, subtopic, difficulty, answer, choices`), body uses `<Problem>`, `<Solution>`, optional `<AlternateMethod>`.

### Past papers — 52

2000, 2001 (single AMC10 each year), 2002–2020 A & B, 2021 Spring A & B + 2021 Fall A & B, 2022–2025 A & B. 25 problems each ≈ 1,300 problems.

- Directory naming: existing `content/papers/<year>-<ab>/` convention; the 2021 Fall pair uses `2021Fall-10A` / `2021Fall-10B` (meta.json `title` disambiguates; the papers index groups by year).
- **Statements and answer keys** sourced from the AoPS wiki (https://artofproblemsolving.com/wiki). Statements transcribed faithfully (LaTeX re-set in KaTeX syntax; diagrams redrawn as inline SVG or described textually when transcription is impractical — see Risks).
- **Solutions written fresh** in the site's own words by authoring agents. One primary `<Solution>`; `<AlternateMethod>` when a distinctly different approach is illuminating. No copying of AoPS community solutions.

### Tagging & pooling

Paper problem frontmatter gains `topic`, `subtopic` (nullable for genuinely cross-topic problems), `difficulty`. Difficulty defaults by position (1–5 → 1, 6–10 → 2, 11–15 → 3, 16–20 → 4, 21–25 → 5); the authoring agent may adjust ±1. `scripts/build-index.ts` already walks all of `/content/`, so tagged paper problems join Learn/Test practice pools automatically. Verify the index and practice filters behave at ~1,550 entries; no schema changes expected (the `attempts` table already allows nullable `subtopic`).

## Authoring pipeline

Batch unit = one subtopic (concept page + 9 problems) or one paper (25 problems). Agents author batches in parallel.

**Quality gate (every problem):**
1. **Blind solver:** an independent agent receives the problem statement and choices only (no intended answer) and must solve it. Mismatch → fix or discard. Applies to originals and transcriptions alike.
2. **Transcription fidelity (papers only):** statement checked against the AoPS source; answer checked against the official answer key.
3. **Concept pages:** separate fact-check pass (formulas, worked-example arithmetic).
4. **Build gate:** `npm run build` must pass (KaTeX renders, MDX valid, index counts match the batch manifest) before any deploy.

## Waves (each ends in a verified deploy)

| Wave | Content | Size |
|---|---|---|
| 1 | 27 concept pages + ~243 original problems | Learn mode fully useful |
| 2 | Papers 2015–2025 (24 papers incl. 2021 Spring/Fall) | ~600 problems |
| 3 | Papers 2000–2014 backfill (28 papers) | ~700 problems |

Waves 2–3 are expected to span multiple working sessions; papers land on the site as they pass the gate (a partially-complete wave may deploy completed papers — a paper is all-or-nothing, a wave is not).

## Testing

- Existing unit tests keep passing; add a content-validation test (or build-index assertion) that every problem file has valid frontmatter: answer ∈ A–E, choices length 5, difficulty 1–5, topic/subtopic in the canonical list.
- Per-wave smoke test on the deployed site: concept page renders math, a practice session draws new problems, a paper page renders all 25 problems.

## Risks & notes

- **Copyright:** past AMC problems are MAA-copyrighted. This is a private, allowlisted family study site (2 users); the user accepts this. Solutions are originally written, not copied. `meta.json.source` credits the AoPS wiki page per paper.
- **Diagrams:** many geometry problems have Asymptote diagrams on AoPS. Transcription policy: redraw simple diagrams as inline SVG; where a faithful redraw is impractical, the problem text is augmented with a precise textual description. Problems whose statement is unusable without a complex diagram may be skipped with a `meta.json` note (`"skipped": [n, ...]`) rather than transcribed badly — the paper page shows a "diagram problem — see AoPS" stub linking to the source.
- **AoPS availability:** the pipeline depends on WebFetch reaching the AoPS wiki. If blocked, waves 2–3 stall and Wave 1 (originals) proceeds independently.
- **Scale of build:** ~1,550 MDX files is well within Next.js static-export capability; `content-index.json` stays a single flat JSON (~150 KB).

## Out of scope

Spaced repetition, leaderboards, admin UI, problem search, AMC12/AIME content, automatic difficulty calibration from attempt data.
