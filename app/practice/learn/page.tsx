import { Suspense } from 'react';
import { LearnSession, type LearnSessionProblem } from '@/components/practice/learn-session';
import { RenderMdx } from '@/components/mdx/render-mdx';
import { getAllPracticeProblems } from '@/lib/practice-catalog';

export const metadata = { title: 'Learn Run — AMC // 10' };

export default async function LearnRunPage() {
  // In a static export, searchParams are not available server-side.
  // We pre-render ALL problems and bodies here; the client component
  // reads ?topic and ?count via useSearchParams() and filters/slices.
  const all = getAllPracticeProblems();

  const problems: LearnSessionProblem[] = all.map((p) => ({
    slug: p.slug,
    topic: p.topic,
    subtopic: p.subtopic,
    answer: p.answer,
    choices: p.choices,
  }));

  // Pre-render each MDX body to a React element on the server (RSC).
  // We pass the resulting array of elements as a prop to the client component.
  const bodies = all.map((p, i) => <RenderMdx key={i} source={p.body} />);

  return (
    <Suspense fallback={<div className="font-mono text-[11px] text-cyber-mute">LOADING...</div>}>
      <LearnSession problems={problems} bodies={bodies} />
    </Suspense>
  );
}
