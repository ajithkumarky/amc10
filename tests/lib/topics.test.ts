import { describe, expect, it } from 'vitest';
import { TOPICS, getTopic } from '@/lib/topics';

describe('TOPICS', () => {
  it('contains the four AMC10 topics in display order', () => {
    expect(TOPICS.map((t) => t.slug)).toEqual([
      'algebra',
      'geometry',
      'number-theory',
      'counting-probability',
    ]);
  });

  it('each topic has a name, slug, accent color, and tailwind accent class', () => {
    for (const t of TOPICS) {
      expect(t.slug).toMatch(/^[a-z-]+$/);
      expect(t.name).toBeTruthy();
      expect(t.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(t.accentClass).toMatch(/^text-topic-/);
    }
  });
});

describe('getTopic', () => {
  it('returns the topic by slug', () => {
    expect(getTopic('algebra')?.name).toBe('Algebra');
  });

  it('returns undefined for unknown slugs', () => {
    expect(getTopic('foo')).toBeUndefined();
  });
});
