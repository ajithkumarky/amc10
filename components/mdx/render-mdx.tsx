import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { cn } from '@/lib/cn';
import { proseClasses } from '@/lib/prose';
import { Problem } from './problem';
import { Solution } from './solution';
import { AlternateMethod } from './alternate-method';

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
