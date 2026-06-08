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

export interface ContentIndex {
  listTopicSlugs(): string[];
  getTopic(slug: string): TopicEntry | undefined;
  listSubtopicSlugs(topic: string): string[];
  getSubtopic(topic: string, slug: string): SubtopicEntry | undefined;
  listAllSubtopics(): { topic: string; subtopic: string }[];
}

function readMdx(filePath: string): { data: Record<string, unknown>; content: string } | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  return { data, content };
}

export function createContentIndex(rootDir: string): ContentIndex {
  const conceptsRoot = path.join(rootDir, 'concepts');

  function topicDir(topic: string): string {
    return path.join(conceptsRoot, topic);
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
  };
}

/** Default singleton bound to the project's /content directory. */
export const contentIndex: ContentIndex = createContentIndex(
  path.join(process.cwd(), 'content'),
);
