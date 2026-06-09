import Link from 'next/link';
import type { Route } from 'next';
import { notFound } from 'next/navigation';
import { Panel } from '@/components/ui/panel';
import { Chip } from '@/components/ui/chip';
import { RenderMdx } from '@/components/mdx/render-mdx';
import { contentIndex } from '@/lib/content';
import { getTopic } from '@/lib/topics';

export function generateStaticParams() {
  return contentIndex.listAllSubtopics().map(({ topic, subtopic }) => ({
    topic,
    subtopic,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string; subtopic: string }>;
}) {
  const { topic, subtopic } = await params;
  const sub = contentIndex.getSubtopic(topic, subtopic);
  const t = getTopic(topic);
  if (!sub || !t) return { title: 'AMC // 10' };
  return { title: `${sub.title} · ${t.name} — AMC // 10` };
}

export default async function SubtopicPage({
  params,
}: {
  params: Promise<{ topic: string; subtopic: string }>;
}) {
  const { topic: topicSlug, subtopic: subSlug } = await params;
  const topicMeta = getTopic(topicSlug);
  const sub = contentIndex.getSubtopic(topicSlug, subSlug);
  if (!topicMeta || !sub) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-cyber-mute">
        <Link href="/learn" className="hover:text-cyber-cyan">
          LEARN
        </Link>
        <span>{'>'}</span>
        <Link
          href={`/learn/${topicSlug}` as Route}
          className="hover:text-cyber-cyan"
          style={{ color: topicMeta.accent }}
        >
          {topicMeta.name.toUpperCase()}
        </Link>
        <span>{'>'}</span>
        <span className="text-cyber-ink">{sub.title.toUpperCase()}</span>
      </div>

      <Panel kicker={`CONCEPT // ${topicMeta.name.toUpperCase()}`}>
        <h1
          className="font-display text-3xl tracking-widest"
          style={{ color: topicMeta.accent }}
        >
          {sub.title.toUpperCase()}
        </h1>
        <p className="mt-2 text-sm text-cyber-mute">{sub.summary}</p>
        <div className="mt-4">
          <Chip href="/practice">PRACTICE THIS SECTION</Chip>
        </div>
      </Panel>

      <RenderMdx source={sub.body} />
    </div>
  );
}
