'use client';

import katex from 'katex';
import { cn } from '@/lib/cn';

const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;
export type ChoiceLetter = (typeof LETTERS)[number];

// Choices are stored as strings that may contain inline KaTeX math ($...$).
// Render those segments to HTML so the dollar delimiters don't show literally.
function renderChoiceHtml(raw: string): string {
  return raw.replace(/\$([^$]+)\$/g, (_match, math: string) => {
    try {
      return katex.renderToString(math, { throwOnError: false });
    } catch {
      return math;
    }
  });
}

export interface ChoiceRowProps {
  choices: string[];
  selected: ChoiceLetter | null;
  onSelect: (letter: ChoiceLetter) => void;
  revealed?: boolean;
  correctAnswer?: ChoiceLetter;
  className?: string;
}

export function ChoiceRow({
  choices,
  selected,
  onSelect,
  revealed,
  correctAnswer,
  className,
}: ChoiceRowProps) {
  return (
    <div className={cn('mt-4 flex flex-col gap-2', className)}>
      {LETTERS.map((ltr, i) => {
        const isSelected = selected === ltr;
        const isCorrect = revealed && correctAnswer === ltr;
        const isWrong = revealed && isSelected && correctAnswer !== ltr;
        const state = isCorrect ? 'correct' : isWrong ? 'wrong' : isSelected ? 'selected' : 'idle';
        return (
          <button
            key={ltr}
            type="button"
            data-selected={isSelected}
            data-state={state}
            onClick={() => !revealed && onSelect(ltr)}
            className={cn(
              'flex items-center gap-3 rounded-[3px] border bg-[rgba(20,8,40,0.5)] px-4 py-2 text-left transition-colors',
              'disabled:cursor-not-allowed',
              state === 'idle' && 'border-[#2a1a4a] hover:border-cyber-cyan',
              state === 'selected' && 'border-cyber-pink bg-cyber-pink/10',
              state === 'correct' && 'border-cyber-cyan bg-cyber-cyan/10',
              state === 'wrong' && 'border-cyber-pink bg-cyber-pink/20',
            )}
          >
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center border font-display text-sm',
                state === 'idle' && 'border-cyber-purple text-cyber-cyan',
                state === 'selected' && 'border-cyber-pink text-cyber-pink',
                state === 'correct' && 'border-cyber-cyan text-cyber-cyan',
                state === 'wrong' && 'border-cyber-pink text-cyber-pink',
              )}
            >
              {ltr}
            </span>
            <span
              className="font-mono text-sm text-cyber-ink"
              dangerouslySetInnerHTML={{ __html: renderChoiceHtml(choices[i] ?? '') }}
            />
          </button>
        );
      })}
    </div>
  );
}
