'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { proseClasses } from '@/lib/prose';
import { Solution } from '@/components/mdx/solution';
import { AlternateMethod } from '@/components/mdx/alternate-method';
import { LearnSession } from './learn-session';
import { TestSession } from './test-session';

export interface PracticeRecord {
  slug: string;
  topic: string;
  subtopic: string | null;
  difficulty: number | null;
  answer: 'A' | 'B' | 'C' | 'D' | 'E';
  choices: string[];
  problemHtml: string;
  solutionHtml: string;
  alternates: { title: string; html: string }[];
}

const PRACTICE_TOPICS = ['algebra', 'geometry', 'number-theory', 'counting-probability'];

async function fetchPracticePool(topic?: string): Promise<PracticeRecord[]> {
  const topics = topic && PRACTICE_TOPICS.includes(topic) ? [topic] : PRACTICE_TOPICS;
  const results = await Promise.all(
    topics.map(async (t) => {
      const r = await fetch(`/practice-data/${t}.json`);
      if (!r.ok) return [] as PracticeRecord[];
      return (await r.json()) as PracticeRecord[];
    }),
  );
  return results.flat();
}

export function PracticeSessionLoader({ mode }: { mode: 'learn' | 'test' }) {
  const searchParams = useSearchParams();
  const topic = searchParams.get('topic') ?? undefined;
  const [pool, setPool] = useState<PracticeRecord[] | null>(null);

  useEffect(() => {
    let aborted = false;
    fetchPracticePool(topic)
      .then((p) => {
        if (!aborted) setPool(p);
      })
      .catch(() => {
        if (!aborted) setPool([]);
      });
    return () => {
      aborted = true;
    };
  }, [topic]);

  if (!pool) {
    return <div className="font-mono text-[11px] text-cyber-mute">LOADING PROBLEM BANK...</div>;
  }

  const problems = pool.map((r) => ({
    slug: r.slug,
    topic: r.topic,
    subtopic: r.subtopic,
    answer: r.answer,
    choices: r.choices,
  }));
  const bodies = pool.map((r) => (
    <div key={r.slug} className={proseClasses} dangerouslySetInnerHTML={{ __html: r.problemHtml }} />
  ));
  const solutions = pool.map((r) => (
    <div key={r.slug}>
      <Solution>
        <div className={proseClasses} dangerouslySetInnerHTML={{ __html: r.solutionHtml }} />
      </Solution>
      {r.alternates.map((a, i) => (
        <AlternateMethod key={i} title={a.title}>
          <div className={proseClasses} dangerouslySetInnerHTML={{ __html: a.html }} />
        </AlternateMethod>
      ))}
    </div>
  ));

  return mode === 'learn' ? (
    <LearnSession problems={problems} bodies={bodies} solutions={solutions} />
  ) : (
    <TestSession problems={problems} bodies={bodies} solutions={solutions} />
  );
}
