import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubtopicCard } from '@/components/ui/subtopic-card';

describe('SubtopicCard', () => {
  it('renders title and summary', () => {
    render(
      <SubtopicCard
        topic="algebra"
        slug="quadratics"
        title="Quadratics"
        summary="Working with quadratic equations."
        accent="#ff2e9c"
      />,
    );
    expect(screen.getByText('QUADRATICS')).toBeInTheDocument();
    expect(screen.getByText(/quadratic equations/i)).toBeInTheDocument();
  });

  it('links to /learn/<topic>/<subtopic>', () => {
    render(
      <SubtopicCard
        topic="algebra"
        slug="quadratics"
        title="Quadratics"
        summary="x"
        accent="#ff2e9c"
      />,
    );
    expect(screen.getByRole('link').getAttribute('href')).toBe('/learn/algebra/quadratics');
  });

  it('shows difficulty as dots when provided', () => {
    const { container } = render(
      <SubtopicCard
        topic="algebra"
        slug="quadratics"
        title="Q"
        summary="x"
        accent="#ff2e9c"
        difficulty={2}
      />,
    );
    const dots = container.querySelectorAll('[data-testid="difficulty-dot"]');
    expect(dots.length).toBe(5);
    const active = container.querySelectorAll('[data-testid="difficulty-dot"][data-active="true"]');
    expect(active.length).toBe(2);
  });
});
