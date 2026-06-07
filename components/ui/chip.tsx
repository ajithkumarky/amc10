import Link from 'next/link';
import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'filled' | 'ghost';

const base =
  'inline-flex items-center gap-2 rounded-[2px] px-3 py-1 text-[11px] font-bold uppercase tracking-widest';

const variants: Record<Variant, string> = {
  filled: 'bg-cyber-chip text-white',
  ghost: 'border border-cyber-cyan bg-transparent text-cyber-cyan',
};

interface CommonProps {
  variant?: Variant;
  className?: string;
  children: ReactNode;
}

interface AnchorProps extends CommonProps {
  href: string;
}

interface SpanProps extends CommonProps {
  href?: undefined;
}

export type ChipProps = AnchorProps | SpanProps;

export function Chip({ variant = 'filled', className, href, children }: ChipProps) {
  const classes = cn(base, variants[variant], className);
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return <span className={classes}>{children}</span>;
}
