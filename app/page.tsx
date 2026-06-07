import { Chip } from '@/components/ui/chip';
import { Panel } from '@/components/ui/panel';
import { Stat } from '@/components/ui/stat';
import { TopicTile } from '@/components/ui/topic-tile';
import { TOPICS } from '@/lib/topics';

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <Panel kicker="Welcome back">
          <h2 className="font-display text-3xl leading-none tracking-widest text-cyber-ink">
            READY FOR TODAY&rsquo;S RUN?
          </h2>
          <p className="mt-2 text-sm text-cyber-mute">
            Sign in to track progress and start a practice mission.
          </p>
          <div className="mt-4 flex gap-2">
            <Chip href="/learn">START LEARNING</Chip>
            <Chip href="/practice" variant="ghost">
              PRACTICE MIX
            </Chip>
          </div>
        </Panel>
        <Panel className="grid grid-cols-2 gap-3">
          <Stat value="--" label="Day Streak" />
          <Stat value="--" label="Accuracy" accentClass="text-cyber-cyan" />
          <Stat value="--" label="Solved" />
          <Stat value="--" label="Rank" accentClass="text-cyber-amber" />
        </Panel>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {TOPICS.map((t) => (
          <TopicTile key={t.slug} slug={t.slug} name={t.name} progress={0} accent={t.accent} />
        ))}
      </div>
    </div>
  );
}
