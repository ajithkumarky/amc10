import Link from 'next/link';
import type { Route } from 'next';
import { Panel } from '@/components/ui/panel';
import { TOPICS } from '@/lib/topics';
import { cn } from '@/lib/cn';

export const metadata = { title: 'Practice — AMC // 10' };

interface RunCardProps {
  href: string;
  label: string;
  description: string;
  accent: string;
}

function RunCard({ href, label, description, accent }: RunCardProps) {
  return (
    <Link
      href={href as Route}
      className={cn(
        'block rounded-[4px] border border-[#2a1a4a] bg-[rgba(20,8,40,0.5)] p-4',
        'transition-colors hover:border-cyber-cyan',
      )}
    >
      <span
        className="font-display text-lg tracking-widest"
        style={{ color: accent }}
      >
        {label.toUpperCase()}
      </span>
      <p className="mt-1 text-xs text-cyber-mute">{description}</p>
    </Link>
  );
}

export default function PracticeHub() {
  return (
    <div className="space-y-6">
      <Panel kicker="PRACTICE_HUB">
        <h1 className="font-display text-3xl tracking-widest text-cyber-ink">
          PICK YOUR RUN
        </h1>
        <p className="mt-2 text-sm text-cyber-mute">
          <strong className="text-cyber-amber">LEARN MODE</strong> shows the solution after every problem.
          <br />
          <strong className="text-cyber-amber">TEST MODE</strong> holds feedback until the end.
        </p>
      </Panel>

      <div>
        <h2 className="font-display text-xl tracking-widest text-cyber-ink">LEARN MODE</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <RunCard
            href="/practice/learn?count=10"
            label="Daily Mix"
            description="Up to 10 problems across all topics."
            accent="#ff2e9c"
          />
          {TOPICS.map((t) => (
            <RunCard
              key={`learn-${t.slug}`}
              href={`/practice/learn?topic=${t.slug}&count=5`}
              label={t.name}
              description={`Up to 5 problems · ${t.name}.`}
              accent={t.accent}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl tracking-widest text-cyber-ink">TEST MODE</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <RunCard
            href="/practice/test?count=10"
            label="Mock Test (10)"
            description="10 problems · no feedback until end."
            accent="#00e5ff"
          />
          {TOPICS.map((t) => (
            <RunCard
              key={`test-${t.slug}`}
              href={`/practice/test?topic=${t.slug}&count=5`}
              label={`${t.name} Test`}
              description={`5 problems · ${t.name} only.`}
              accent={t.accent}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
