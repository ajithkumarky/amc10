import { Panel } from '@/components/ui/panel';
import { Chip } from '@/components/ui/chip';

export const metadata = { title: 'Progress — AMC // 10' };

export default function ProgressStub() {
  return (
    <Panel kicker="STATS // LOCKED">
      <h1 className="font-display text-3xl tracking-widest text-cyber-pink">
        NO RUN DATA YET
      </h1>
      <p className="mt-2 text-sm text-cyber-mute">
        Progress tracking unlocks when you sign in and complete your first
        practice mission. Coming with the auth milestone.
      </p>
      <div className="mt-4">
        <Chip href="/learn">BROWSE CONCEPTS</Chip>
      </div>
    </Panel>
  );
}
