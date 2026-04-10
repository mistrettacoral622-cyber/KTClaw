import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GlobalSearchModal } from '@/components/search/GlobalSearchModal';

vi.mock('@/lib/api-client', () => ({
  invokeIpc: vi.fn().mockResolvedValue({ messages: [] }),
}));

describe('GlobalSearchModal team map entry', () => {
  it('routes the static Team Map result to Team Overview instead of the stale /team-map alias', () => {
    const onNavigate = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <GlobalSearchModal
        onOpenChange={onOpenChange}
        sessions={[]}
        agents={[]}
        onSelectSession={vi.fn()}
        onNavigate={onNavigate}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Search all' }), {
      target: { value: 'Team Map' },
    });
    fireEvent.click(screen.getByText('Team Map'));

    expect(onNavigate).toHaveBeenCalledWith('/team-overview');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
