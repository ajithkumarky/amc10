import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface PanelProps {
  kicker?: string;
  title?: string;
  className?: string;
  children: ReactNode;
}

export function Panel({ kicker, title, className, children }: PanelProps) {
  const hasHeader = kicker || title;
  return (
    <div
      className={cn(
        'panel-clip border border-cyber-purple bg-[rgba(20,8,40,0.7)] px-4 py-4 sm:px-5',
        className,
      )}
    >
      {hasHeader && (
        <div className="mb-2">
          {kicker && (
            <div className="font-mono text-[10px] uppercase tracking-widest text-cyber-cyan">
              {`// ${kicker}`}
            </div>
          )}
          {title && (
            <h2 className="mt-1 font-display text-xl tracking-widest text-cyber-ink">
              {title}
            </h2>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
