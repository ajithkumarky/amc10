'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SolutionProps {
  children: ReactNode;
  className?: string;
}

export function Solution({ children, className }: SolutionProps) {
  const [show, setShow] = useState(false);

  return (
    <div
      className={cn(
        'panel-clip my-4 border border-cyber-cyan bg-[rgba(10,26,42,0.7)] px-5 py-4',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-expanded={show}
        className="flex w-full items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-widest text-cyber-cyan transition-colors hover:text-cyber-ink"
      >
        <span>{'// SOLUTION'}</span>
        <span className="text-cyber-amber">{show ? '[ HIDE ]' : '[ TAP TO REVEAL ]'}</span>
      </button>
      {show && <div className="mt-3 text-cyber-ink">{children}</div>}
    </div>
  );
}
