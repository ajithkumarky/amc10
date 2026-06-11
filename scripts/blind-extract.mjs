import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

function extractProblem(body) {
  const re = /<Problem(?:\s+title="[^"]*")?\s*>([\s\S]*?)<\/Problem>/;
  const m = re.exec(body);
  return m ? m[1].trim() : null;
}

function resolveFiles(args) {
  const files = [];
  for (const arg of args) {
    const abs = path.resolve(arg);
    if (!fs.existsSync(abs)) {
      process.stderr.write(`ERROR: path not found: ${arg}\n`);
      process.exit(1);
    }
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      for (const f of fs.readdirSync(abs)) {
        if (f.endsWith('.mdx')) {
          files.push(path.join(abs, f));
        }
      }
    } else {
      files.push(abs);
    }
  }
  return files;
}

const args = process.argv.slice(2);
if (args.length === 0) {
  process.stderr.write('Usage: node scripts/blind-extract.mjs <file-or-dir> [more...]\n');
  process.exit(1);
}

const cwd = process.cwd();
const filePaths = resolveFiles(args);
const results = [];
let hasError = false;

for (const abs of filePaths) {
  const rel = path.relative(cwd, abs).replace(/\\/g, '/');
  const raw = fs.readFileSync(abs, 'utf8');
  const { data, content } = matter(raw);

  const problem = extractProblem(content);
  if (!problem) {
    process.stderr.write(`ERROR: no <Problem> block found in ${rel}\n`);
    hasError = true;
    continue;
  }

  const choices = data.choices;
  if (!Array.isArray(choices) || choices.length !== 5) {
    process.stderr.write(`ERROR: choices must be a 5-element array in ${rel}\n`);
    hasError = true;
    continue;
  }

  results.push({
    file: rel,
    problem,
    choices: choices.map(String),
  });
}

if (hasError) {
  process.exit(1);
}

process.stdout.write(JSON.stringify(results, null, 2) + '\n');
