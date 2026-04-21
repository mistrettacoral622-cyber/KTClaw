import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsMemoryStrategy } from '@/components/settings-center/settings-memory-strategy';
import { useSettingsStore } from '@/stores/settings';
import { hostApiFetch } from '@/lib/host-api';

vi.mock('@/lib/host-api', () => ({
  hostApiFetch: vi.fn(),
}));

describe('SettingsMemoryStrategy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.getState().resetSettings();

    vi.mocked(hostApiFetch).mockImplementation(async (path, init) => {
      if (path === '/api/local-embeddings-runtime/status') {
        return {
          state: 'not_installed',
          version: '3.16.2',
          targetId: 'win32-x64',
          requiredByConfig: true,
        };
      }

      if (path === '/api/local-embeddings-runtime/install' && init?.method === 'POST') {
        return { success: true };
      }

      if (path === '/api/local-embeddings-runtime/remove' && init?.method === 'POST') {
        return { success: true };
      }

      if (path === '/api/memory/analyze' && init?.method === 'POST') {
        return { ok: true };
      }

      if (path === '/api/memory/reindex' && init?.method === 'POST') {
        return { ok: true };
      }

      if (path === '/api/memory/snapshot' && init?.method === 'POST') {
        return { ok: true };
      }

      return { ok: true };
    });
  });

  it('renders runtime status and directory controls', async () => {
    render(<SettingsMemoryStrategy />);

    expect(await screen.findByText('Local Embeddings Runtime')).toBeInTheDocument();
    expect(screen.getByText(/Status:/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Install / Reinstall' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analyze' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reindex' })).toBeInTheDocument();
  });

  it('calls memory analyze and updates watched directories', async () => {
    render(<SettingsMemoryStrategy />);

    fireEvent.click(await screen.findByRole('button', { name: 'Analyze' }));

    await waitFor(() => {
      expect(hostApiFetch).toHaveBeenCalledWith('/api/memory/analyze', { method: 'POST' });
    });

    fireEvent.click(screen.getByRole('button', { name: /\+/ }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'C:\\docs' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(useSettingsStore.getState().watchedMemoryDirs).toEqual(['C:\\docs']);
  });

  it('prompts to install runtime before reindex when local embeddings are required', async () => {
    render(<SettingsMemoryStrategy />);

    fireEvent.click(await screen.findByRole('button', { name: 'Reindex' }));

    expect(await screen.findByText('Install local embeddings runtime?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Download and install' }));

    await waitFor(() => {
      expect(hostApiFetch).toHaveBeenCalledWith('/api/local-embeddings-runtime/install', { method: 'POST' });
    });
  });
});
