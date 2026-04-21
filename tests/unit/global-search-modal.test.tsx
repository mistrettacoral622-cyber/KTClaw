import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalSearchModal } from '@/components/search/GlobalSearchModal';

const invokeIpcMock = vi.fn();

vi.mock('@/lib/api-client', () => ({
  invokeIpc: (...args: unknown[]) => invokeIpcMock(...args),
}));

describe('GlobalSearchModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invokeIpcMock.mockResolvedValue({ messages: [] });
  });

  it('finds sessions and selects them with keyboard enter', async () => {
    const onOpenChange = vi.fn();
    const onSelectSession = vi.fn();
    const onNavigate = vi.fn();

    render(
      <GlobalSearchModal
        onOpenChange={onOpenChange}
        sessions={[
          { key: 'session-alpha', label: 'Alpha Session' },
          { key: 'session-beta', label: 'Budget Draft' },
        ]}
        agents={[]}
        onSelectSession={onSelectSession}
        onNavigate={onNavigate}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Search all' });
    fireEvent.change(input, { target: { value: 'budget' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(onSelectSession).toHaveBeenCalledWith('session-beta');
    });
    expect(onNavigate).toHaveBeenCalledWith('/');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('navigates to static page results on click', async () => {
    const onOpenChange = vi.fn();
    const onNavigate = vi.fn();

    render(
      <GlobalSearchModal
        onOpenChange={onOpenChange}
        sessions={[]}
        agents={[]}
        onSelectSession={vi.fn()}
        onNavigate={onNavigate}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Search all' });
    fireEvent.change(input, { target: { value: 'settings' } });

    fireEvent.click((await screen.findByText('Settings')).closest('button') as HTMLButtonElement);

    expect(onNavigate).toHaveBeenCalledWith('/settings');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('routes leader-only agent results to the blocked callback instead of opening the session', async () => {
    const onBlockedAgent = vi.fn();
    const onSelectSession = vi.fn();
    const onNavigate = vi.fn();

    render(
      <GlobalSearchModal
        onOpenChange={vi.fn()}
        sessions={[]}
        agents={[
          {
            id: 'researcher',
            name: 'Research Worker',
            mainSessionKey: 'agent:researcher:main',
            chatAccess: 'leader_only',
            reportsTo: 'main',
          },
        ]}
        onSelectSession={onSelectSession}
        onNavigate={onNavigate}
        onBlockedAgent={onBlockedAgent}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Search all' });
    fireEvent.change(input, { target: { value: 'research' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(onBlockedAgent).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'researcher', chatAccess: 'leader_only' }),
      );
    });
    expect(onSelectSession).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('includes dark-theme aware classes on the search dialog shell', () => {
    render(
      <GlobalSearchModal
        onOpenChange={vi.fn()}
        sessions={[]}
        agents={[]}
        onSelectSession={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Global search' });
    expect(dialog.className).toContain('dark:bg-card');
    expect(dialog.className).toContain('dark:border-white/10');
  });
});
