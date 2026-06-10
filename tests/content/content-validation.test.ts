import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { TOPICS } from '@/lib/topics';
import { isValidSubtopic } from '@/lib/subtopics';

const ROOT = path.join(process.cwd(), 'content');
const TOPIC_SLUGS = TOPICS.map((t) => t.slug as string);
const ANSWERS = ['A', 'B', 'C', 'D', 'E'];

function mdxFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...mdxFiles(p));
    else if (entry.name.endsWith('.mdx')) out.push(p);
  }
  return out;
}

describe('original problems', () => {
  const files = mdxFiles(path.join(ROOT, 'problems'));

  it('exist', () => expect(files.length).toBeGreaterThan(0));

  it.each(files.map((f) => [path.relative(ROOT, f), f]))('%s is valid', (_rel, file) => {
    const { data, content } = matter(fs.readFileSync(file as string, 'utf8'));
    expect(TOPIC_SLUGS).toContain(data.topic);
    expect(isValidSubtopic(String(data.topic), String(data.subtopic))).toBe(true);
    expect(Number.isInteger(data.difficulty)).toBe(true);
    expect(data.difficulty).toBeGreaterThanOrEqual(1);
    expect(data.difficulty).toBeLessThanOrEqual(5);
    expect(ANSWERS).toContain(data.answer);
    expect(Array.isArray(data.choices) && data.choices.length === 5).toBe(true);
    expect(content).toMatch(/<Problem>[\s\S]*?\S[\s\S]*?<\/Problem>/);
    expect(content).toMatch(/<Solution>[\s\S]*?\S[\s\S]*?<\/Solution>/);
    // path agrees with frontmatter
    const parts = path.relative(path.join(ROOT, 'problems'), file as string).split(path.sep);
    expect(parts[0]).toBe(data.topic);
    expect(parts[1]).toBe(data.subtopic);
  });
});

describe('paper problems', () => {
  const papersRoot = path.join(ROOT, 'papers');
  const files = mdxFiles(papersRoot);

  it.each(files.map((f) => [path.relative(ROOT, f), f]))('%s is valid', (_rel, file) => {
    const { data, content } = matter(fs.readFileSync(file as string, 'utf8'));
    expect(ANSWERS).toContain(data.answer);
    expect(Array.isArray(data.choices) && data.choices.length === 5).toBe(true);
    expect(content).toMatch(/<Problem>[\s\S]*?\S[\s\S]*?<\/Problem>/);
    expect(content).toMatch(/<Solution>[\s\S]*?\S[\s\S]*?<\/Solution>/);
    if (data.topic !== undefined) expect(TOPIC_SLUGS).toContain(data.topic);
    if (data.difficulty !== undefined) {
      expect(Number.isInteger(data.difficulty)).toBe(true);
      expect(data.difficulty).toBeGreaterThanOrEqual(1);
      expect(data.difficulty).toBeLessThanOrEqual(5);
    }
    if (data.subtopic !== undefined && data.subtopic !== null) {
      expect(isValidSubtopic(String(data.topic), String(data.subtopic))).toBe(true);
    }
  });

  it('every paper dir has a valid meta.json', () => {
    if (!fs.existsSync(papersRoot)) return;
    for (const dir of fs.readdirSync(papersRoot)) {
      const metaPath = path.join(papersRoot, dir, 'meta.json');
      expect(fs.existsSync(metaPath), `${dir}/meta.json missing`).toBe(true);
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      expect(typeof meta.year).toBe('number');
      expect(typeof meta.ab).toBe('string');
      expect(typeof meta.title).toBe('string');
      if (meta.skipped !== undefined) {
        expect(Array.isArray(meta.skipped)).toBe(true);
        for (const s of meta.skipped) {
          expect(Number.isInteger(s.n)).toBe(true);
          expect(typeof s.reason).toBe('string');
        }
      }
    }
  });

  it('every paper dir has at least one problem file', () => {
    if (!fs.existsSync(papersRoot)) return;
    for (const dir of fs.readdirSync(papersRoot)) {
      const problemCount = fs
        .readdirSync(path.join(papersRoot, dir))
        .filter((f) => /^p\d+\.mdx$/.test(f)).length;
      expect(problemCount, `${dir} has no problem files`).toBeGreaterThan(0);
    }
  });
});

describe('concept pages', () => {
  it('every non-index concept file maps to a registered subtopic', () => {
    const conceptsRoot = path.join(ROOT, 'concepts');
    for (const topic of fs.readdirSync(conceptsRoot)) {
      const dir = path.join(conceptsRoot, topic);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith('.mdx') || f === 'index.mdx') continue;
        expect(isValidSubtopic(topic, f.slice(0, -4)), `${topic}/${f}`).toBe(true);
      }
    }
  });
});
