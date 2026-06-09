import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Panel } from '@/components/ui/panel';
import { RenderMdx } from '@/components/mdx/render-mdx';
import { contentIndex } from '@/lib/content';

export function generateStaticParams() {
  return contentIndex.listPaperKeys().map((k) => {
    const [year, ab] = k.split('-');
    return { year, ab };
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string; ab: string }>;
}) {
  const { year, ab } = await params;
  const meta = contentIndex.getPaperMeta(year, ab);
  return { title: meta ? `${meta.title} — AMC // 10` : 'AMC // 10' };
}

export default async function PaperPage({
  params,
}: {
  params: Promise<{ year: string; ab: string }>;
}) {
  const { year, ab } = await params;
  const meta = contentIndex.getPaperMeta(year, ab);
  if (!meta) notFound();
  const numbers = contentIndex.listPaperProblems(year, ab);
  const problems = numbers
    .map((n) => contentIndex.getPaperProblem(year, ab, n))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-cyber-mute">
        <Link href="/papers" className="hover:text-cyber-cyan">PAPERS</Link>
        <span>{'>'}</span>
        <span className="text-cyber-ink">{meta.title.toUpperCase()}</span>
      </div>

      <Panel kicker={`PAPER // ${meta.title.toUpperCase()}`}>
        <h1 className="font-display text-3xl tracking-widest text-cyber-cyan">
          {meta.title.toUpperCase()}
        </h1>
        {meta.date && (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-cyber-mute">
            {meta.date}
          </p>
        )}
        {meta.source && (
          <p className="mt-2 text-sm">
            <a
              href={meta.source}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyber-cyan hover:underline"
            >
              View the original on AoPS Wiki &uarr;
            </a>
          </p>
        )}
      </Panel>

      <div className="space-y-6">
        {problems.map((p) => (
          <div key={p.problem_number} className="space-y-2">
            <div className="font-mono text-[11px] uppercase tracking-widest text-cyber-cyan">
              {`// PROBLEM ${p.problem_number} · ANSWER: ${p.answer}`}
            </div>
            <RenderMdx source={p.body} />
          </div>
        ))}
      </div>
    </div>
  );
}
