import Link from 'next/link';
import { cn } from '@/lib/cn';

export interface TopicTileProps {
  slug: string;
  name: string;
  progress: number;
  accent: string;
  className?: string;
}

export function TopicTile({ slug, name, progress, accent, className }: TopicTileProps) {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <Link
      href={`/learn/${slug}`}
      className={cn(
        'block rounded-[4px] border border-[#2a1a4a] bg-[rgba(20,8,40,0.5)] px-4 py-3',
        'transition-colors hover:border-cyber-cyan',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-base tracking-widest text-cyber-ink">
          {name.toUpperCase()}
        </span>
        <span className="font-mono text-[11px] text-cyber-cyan">{safeProgress}%</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-sm bg-[#2a1a4a]">
        <div
          data-testid="bar-fill"
          className="h-full"
          style={{
            width: `${safeProgress}%`,
            backgroundImage: `linear-gradient(90deg, ${accent}, #00e5ff)`,
          }}
        />
      </div>
    </Link>
  );
}
