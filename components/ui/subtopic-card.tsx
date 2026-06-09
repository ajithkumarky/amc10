import Link from 'next/link';
import type { Route } from 'next';
import { cn } from '@/lib/cn';

export interface SubtopicCardProps {
  topic: string;
  slug: string;
  title: string;
  summary: string;
  accent: string;
  difficulty?: number;
  className?: string;
}

export function SubtopicCard({
  topic,
  slug,
  title,
  summary,
  accent,
  difficulty,
  className,
}: SubtopicCardProps) {
  return (
    <Link
      href={`/learn/${topic}/${slug}` as Route}
      className={cn(
        'block rounded-[4px] border border-[#2a1a4a] bg-[rgba(20,8,40,0.5)] p-4',
        'transition-colors hover:border-cyber-cyan',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className="font-display text-lg tracking-widest"
          style={{ color: accent }}
        >
          {title.toUpperCase()}
        </span>
        {typeof difficulty === 'number' && (
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                data-testid="difficulty-dot"
                data-active={i < difficulty}
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  i < difficulty ? 'bg-cyber-cyan' : 'bg-[#2a1a4a]',
                )}
              />
            ))}
          </div>
        )}
      </div>
      <p className="mt-2 text-sm text-cyber-mute">{summary}</p>
    </Link>
  );
}
