import Link from 'next/link';
import type { Route } from 'next';
import { cn } from '@/lib/cn';

export type NavSection = 'home' | 'learn' | 'practice' | 'papers' | 'stats';

const LINKS: { section: NavSection; label: string; href: string }[] = [
  { section: 'home', label: 'HOME', href: '/' },
  { section: 'learn', label: 'LEARN', href: '/learn' },
  { section: 'practice', label: 'PRACTICE', href: '/practice' },
  { section: 'papers', label: 'PAPERS', href: '/papers' },
  { section: 'stats', label: 'STATS', href: '/progress' },
];

export function Nav({ active }: { active?: NavSection }) {
  return (
    <header className="flex items-center justify-between border-b border-cyber-pink/80 px-6 py-3">
      <Link
        href="/"
        className="font-display text-2xl tracking-[5px] text-cyber-pink drop-shadow-[0_0_10px_rgba(255,46,156,0.5)]"
      >
        AMC // 10
      </Link>
      <nav className="hidden gap-4 text-[13px] font-semibold tracking-widest sm:flex">
        {LINKS.map((link) => (
          <Link
            key={link.section}
            href={link.href as Route}
            className={cn(
              'px-1 py-0.5 text-cyber-mute hover:text-cyber-cyan',
              active === link.section && 'border-b border-cyber-cyan text-cyber-cyan',
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2 font-mono text-[11px] text-cyber-mute">
        <span className="inline-block h-6 w-6 rounded-full bg-cyber-chip" aria-hidden />
        <span>GUEST</span>
      </div>
    </header>
  );
}
