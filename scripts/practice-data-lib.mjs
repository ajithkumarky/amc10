import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';

function matchAll(body, tag) {
  const re = new RegExp(`<${tag}(?:\\s+title="([^"]*)")?\\s*>([\\s\\S]*?)</${tag}>`, 'g');
  const out = [];
  let m;
  while ((m = re.exec(body)) !== null) {
    out.push({ title: m[1] ?? '', content: m[2].trim() });
  }
  return out;
}

export function extractSegments(body) {
  const problems = matchAll(body, 'Problem');
  const solutions = matchAll(body, 'Solution');
  return {
    problem: problems[0]?.content ?? '',
    solution: solutions[0]?.content ?? '',
    alternates: matchAll(body, 'AlternateMethod'),
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkMath)
  .use(remarkRehype)
  .use(rehypeKatex, { strict: false })
  .use(rehypeStringify);

export async function renderMarkdown(md) {
  return String(await processor.process(md));
}

async function toRecord(slug, data, body) {
  const seg = extractSegments(body);
  return {
    slug,
    topic: String(data.topic),
    subtopic: data.subtopic ? String(data.subtopic) : null,
    difficulty: Number(data.difficulty ?? 0) || null,
    answer: String(data.answer),
    choices: (data.choices ?? []).map(String),
    problemHtml: await renderMarkdown(seg.problem),
    solutionHtml: await renderMarkdown(seg.solution),
    alternates: await Promise.all(
      seg.alternates.map(async (a) => ({ title: a.title, html: await renderMarkdown(a.content) })),
    ),
  };
}

export async function collectPoolRecords(contentRoot) {
  const records = [];

  // Originals: content/problems/<topic>/<subtopic>/*.mdx — always pooled.
  const problemsRoot = path.join(contentRoot, 'problems');
  if (fs.existsSync(problemsRoot)) {
    for (const topic of fs.readdirSync(problemsRoot)) {
      const tDir = path.join(problemsRoot, topic);
      if (!fs.statSync(tDir).isDirectory()) continue;
      for (const sub of fs.readdirSync(tDir)) {
        const sDir = path.join(tDir, sub);
        if (!fs.statSync(sDir).isDirectory()) continue;
        for (const f of fs.readdirSync(sDir)) {
          if (!f.endsWith('.mdx')) continue;
          const { data, content } = matter(fs.readFileSync(path.join(sDir, f), 'utf8'));
          records.push(await toRecord(`${topic}/${sub}/${f.slice(0, -4)}`, data, content));
        }
      }
    }
  }

  // Paper problems: pooled only when tagged with a known topic AND a difficulty.
  const papersRoot = path.join(contentRoot, 'papers');
  if (fs.existsSync(papersRoot)) {
    for (const dir of fs.readdirSync(papersRoot)) {
      const pDir = path.join(papersRoot, dir);
      if (!fs.statSync(pDir).isDirectory()) continue;
      for (const f of fs.readdirSync(pDir)) {
        if (!/^p\d+\.mdx$/.test(f)) continue;
        const { data, content } = matter(fs.readFileSync(path.join(pDir, f), 'utf8'));
        if (!data.topic || typeof data.difficulty !== 'number') continue;
        records.push(await toRecord(`papers/${dir}/${f.slice(0, -4)}`, data, content));
      }
    }
  }

  return records;
}
