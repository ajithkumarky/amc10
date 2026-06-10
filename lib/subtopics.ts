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
