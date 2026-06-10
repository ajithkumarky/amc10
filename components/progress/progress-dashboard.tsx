'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { Panel } from '@/components/ui/panel';
import { Stat } from '@/components/ui/stat';
import { Chip } from '@/components/ui/chip';
import { TOPICS } from '@/lib/topics';

interface ProgressData {
  byTopic: { topic: string; attempts: number; correct: number }[];
  bySubtopic: { topic: string; subtopic: string | null; attempts: number; correct: number }[];
  byDay: { date: string; count: number }[];
}

function computeStreak(byDay: { date: string; count: number }[]): number {
  if (byDay.length === 0) return 0;
  const set = new Set(byDay.map((d) => d.date));
  let streak = 0;
  const cursor = new Date();
  // Normalize to UTC date string YYYY-MM-DD
  while (true) {
    const ds = cursor.toISOString().slice(0, 10);
    if (set.has(ds)) {
      streak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    } else break;
  }
  return streak;
}

export function ProgressDashboard() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/progress')
      .then(async (r) => {
        if (r.status === 401) {
          setError('signin');
          return null;
        }
        return r.json();
      })
      .then((d: unknown) => {
        if (d) setData(d as ProgressData);
      })
      .catch(() => setError('network'));
  }, []);

  if (error === 'signin') {
    return (
      <Panel kicker="ACCESS_GATE">
        <h2 className="font-display text-2xl tracking-widest text-cyber-pink">SIGN IN REQUIRED</h2>
        <p className="mt-2 text-sm text-cyber-mute">
          Progress unlocks when you sign in and record your first attempt.
        </p>
        <div className="mt-4">
          <Chip href="/signin">SIGN IN</Chip>
        </div>
      </Panel>
    );
  }

  if (!data) {
    return <Panel kicker="LOADING"><p className="text-sm text-cyber-mute">Loading run data…</p></Panel>;
  }

  const totalAttempts = data.byTopic.reduce((s, t) => s + t.attempts, 0);
  const totalCorrect = data.byTopic.reduce((s, t) => s + t.correct, 0);
  const overallAccuracy = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const streak = computeStreak(data.byDay);

  return (
    <div className="space-y-6">
      <Panel kicker="DASHBOARD">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat value={String(streak)} label="Day Streak" />
          <Stat value={`${overallAccuracy}%`} label="Accuracy" accentClass="text-cyber-cyan" />
          <Stat value={String(totalCorrect)} label="Correct" />
          <Stat value={String(totalAttempts)} label="Attempts" accentClass="text-cyber-amber" />
        </div>
      </Panel>

      <Panel kicker="BY_TOPIC">
        <div className="space-y-3">
          {TOPICS.map((t) => {
            const row = data.byTopic.find((r) => r.topic === t.slug);
            const attempts = row?.attempts ?? 0;
            const correct = row?.correct ?? 0;
            const pct = attempts ? Math.round((correct / attempts) * 100) : 0;
            return (
              <div key={t.slug}>
                <div className="flex items-center justify-between">
                  <Link href={`/learn/${t.slug}` as Route}>
                    <span className="font-display text-base tracking-widest" style={{ color: t.accent }}>
                      {t.name.toUpperCase()}
                    </span>
                  </Link>
                  <span className="font-mono text-[11px] text-cyber-cyan">
                    {correct} / {attempts} &middot; {pct}%
                  </span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-sm bg-[#2a1a4a]">
                  <div
                    className="h-full"
                    style={{ width: `${pct}%`, backgroundImage: `linear-gradient(90deg, ${t.accent}, #00e5ff)` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
