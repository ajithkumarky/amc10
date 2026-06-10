import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export interface TopicEntry {
  slug: string;
  title: string;
  summary: string;
  body: string;
}

export interface SubtopicEntry {
  topic: string;
  slug: string;
  title: string;
  summary: string;
  difficulty?: number;
  body: string;
}

export type Choice = string;

export interface ProblemEntry {
  topic: string;
  subtopic: string;
  slug: string;
  difficulty: number;
  answer: 'A' | 'B' | 'C' | 'D' | 'E';
  choices: Choice[];
  body: string;
}

export interface PaperProblemEntry {
  year: number;
  ab: string;
  problem_number: number;
  topic: string;
  subtopic: string | null;
  difficulty: number | null;
  answer: 'A' | 'B' | 'C' | 'D' | 'E';
  choices: Choice[];
  source?: string;
  body: string;
}

export interface PaperMeta {
  year: number;
  ab: string;
  title: string;
  date?: string;
  source?: string;
  skipped?: { n: number; reason: string }[];
}

export interface ContentIndex {
  listTopicSlugs(): string[];
  getTopic(slug: string): TopicEntry | undefined;
  listSubtopicSlugs(topic: string): string[];
  getSubtopic(topic: string, slug: string): SubtopicEntry | undefined;
  listAllSubtopics(): { topic: string; subtopic: string }[];

  listProblemSlugs(topic: string, subtopic: string): string[];
  getProblem(topic: string, subtopic: string, slug: string): ProblemEntry | undefined;
  listAllProblems(): { topic: string; subtopic: string; slug: string }[];

  listPaperKeys(): string[];
  getPaperMeta(year: string, ab: string): PaperMeta | undefined;
  listPaperProblems(year: string, ab: string): number[];
  getPaperProblem(year: string, ab: string, n: number): PaperProblemEntry | undefined;
}

function readMdx(filePath: string): { data: Record<string, unknown>; content: string } | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  return { data, content };
}

