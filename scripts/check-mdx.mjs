import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import remarkMath from 'remark-math';

const stub = ({ children }) => createElement('div', null, children);
const components = { Problem: stub, Solution: stub, AlternateMethod: stub };

function mdxFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...mdxFiles(p));
    else if (entry.name.endsWith('.mdx')) out.push(p);
  }
  return out;
}

const root = path.join(process.cwd(), 'content');
const files = mdxFiles(root);
let bad = 0;
for (const f of files) {
  const { content } = matter(fs.readFileSync(f, 'utf8'));
  try {
    if (/style="/.test(content)) {
      throw new Error('string style attribute (React JSX needs an object; drop the style attr)');
    }
    if (/<!--/.test(content)) {
      throw new Error('HTML comment (MDX cannot parse <!-- -->)');
    }
    const { default: MDXContent } = await evaluate(content, {
      ...runtime,
      remarkPlugins: [remarkMath],
    });
    renderToStaticMarkup(createElement(MDXContent, { components }));
  } catch (e) {
    bad++;
    console.error(`FAIL ${path.relative(root, f)}: ${e.message.split('\n')[0]}`);
  }
}
console.log(`check-mdx: ${files.length} files, ${bad} failures`);
process.exit(bad > 0 ? 1 : 0);
