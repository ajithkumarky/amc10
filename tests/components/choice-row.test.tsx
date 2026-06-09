import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChoiceRow } from '@/components/practice/choice-row';

describe('ChoiceRow', () => {
  const choices = ['12', '15', '18', '21', '24'];

  it('renders five A-E buttons with the given labels', () => {
    render(<ChoiceRow choices={choices} selected={null} onSelect={() => {}} />);
    for (const ltr of ['A', 'B', 'C', 'D', 'E']) {
      expect(screen.getByText(ltr)).toBeInTheDocument();
    }
    expect(screen.getByText('18')).toBeInTheDocument();
  });

  it('marks the selected choice', () => {
    render(<ChoiceRow choices={choices} selected="C" onSelect={() => {}} />);
    const button = screen.getByRole('button', { name: /C 18/ });
    expect(button.getAttribute('data-selected')).toBe('true');
  });

  it('calls onSelect when a choice is clicked', () => {
    const handler = vi.fn();
    render(<ChoiceRow choices={choices} selected={null} onSelect={handler} />);
    fireEvent.click(screen.getByRole('button', { name: /B 15/ }));
    expect(handler).toHaveBeenCalledWith('B');
  });

  it('reveals correctness when revealed is true', () => {
    render(<ChoiceRow choices={choices} selected="A" onSelect={() => {}} revealed correctAnswer="C" />);
    expect(screen.getByRole('button', { name: /A 12/ }).getAttribute('data-state')).toBe('wrong');
    expect(screen.getByRole('button', { name: /C 18/ }).getAttribute('data-state')).toBe('correct');
  });
});
