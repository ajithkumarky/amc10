import { Chip } from '@/components/ui/chip';
import { Panel } from '@/components/ui/panel';

export default function NotFound() {
  return (
    <Panel kicker="ERROR_404">
      <h2 className="font-display text-3xl tracking-widest text-cyber-pink">
        SIGNAL LOST
      </h2>
      <p className="mt-2 text-sm text-cyber-mute">
        That mission doesn&rsquo;t exist. Return to base.
      </p>
      <div className="mt-4">
        <Chip href="/">BACK TO HOME</Chip>
      </div>
    </Panel>
  );
}
