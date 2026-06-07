import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Nav } from '@/components/nav';

describe('Nav', () => {
  it('renders the brand text', () => {
    render(<Nav active="home" />);
    expect(screen.getByText(/AMC \/\/ 10/i)).toBeInTheDocument();
  });

  it('renders the five primary nav links', () => {
    render(<Nav active="home" />);
    for (const label of ['HOME', 'LEARN', 'PRACTICE', 'PAPERS', 'STATS']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('marks the active link with an underline class', () => {
    render(<Nav active="learn" />);
    const active = screen.getByRole('link', { name: 'LEARN' });
    expect(active.className).toMatch(/border-cyber-cyan/);
  });
});
