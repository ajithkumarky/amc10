import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopicTile } from '@/components/ui/topic-tile';

describe('TopicTile', () => {
  it('renders the topic name in uppercase', () => {
    render(<TopicTile slug="algebra" name="Algebra" progress={72} accent="#ff2e9c" />);
    expect(screen.getByText('ALGEBRA')).toBeInTheDocument();
  });

  it('shows the progress percentage', () => {
    render(<TopicTile slug="algebra" name="Algebra" progress={72} accent="#ff2e9c" />);
    expect(screen.getByText('72%')).toBeInTheDocument();
  });

  it('links to /learn/<slug>', () => {
    render(<TopicTile slug="geometry" name="Geometry" progress={58} accent="#00e5ff" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/learn/geometry');
  });

  it('renders a progress bar with width equal to progress%', () => {
    const { container } = render(
      <TopicTile slug="algebra" name="Algebra" progress={72} accent="#ff2e9c" />,
    );
    const fill = container.querySelector('[data-testid="bar-fill"]') as HTMLElement;
    expect(fill.style.width).toBe('72%');
  });
});
