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
