import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Panel } from '@/components/ui/panel';

describe('Panel', () => {
  it('renders children inside a clipped surface', () => {
    render(
      <Panel kicker="MISSION_BRIEF" title="Quadratics">
        <p>Body text</p>
      </Panel>,
    );
    expect(screen.getByText('Body text')).toBeInTheDocument();
    expect(screen.getByText('Quadratics')).toBeInTheDocument();
    expect(screen.getByText('// MISSION_BRIEF')).toBeInTheDocument();
  });

  it('applies the cyber surface and clip-path classes', () => {
    const { container } = render(<Panel>x</Panel>);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/panel-clip/);
    expect(root.className).toMatch(/border-cyber-purple/);
  });

  it('omits the title row when no kicker or title is given', () => {
    render(<Panel>just body</Panel>);
    expect(screen.queryByText(/^\/\//)).not.toBeInTheDocument();
  });
});
