import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ProblemProps {
  children: ReactNode;
  className?: string;
}

export function Problem({ children, className }: ProblemProps) {
  return (
    <div
      className={cn(
        'panel-clip my-4 border border-cyber-purple bg-[rgba(20,8,40,0.7)] px-5 py-4',
        className,
      )}
    >
      <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-cyber-cyan">
        {'// PROBLEM'}
      </div>
      <div className="text-cyber-ink">{children}</div>
    </div>
  );
}
