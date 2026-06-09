import { Suspense } from 'react';
import { TestSession, type TestSessionProblem } from '@/components/practice/test-session';
import { RenderMdx } from '@/components/mdx/render-mdx';
import { getAllPracticeProblems } from '@/lib/practice-catalog';

export const metadata = { title: 'Test Run — AMC // 10' };

export default function TestRunPage() {
  const all = getAllPracticeProblems();

  const problems: TestSessionProblem[] = all.map((p) => ({
    slug: p.slug,
    topic: p.topic,
    subtopic: p.subtopic,
    answer: p.answer,
    choices: p.choices,
  }));

  const bodies = all.map((p, i) => <RenderMdx key={i} source={p.body} />);

  return (
    <Suspense fallback={<div className="text-cyber-mute">Loading…</div>}>
      <TestSession problems={problems} bodies={bodies} />
    </Suspense>
  );
}
