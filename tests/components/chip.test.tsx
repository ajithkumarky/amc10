import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Chip } from '@/components/ui/chip';

describe('Chip', () => {
  it('renders children as a span with filled gradient by default', () => {
    render(<Chip>Submit</Chip>);
    const el = screen.getByText('Submit');
    expect(el.tagName).toBe('SPAN');
    expect(el.className).toMatch(/bg-cyber-chip/);
  });

  it('renders ghost variant with cyan border', () => {
    render(<Chip variant="ghost">Skip</Chip>);
    expect(screen.getByText('Skip').className).toMatch(/border-cyber-cyan/);
  });

  it('renders as an anchor when href is set', () => {
    render(<Chip href="/learn">Start</Chip>);
    const a = screen.getByRole('link', { name: 'Start' });
    expect(a.getAttribute('href')).toBe('/learn');
  });
});
