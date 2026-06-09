'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface AlternateMethodProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function AlternateMethod({ title = 'Alternate method', children, className }: AlternateMethodProps) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        'panel-clip my-3 border border-[#2a1a4a] bg-[rgba(20,8,40,0.45)] px-5 py-3',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between font-mono text-[11px] uppercase tracking-widest text-cyber-amber"
      >
        <span>{`// ${title.toUpperCase()}`}</span>
        <span className="text-cyber-mute">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="mt-3 text-cyber-ink">{children}</div>}
    </div>
  );
}
