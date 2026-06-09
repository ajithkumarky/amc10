import { Panel } from '@/components/ui/panel';
import { Chip } from '@/components/ui/chip';

export const metadata = { title: 'Practice — AMC // 10' };

export default function PracticeStub() {
  return (
    <Panel kicker="PRACTICE // LOCKED">
      <h1 className="font-display text-3xl tracking-widest text-cyber-pink">
        SECTOR INCOMING
      </h1>
      <p className="mt-2 text-sm text-cyber-mute">
        Practice missions ship in the next milestone (sign-in + problem drills).
        For now, study the concept pages and bookmark sections you want to drill.
      </p>
      <div className="mt-4">
        <Chip href="/learn">BROWSE CONCEPTS</Chip>
      </div>
    </Panel>
  );
}
