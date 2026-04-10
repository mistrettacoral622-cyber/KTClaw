import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from '@/components/common/StatusBadge';

describe('StatusBadge', () => {
  it('renders the default label for a status and includes the colored dot by default', () => {
    const { container } = render(<StatusBadge status="connected" />);

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(container.querySelector('.bg-green-600')).toBeInTheDocument();
  });

  it('renders a custom label and hides the dot when requested', () => {
    const { container } = render(
      <StatusBadge status="error" label="Manual override" showDot={false} />,
    );

    expect(screen.getByText('Manual override')).toBeInTheDocument();
    expect(container.querySelector('.bg-red-600')).not.toBeInTheDocument();
  });

  it('uses the warning pulse styling for transient states', () => {
    const { container } = render(<StatusBadge status="connecting" />);

    expect(screen.getByText('Connecting')).toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});
