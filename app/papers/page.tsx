import Link from 'next/link';
import type { Route } from 'next';
import { Panel } from '@/components/ui/panel';
import { contentIndex } from '@/lib/content';
import { cn } from '@/lib/cn';

export const metadata = { title: 'Past Papers — AMC // 10' };

export default function PapersIndex() {
  const keys = contentIndex.listPaperKeys();
  const papers = keys
    .map((k) => {
      const [year, ab] = k.split('-');
      const meta = contentIndex.getPaperMeta(year, ab);
      const problems = contentIndex.listPaperProblems(year, ab);
      return meta ? { year, ab, meta, count: problems.length } : null;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  return (
    <div className="space-y-6">
      <Panel kicker="PAPERS_ARCHIVE">
        <h1 className="font-display text-3xl tracking-widest text-cyber-ink">PAST PAPERS</h1>
        <p className="mt-2 text-sm text-cyber-mute">
          Real AMC10 papers with our own solutions and (where useful) alternate methods.
        </p>
      </Panel>

      {papers.length === 0 ? (
        <p className="text-sm text-cyber-mute">No papers in the archive yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {papers.map((p) => (
            <Link
              key={`${p.year}-${p.ab}`}
              href={`/papers/${p.year}/${p.ab}` as Route}
              className={cn(
                'block rounded-[4px] border border-[#2a1a4a] bg-[rgba(20,8,40,0.5)] p-4',
                'transition-colors hover:border-cyber-cyan',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-lg tracking-widest text-cyber-ink">
                  {p.meta.title.toUpperCase()}
                </span>
                <span className="font-mono text-[11px] text-cyber-cyan">{p.count} PROBLEMS</span>
              </div>
              {p.meta.date && (
                <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-cyber-mute">
                  {p.meta.date}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
