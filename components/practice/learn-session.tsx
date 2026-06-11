'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Chip } from '@/components/ui/chip';
import { Panel } from '@/components/ui/panel';
import { ChoiceRow, type ChoiceLetter } from './choice-row';

async function recordAttempt(payload: {
  problem_slug: string;
  topic: string;
  subtopic?: string | null;
  selected_answer: string;
  is_correct: boolean;
  mode: 'learn' | 'test';
  time_seconds?: number;
}) {
  try {
    await fetch('/api/attempts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // silent — anonymous or offline; the session continues.
  }
}

export interface LearnSessionProblem {
  slug: string;
  topic: string;
  subtopic: string | null;
  answer: 'A' | 'B' | 'C' | 'D' | 'E';
  choices: string[];
}

export interface LearnSessionProps {
  problems: LearnSessionProblem[];
  bodies: ReactNode[];
  solutions?: ReactNode[];
}

interface AttemptState {
  selected: ChoiceLetter | null;
  submitted: boolean;
}

function shuffleIndices(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function LearnSession({ problems, bodies, solutions }: LearnSessionProps) {
  const searchParams = useSearchParams();
  const topic = searchParams.get('topic') ?? undefined;
  const count = Math.max(1, Math.min(20, Number(searchParams.get('count')) || 10));

  // Filter problems by topic if specified (indices into the original arrays)
  const filteredIndices = useMemo(
    () =>
      problems.reduce<number[]>((acc, p, i) => {
        if (!topic || p.topic === topic) acc.push(i);
        return acc;
      }, []),
    [problems, topic],
  );

  // Shuffle the filtered indices and slice to count
  const order = useMemo(() => {
    const shuffled = shuffleIndices(filteredIndices.length);
    return shuffled.slice(0, Math.min(count, filteredIndices.length)).map((i) => filteredIndices[i]);
  }, [filteredIndices, count]);

  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState<AttemptState[]>(() =>
    order.map(() => ({ selected: null, submitted: false })),
  );

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

  const sessionLen = order.length;
  const allSubmitted = attempts.every((a) => a.submitted);
  const done = allSubmitted && index === sessionLen - 1 && attempts[index].submitted;

  const currentProblemIdx = order[index];
  const currentProblem = problems[currentProblemIdx];
  const currentBody = bodies[currentProblemIdx];
  const attempt = attempts[index];
  const correctCount = attempts.filter(
    (a, i) => a.submitted && a.selected === problems[order[i]].answer,
  ).length;

  function setSelected(ltr: ChoiceLetter) {
    setAttempts((prev) => prev.map((a, i) => (i === index ? { ...a, selected: ltr } : a)));
  }

  function submit() {
    if (attempt.submitted) return;
    setAttempts((prev) => prev.map((a, i) => (i === index ? { ...a, submitted: true } : a)));
    void recordAttempt({
      problem_slug: currentProblem.slug,
      topic: currentProblem.topic,
      subtopic: currentProblem.subtopic,
      selected_answer: attempt.selected!,
      is_correct: attempt.selected === currentProblem.answer,
      mode: 'learn',
    });
  }

  function next() {
    setIndex((i) => Math.min(i + 1, sessionLen - 1));
  }

  if (done) {
    return (
      <Panel kicker="MISSION_COMPLETE">
        <h2 className="font-display text-3xl tracking-widest text-cyber-cyan">RUN COMPLETE</h2>
        <p className="mt-2 text-sm text-cyber-mute">
          You answered {correctCount} of {sessionLen} correctly.
        </p>
        <ol className="mt-4 space-y-1 text-sm text-cyber-mute">
          {order.map((origIdx, i) => {
            const p = problems[origIdx];
            const ok = attempts[i].selected === p.answer;
            return (
              <li key={p.slug}>
                {ok ? '✓' : '✗'} {p.topic} / {p.subtopic ?? 'mixed'} / {p.slug.split('/').pop()}
              </li>
            );
          })}
        </ol>
        <div className="mt-4 flex gap-2">
          <Chip href="/practice">NEW RUN</Chip>
          <Chip href="/learn" variant="ghost">BROWSE CONCEPTS</Chip>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between font-mono text-[11px] text-cyber-mute">
        <span>Q {index + 1} / {sessionLen}</span>
        <span className="text-cyber-cyan">
          {currentProblem.topic.toUpperCase()} / {(currentProblem.subtopic ?? 'mixed').toUpperCase()}
        </span>
        <span>{correctCount} correct</span>
      </div>

      <Panel kicker={`MISSION_${String(index + 1).padStart(2, '0')}`}>
        <div>{currentBody}</div>
        {attempt.submitted && solutions?.[currentProblemIdx]}
        <ChoiceRow
          choices={currentProblem.choices}
          selected={attempt.selected}
          onSelect={setSelected}
          revealed={attempt.submitted}
          correctAnswer={currentProblem.answer}
        />
        <div className="mt-4 flex items-center justify-between">
          <Link
            href="/practice"
            className="font-mono text-[11px] uppercase tracking-widest text-cyber-mute hover:text-cyber-cyan"
          >
            ABORT RUN
          </Link>
          {attempt.submitted ? (
            <button
              type="button"
              onClick={next}
              disabled={index >= sessionLen - 1}
              className="inline-flex items-center rounded-[2px] bg-cyber-chip px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
            >
              NEXT &rarr;
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!attempt.selected}
              className="inline-flex items-center rounded-[2px] bg-cyber-chip px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
            >
              SUBMIT
            </button>
          )}
        </div>
      </Panel>
    </div>
  );
}
