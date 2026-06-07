'use client';

import { Chip } from '@/components/ui/chip';
import { Panel } from '@/components/ui/panel';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Panel kicker="ERROR_500">
      <h2 className="font-display text-3xl tracking-widest text-cyber-pink">
        SYSTEM CRASHED
      </h2>
      <p className="mt-2 text-sm text-cyber-mute">
        Something broke. Try again or head home.
      </p>
      <div className="mt-4 flex gap-2">
        <button
          onClick={reset}
          className="inline-flex items-center rounded-[2px] bg-cyber-chip px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white"
        >
          RETRY
        </button>
        <Chip href="/" variant="ghost">
          HOME
        </Chip>
      </div>
    </Panel>
  );
}
