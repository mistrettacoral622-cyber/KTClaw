import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AgentActivityTab } from '@/components/agents/detail/AgentActivityTab';

describe('AgentActivityTab', () => {
  it('renders status, next step, current work, and blocking reason', () => {
    render(
      <AgentActivityTab
        statusLabel="Active"
        currentWorkTitles={['Document the API surface']}
        blockingReason="Waiting for owner approval"
        nextStep="Continue writing the interface guide"
      />,
    );

    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Next Step')).toBeInTheDocument();
    expect(screen.getByText('Current Work')).toBeInTheDocument();
    expect(screen.getByText('Document the API surface')).toBeInTheDocument();
    expect(screen.getByText('blocking reason: Waiting for owner approval')).toBeInTheDocument();
    expect(screen.getByText('Continue writing the interface guide')).toBeInTheDocument();
  });

  it('renders empty-state fallback copy when there is no active work or explicit next step', () => {
    render(<AgentActivityTab statusLabel="Idle" currentWorkTitles={[]} />);

    expect(screen.getByText('No active work')).toBeInTheDocument();
    expect(screen.getByText('Open a direct chat to collect the latest update.')).toBeInTheDocument();
  });
});
