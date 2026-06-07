export type TopicSlug =
  | 'algebra'
  | 'geometry'
  | 'number-theory'
  | 'counting-probability';

export interface Topic {
  slug: TopicSlug;
  name: string;
  accent: string;
  accentClass: string;
}

export const TOPICS: readonly Topic[] = [
  {
    slug: 'algebra',
    name: 'Algebra',
    accent: '#ff2e9c',
    accentClass: 'text-topic-algebra',
  },
  {
    slug: 'geometry',
    name: 'Geometry',
    accent: '#00e5ff',
    accentClass: 'text-topic-geometry',
  },
  {
    slug: 'number-theory',
    name: 'Number Theory',
    accent: '#6b1eff',
    accentClass: 'text-topic-numbertheory',
  },
  {
    slug: 'counting-probability',
    name: 'Counting & Probability',
    accent: '#ffd866',
    accentClass: 'text-topic-counting',
  },
] as const;

export function getTopic(slug: string): Topic | undefined {
  return TOPICS.find((t) => t.slug === slug);
}
