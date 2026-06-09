import { notFound } from 'next/navigation';
import { Panel } from '@/components/ui/panel';
import { SubtopicCard } from '@/components/ui/subtopic-card';
import { RenderMdx } from '@/components/mdx/render-mdx';
import { contentIndex } from '@/lib/content';
import { TOPICS, getTopic } from '@/lib/topics';

export function generateStaticParams() {
  return TOPICS.map((t) => ({ topic: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const t = getTopic(topic);
  return {
    title: t ? `${t.name} — AMC // 10` : 'AMC // 10',
  };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic: topicSlug } = await params;
  const topicMeta = getTopic(topicSlug);
  const topicEntry = contentIndex.getTopic(topicSlug);
  if (!topicMeta || !topicEntry) notFound();

  const subSlugs = contentIndex.listSubtopicSlugs(topicSlug);
  const subs = subSlugs
    .map((s) => contentIndex.getSubtopic(topicSlug, s))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  return (
    <div className="space-y-6">
      <Panel kicker={`TOPIC // ${topicMeta.name.toUpperCase()}`}>
        <h1
          className="font-display text-3xl tracking-widest"
          style={{ color: topicMeta.accent }}
        >
          {topicEntry.title.toUpperCase()}
        </h1>
        <p className="mt-2 text-sm text-cyber-mute">{topicEntry.summary}</p>
      </Panel>

      <RenderMdx source={topicEntry.body} />

      <div className="space-y-3">
        <h2 className="font-display text-xl tracking-widest text-cyber-ink">
          SUBTOPICS
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {subs.map((s) => (
            <SubtopicCard
              key={s.slug}
              topic={topicSlug}
              slug={s.slug}
              title={s.title}
              summary={s.summary}
              difficulty={s.difficulty}
              accent={topicMeta.accent}
            />
          ))}
        </div>
        {subs.length === 0 && (
          <p className="text-sm text-cyber-mute">More subtopics coming soon.</p>
        )}
      </div>
    </div>
  );
}
