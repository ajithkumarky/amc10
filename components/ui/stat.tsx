import { cn } from '@/lib/cn';

export interface StatProps {
  value: string | number;
  label: string;
  accentClass?: string;
  className?: string;
}

export function Stat({ value, label, accentClass = 'text-cyber-pink', className }: StatProps) {
  return (
    <div className={cn('text-center', className)}>
      <div className={cn('font-display text-3xl leading-none', accentClass)}>{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-cyber-mute">
        {label}
      </div>
    </div>
  );
}
