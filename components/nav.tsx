'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

export type NavSection = 'home' | 'learn' | 'practice' | 'papers' | 'stats';

const LINKS: { section: NavSection; label: string; href: Route }[] = [
  { section: 'home', label: 'HOME', href: '/' },
  { section: 'learn', label: 'LEARN', href: '/learn' },
  { section: 'practice', label: 'PRACTICE', href: '/practice' },
  { section: 'papers', label: 'PAPERS', href: '/papers' },
  { section: 'stats', label: 'STATS', href: '/progress' },
];

interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

export function Nav({ active }: { active?: NavSection }) {
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let aborted = false;
    fetch('/api/auth/me')
      .then((r) => r.json() as Promise<{ user: User | null }>)
      .then((data) => {
        if (!aborted) {
          setUser(data.user);
          setLoaded(true);
        }
      })
      .catch(() => { if (!aborted) setLoaded(true); });
    return () => {
      aborted = true;
    };
  }, []);

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
            href={link.href}
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
        {!loaded ? (
          <span>…</span>
        ) : user ? (
          <>
            {user.image ? (
              <img src={user.image} alt="" className="h-6 w-6 rounded-full" />
            ) : (
              <span className="inline-block h-6 w-6 rounded-full bg-cyber-chip" />
            )}
            <span>{(user.name ?? user.email).split(' ')[0]?.toUpperCase()}</span>
            <form action="/api/auth/logout" method="post" className="ml-2 inline">
              <button className="text-cyber-mute hover:text-cyber-cyan" type="submit">
                SIGN OUT
              </button>
            </form>
          </>
        ) : (
          <>
            <span className="inline-block h-6 w-6 rounded-full bg-cyber-chip" />
            <Link href="/signin" className="hover:text-cyber-cyan">SIGN IN</Link>
          </>
        )}
      </div>
    </header>
  );
}