export function createContentIndex(rootDir: string): ContentIndex {
  const conceptsRoot = path.join(rootDir, 'concepts');
  const problemsRoot = path.join(rootDir, 'problems');
  const papersRoot = path.join(rootDir, 'papers');

  function topicDir(topic: string): string {
    return path.join(conceptsRoot, topic);
  }

  function problemFile(topic: string, subtopic: string, slug: string): string {
    return path.join(problemsRoot, topic, subtopic, `${slug}.mdx`);
  }

  function paperDir(year: string, ab: string): string {
    return path.join(papersRoot, `${year}-${ab}`);
  }

  function readChoices(raw: unknown): Choice[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((c) => String(c));
  }

  function readAnswer(raw: unknown): 'A' | 'B' | 'C' | 'D' | 'E' {
    const s = String(raw ?? '').toUpperCase();
    if (s === 'A' || s === 'B' || s === 'C' || s === 'D' || s === 'E') return s;
    throw new Error(`Invalid answer: ${raw}`);
  }

  function topicSlugsDir(): string[] {
    if (!fs.existsSync(conceptsRoot)) return [];
    return fs
      .readdirSync(conceptsRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .filter((name) => fs.existsSync(path.join(conceptsRoot, name, 'index.mdx')))
      .sort();
  }

  function subSlugsDir(topic: string): string[] {
    const dir = topicDir(topic);
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.mdx') && f !== 'index.mdx')
      .map((f) => f.slice(0, -4))
      .sort();
  }

  return {
    listTopicSlugs(): string[] {
      return topicSlugsDir();
    },

    getTopic(slug: string): TopicEntry | undefined {
      const file = readMdx(path.join(topicDir(slug), 'index.mdx'));
      if (!file) return undefined;
      return {
        slug,
        title: String(file.data.title ?? slug),
        summary: String(file.data.summary ?? ''),
        body: file.content,
      };
    },

    listSubtopicSlugs(topic: string): string[] {
      return subSlugsDir(topic);
    },

    getSubtopic(topic: string, slug: string): SubtopicEntry | undefined {
      const file = readMdx(path.join(topicDir(topic), `${slug}.mdx`));
      if (!file) return undefined;
      const difficulty =
        typeof file.data.difficulty === 'number' ? (file.data.difficulty as number) : undefined;
      return {
        topic,
        slug,
        title: String(file.data.title ?? slug),
        summary: String(file.data.summary ?? ''),
        difficulty,
        body: file.content,
      };
    },

    listAllSubtopics(): { topic: string; subtopic: string }[] {
      const out: { topic: string; subtopic: string }[] = [];
      for (const t of topicSlugsDir()) {
        for (const s of subSlugsDir(t)) out.push({ topic: t, subtopic: s });
      }
      return out;
    },

    listProblemSlugs(topic: string, subtopic: string): string[] {
      const dir = path.join(problemsRoot, topic, subtopic);
      if (!fs.existsSync(dir)) return [];
      return fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.mdx'))
        .map((f) => f.slice(0, -4))
        .sort();
    },

    getProblem(topic: string, subtopic: string, slug: string): ProblemEntry | undefined {
      const file = readMdx(problemFile(topic, subtopic, slug));
      if (!file) return undefined;
      return {
        topic,
        subtopic,
        slug,
        difficulty: Number(file.data.difficulty ?? 1),
        answer: readAnswer(file.data.answer),
        choices: readChoices(file.data.choices),
        body: file.content,
      };
    },

    listAllProblems(): { topic: string; subtopic: string; slug: string }[] {
      if (!fs.existsSync(problemsRoot)) return [];
      const out: { topic: string; subtopic: string; slug: string }[] = [];
      for (const t of fs.readdirSync(problemsRoot)) {
        const tDir = path.join(problemsRoot, t);
        if (!fs.statSync(tDir).isDirectory()) continue;
        for (const s of fs.readdirSync(tDir)) {
          const sDir = path.join(tDir, s);
          if (!fs.statSync(sDir).isDirectory()) continue;
          for (const f of fs.readdirSync(sDir)) {
            if (f.endsWith('.mdx')) out.push({ topic: t, subtopic: s, slug: f.slice(0, -4) });
          }
        }
      }
      return out.sort((a, b) =>
        a.topic === b.topic
          ? a.subtopic === b.subtopic
            ? a.slug.localeCompare(b.slug)
            : a.subtopic.localeCompare(b.subtopic)
          : a.topic.localeCompare(b.topic),
      );
    },

    listPaperKeys(): string[] {
      if (!fs.existsSync(papersRoot)) return [];
      return fs
        .readdirSync(papersRoot, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .filter((name) => fs.existsSync(path.join(papersRoot, name, 'meta.json')))
        .sort();
    },

    getPaperMeta(year: string, ab: string): PaperMeta | undefined {
      const file = path.join(paperDir(year, ab), 'meta.json');
      if (!fs.existsSync(file)) return undefined;
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      return {
        year: Number(raw.year),
        ab: String(raw.ab),
        title: String(raw.title ?? ''),
        date: raw.date ? String(raw.date) : undefined,
        source: raw.source ? String(raw.source) : undefined,
        skipped: Array.isArray(raw.skipped)
          ? raw.skipped.map((s: { n: number; reason: string }) => ({ n: Number(s.n), reason: String(s.reason) }))
          : undefined,
      };
    },

    listPaperProblems(year: string, ab: string): number[] {
      const dir = paperDir(year, ab);
      if (!fs.existsSync(dir)) return [];
      return fs
        .readdirSync(dir)
        .filter((f) => /^p\d+\.mdx$/.test(f))
        .map((f) => Number(f.slice(1, -4)))
        .sort((a, b) => a - b);
    },

    getPaperProblem(year: string, ab: string, n: number): PaperProblemEntry | undefined {
      const file = readMdx(path.join(paperDir(year, ab), `p${String(n).padStart(2, '0')}.mdx`));
      if (!file) return undefined;
      return {
        year: Number(file.data.year ?? Number(year)),
        ab: String(file.data.paper ?? ab),
        problem_number: n,
        topic: String(file.data.topic ?? 'unknown'),
        subtopic: file.data.subtopic ? String(file.data.subtopic) : null,
        difficulty: typeof file.data.difficulty === 'number' ? file.data.difficulty : null,
        answer: readAnswer(file.data.answer),
        choices: readChoices(file.data.choices),
        source: file.data.source ? String(file.data.source) : undefined,
        body: file.content,
      };
    },
  };
}

/** Default singleton bound to the project's /content directory. */
export const contentIndex: ContentIndex = createContentIndex(
  path.join(process.cwd(), 'content'),
);
