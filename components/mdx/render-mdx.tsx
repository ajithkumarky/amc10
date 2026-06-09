import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { cn } from '@/lib/cn';
import { Problem } from './problem';
import { Solution } from './solution';
import { AlternateMethod } from './alternate-method';

const proseClasses = cn(
  'prose prose-invert max-w-none',
  'prose-headings:font-display prose-headings:tracking-widest prose-headings:text-cyber-ink',
  'prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl',
  'prose-p:text-cyber-mute prose-p:leading-relaxed',
  'prose-strong:text-cyber-ink',
  'prose-a:text-cyber-cyan hover:prose-a:underline',
  'prose-code:text-cyber-amber prose-code:font-mono',
  'prose-li:text-cyber-mute',
);

const components = { Problem, Solution, AlternateMethod };

export interface RenderMdxProps {
  source: string;
  className?: string;
}

export function RenderMdx({ source, className }: RenderMdxProps) {
  return (
    <div className={cn(proseClasses, className)}>
      <MDXRemote
        source={source}
        components={components}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkMath],
            rehypePlugins: [[rehypeKatex, { strict: false }]],
          },
        }}
      />
    </div>
  );
}
