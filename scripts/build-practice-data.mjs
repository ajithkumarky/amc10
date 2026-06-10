import fs from 'node:fs';
import path from 'node:path';
import { collectPoolRecords } from './practice-data-lib.mjs';

const TOPICS = ['algebra', 'geometry', 'number-theory', 'counting-probability'];

const contentRoot = path.join(process.cwd(), 'content');
const outDir = path.join(process.cwd(), 'public', 'practice-data');

const records = await collectPoolRecords(contentRoot);

const broken = records.filter((r) => !r.problemHtml.trim() || !r.solutionHtml.trim());
if (broken.length > 0) {
  console.error(
    `practice-data: ${broken.length} records with empty problem/solution HTML (tag mismatch?) — first: ${broken[0].slug}`,
  );
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

for (const topic of TOPICS) {
  const subset = records.filter((r) => r.topic === topic);
  fs.writeFileSync(path.join(outDir, `${topic}.json`), JSON.stringify(subset));
  console.log(`practice-data: ${topic}.json — ${subset.length} problems`);
}

const unknown = records.filter((r) => !TOPICS.includes(r.topic));
if (unknown.length > 0) {
  console.error(`practice-data: ${unknown.length} records with unknown topic — first: ${unknown[0].slug}`);
  process.exit(1);
}
