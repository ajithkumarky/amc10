import { Panel } from '@/components/ui/panel';
import { TopicTile } from '@/components/ui/topic-tile';
import { TOPICS } from '@/lib/topics';

export const metadata = {
  title: 'Learn — AMC // 10',
};

export default function LearnHub() {
  return (
    <div className="space-y-6">
      <Panel kicker="LEARN_HUB">
        <h1 className="font-display text-3xl tracking-widest text-cyber-ink">
          PICK A MISSION
        </h1>
        <p className="mt-2 text-sm text-cyber-mute">
          Each topic has a short concept page and a list of subtopics. Read the
          concept, then jump into Practice when ready.
        </p>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2">
        {TOPICS.map((t) => (
          <TopicTile key={t.slug} slug={t.slug} name={t.name} progress={0} accent={t.accent} />
        ))}
      </div>
    </div>
  );
}
