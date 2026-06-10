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
