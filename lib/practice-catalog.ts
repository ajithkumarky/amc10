import { contentIndex, type ProblemEntry } from './content';

export interface PracticeProblem {
  slug: string;
  topic: string;
  subtopic: string;
  difficulty: number;
  answer: 'A' | 'B' | 'C' | 'D' | 'E';
  choices: string[];
  body: string;
}

function entryToProblem(p: ProblemEntry): PracticeProblem {
  return {
    slug: `${p.topic}/${p.subtopic}/${p.slug}`,
    topic: p.topic,
    subtopic: p.subtopic,
    difficulty: p.difficulty,
    answer: p.answer,
    choices: p.choices,
    body: p.body,
  };
}

export function getAllPracticeProblems(): PracticeProblem[] {
  return contentIndex.listAllProblems().flatMap(({ topic, subtopic, slug }) => {
    const p = contentIndex.getProblem(topic, subtopic, slug);
    return p ? [entryToProblem(p)] : [];
  });
}

export function getPracticeProblemsByTopic(topic: string): PracticeProblem[] {
  return getAllPracticeProblems().filter((p) => p.topic === topic);
}
