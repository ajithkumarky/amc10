'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Chip } from '@/components/ui/chip';
import { Panel } from '@/components/ui/panel';
import { ChoiceRow, type ChoiceLetter } from './choice-row';

export interface TestSessionProblem {
  slug: string;
  topic: string;
  subtopic: string;
  answer: 'A' | 'B' | 'C' | 'D' | 'E';
  choices: string[];
}

export interface TestSessionProps {
  problems: TestSessionProblem[];
  bodies: ReactNode[];
}

function shuffleIndices(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function TestSession({ problems, bodies }: TestSessionProps) {
  const searchParams = useSearchParams();
  const topic = searchParams.get('topic') ?? undefined;
  const requestedCount = Math.max(1, Math.min(25, Number(searchParams.get('count')) || 10));

  const filteredIndices = useMemo(() => {
    const idxs = problems.map((_, i) => i);
    return topic ? idxs.filter((i) => problems[i].topic === topic) : idxs;
  }, [problems, topic]);

  const order = useMemo(() => {
    const shuffled = shuffleIndices(filteredIndices.length).map((i) => filteredIndices[i]);
    return shuffled.slice(0, Math.min(requestedCount, filteredIndices.length));
  }, [filteredIndices, requestedCount]);

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<(ChoiceLetter | null)[]>(() => order.map(() => null));
  const [finished, setFinished] = useState(false);

  if (order.length === 0) {
    return (
      <Panel kicker="EMPTY">
        <h2 className="font-display text-2xl tracking-widest text-cyber-pink">NO PROBLEMS YET</h2>
        <p className="mt-2 text-sm text-cyber-mute">This filter has no available problems.</p>
        <div className="mt-4">
          <Chip href="/practice">CHANGE FILTER</Chip>
        </div>
      </Panel>
    );
  }

  const correct = order.filter((origIdx, i) => picked[i] === problems[origIdx].answer).length;

  if (finished) {
    return (
      <Panel kicker="TEST_COMPLETE">
        <h2 className="font-display text-3xl tracking-widest text-cyber-cyan">
          SCORE: {correct} / {order.length}
        </h2>
        <p className="mt-2 text-sm text-cyber-mute">Click any problem to expand the solution.</p>
        <ol className="mt-4 space-y-3">
          {order.map((origIdx, i) => {
            const p = problems[origIdx];
            const ok = picked[i] === p.answer;
            return (
              <li key={p.slug}>
                <details className="rounded-[3px] border border-[#2a1a4a] bg-[rgba(20,8,40,0.5)] p-3">
                  <summary className="cursor-pointer font-mono text-[12px]">
                    <span className={ok ? 'text-cyber-cyan' : 'text-cyber-pink'}>
                      {ok ? '✓' : '✗'}
                    </span>{' '}
                    Q {i + 1} &middot; {p.topic} &middot; {p.subtopic} (your answer: {picked[i] ?? '—'}; correct: {p.answer})
                  </summary>
                  <div className="mt-3">{bodies[origIdx]}</div>
                </details>
              </li>
            );
          })}
        </ol>
        <div className="mt-4 flex gap-2">
          <Chip href="/practice">NEW TEST</Chip>
          <Chip href="/learn" variant="ghost">BROWSE CONCEPTS</Chip>
        </div>
      </Panel>
    );
  }

  const currentOrigIdx = order[index];
  const currentProblem = problems[currentOrigIdx];
  const currentBody = bodies[currentOrigIdx];
  const allAnswered = picked.every((p) => p !== null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between font-mono text-[11px] text-cyber-mute">
        <span>Q {index + 1} / {order.length}</span>
        <span className="text-cyber-cyan">TEST MODE &mdash; NO FEEDBACK UNTIL END</span>
      </div>
      <Panel kicker={`TEST_${String(index + 1).padStart(2, '0')}`}>
        <div>{currentBody}</div>
        <ChoiceRow
          choices={currentProblem.choices}
          selected={picked[index]}
          onSelect={(ltr) => setPicked((prev) => prev.map((v, i) => (i === index ? ltr : v)))}
        />
        <div className="mt-4 flex items-center justify-between gap-2">
          <Link
            href="/practice"
            className="font-mono text-[11px] uppercase tracking-widest text-cyber-mute hover:text-cyber-cyan"
          >
            ABORT
          </Link>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="inline-flex items-center rounded-[2px] border border-cyber-cyan px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-cyber-cyan disabled:opacity-50"
            >
              &larr; PREV
            </button>
            {index < order.length - 1 ? (
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(order.length - 1, i + 1))}
                className="inline-flex items-center rounded-[2px] bg-cyber-chip px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white"
              >
                NEXT &rarr;
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setFinished(true)}
                disabled={!allAnswered}
                className="inline-flex items-center rounded-[2px] bg-cyber-chip px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
              >
                SUBMIT TEST
              </button>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
