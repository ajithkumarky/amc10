import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const args = process.argv.slice(2);
if (args.length !== 1) {
  process.stderr.write('Usage: node scripts/blind-check.mjs <answers.json>\n');
  process.exit(1);
}

const answersPath = path.resolve(args[0]);
if (!fs.existsSync(answersPath)) {
  process.stderr.write(`ERROR: answers file not found: ${args[0]}\n`);
  process.exit(1);
}

let entries;
try {
  entries = JSON.parse(fs.readFileSync(answersPath, 'utf8'));
} catch (e) {
  process.stderr.write(`ERROR: failed to parse answers file: ${e.message}\n`);
  process.exit(1);
}

if (!Array.isArray(entries)) {
  process.stderr.write('ERROR: answers file must be a JSON array\n');
  process.exit(1);
}

const cwd = process.cwd();
let nOk = 0;
let nMismatch = 0;
let nError = 0;

for (const entry of entries) {
  const file = entry?.file;
  const verifierAnswer = entry?.answer;

  if (!file || typeof file !== 'string') {
    process.stdout.write(`ERROR <unknown>: missing or invalid "file" field\n`);
    nError++;
    continue;
  }

  if (!verifierAnswer || typeof verifierAnswer !== 'string') {
    process.stdout.write(`ERROR ${file}: missing or invalid "answer" field\n`);
    nError++;
    continue;
  }

  const abs = path.resolve(cwd, file);
  if (!fs.existsSync(abs)) {
    process.stdout.write(`ERROR ${file}: file not found\n`);
    nError++;
    continue;
  }

  let data;
  try {
    ({ data } = matter(fs.readFileSync(abs, 'utf8')));
  } catch (e) {
    process.stdout.write(`ERROR ${file}: failed to parse MDX: ${e.message}\n`);
    nError++;
    continue;
  }

  const expected = data.answer;
  if (!expected || typeof expected !== 'string') {
    process.stdout.write(`ERROR ${file}: frontmatter "answer" missing or invalid\n`);
    nError++;
    continue;
  }

  if (verifierAnswer.toUpperCase() !== expected.toUpperCase()) {
    process.stdout.write(`MISMATCH ${file}: verifier=${verifierAnswer.toUpperCase()} expected=${expected.toUpperCase()}\n`);
    nMismatch++;
  } else {
    nOk++;
  }
}

process.stdout.write(`RESULT: ${nOk} ok, ${nMismatch} mismatch, ${nError} error\n`);

if (nMismatch > 0 || nError > 0) {
  process.exit(1);
}
