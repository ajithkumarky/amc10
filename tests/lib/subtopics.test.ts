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
