import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SolutionProps {
  children: ReactNode;
  className?: string;
}

export function Solution({ children, className }: SolutionProps) {
  return (
    <div
      className={cn(
        'panel-clip my-4 border border-cyber-cyan bg-[rgba(10,26,42,0.7)] px-5 py-4',
        className,
      )}
    >
      <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-cyber-cyan">
        {'// SOLUTION'}
      </div>
      <div className="text-cyber-ink">{children}</div>
    </div>
  );
}
