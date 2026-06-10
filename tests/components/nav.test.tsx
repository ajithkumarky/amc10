import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Nav } from '@/components/nav';

const stubFetchNoUser = () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ user: null }), { status: 200 })),
  );
};

describe('Nav', () => {
  beforeEach(() => {
    stubFetchNoUser();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the brand text', async () => {
    render(<Nav active="home" />);
    expect(screen.getByText(/AMC \/\/ 10/i)).toBeInTheDocument();
    await screen.findByText('SIGN IN');
  });

  it('renders the five primary nav links', async () => {
    render(<Nav active="home" />);
    for (const label of ['HOME', 'LEARN', 'PRACTICE', 'PAPERS', 'STATS']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
    await screen.findByText('SIGN IN');
  });

  it('marks the active link with an underline class', async () => {
    render(<Nav active="learn" />);
    const active = screen.getByRole('link', { name: 'LEARN' });
    expect(active.className).toMatch(/border-cyber-cyan/);
    await screen.findByText('SIGN IN');
  });

  it('shows a sign-in link when not authenticated', async () => {
    render(<Nav active="home" />);
    await screen.findByText('SIGN IN');
  });
});
