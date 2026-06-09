import { Panel } from '@/components/ui/panel';
import { Chip } from '@/components/ui/chip';

export const metadata = { title: 'Past Papers — AMC // 10' };

export default function PapersStub() {
  return (
    <Panel kicker="PAPERS // LOCKED">
      <h1 className="font-display text-3xl tracking-widest text-cyber-pink">
        ARCHIVE INCOMING
      </h1>
      <p className="mt-2 text-sm text-cyber-mute">
        Past AMC10 papers with our solutions land after the practice milestone.
        Each paper will include a primary solution and at least one alternate
        method per problem.
      </p>
      <div className="mt-4">
        <Chip href="/learn">BROWSE CONCEPTS</Chip>
      </div>
    </Panel>
  );
}
