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
