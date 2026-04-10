import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsMigrationPanel } from '@/components/settings-center/settings-migration-panel';
import { hostApiFetch } from '@/lib/host-api';

const invokeMock = vi.fn();

vi.mock('@/lib/host-api', () => ({
  hostApiFetch: vi.fn(),
}));

describe('SettingsMigrationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'electron', {
      value: {
        ipcRenderer: {
          invoke: invokeMock,
          on: vi.fn(),
          once: vi.fn(),
          off: vi.fn(),
        },
        platform: 'win32',
      },
      configurable: true,
      writable: true,
    });
    vi.mocked(hostApiFetch).mockImplementation(async (path) => {
      if (path === '/api/backup/list') return [];
      if (path === '/api/backup/preview') {
        return { settings: { theme: 'dark' }, memory: { 'notes.md': '# note' }, channelMetadata: { channels: [] } };
      }
      if (path === '/api/backup/import') return { success: true, backedUpAs: 'backup.ktclaw' };
      if (path === '/api/backup/create') return { success: true };
      if (path === '/api/backup/export') return { success: true, archivePath: 'C:\\exported.ktclaw' };
      return {};
    });
  });

  it('renders real backup and import actions instead of a placeholder', async () => {
    render(<SettingsMigrationPanel onLaunchWizard={vi.fn()} />);

    expect(screen.getByRole('button', { name: '立即创建备份' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '导出备份' })).toBeInTheDocument();
    expect(screen.getByText('备份历史')).toBeInTheDocument();

    await waitFor(() => {
      expect(hostApiFetch).toHaveBeenCalledWith('/api/backup/list');
    });
  });

  it('exports to the selected path and previews selected modules before restore', async () => {
    invokeMock
      .mockResolvedValueOnce({ canceled: false, filePath: 'C:\\chosen.ktclaw' })
      .mockResolvedValueOnce({ canceled: false, filePaths: ['C:\\incoming.ktclaw'] });

    render(<SettingsMigrationPanel onLaunchWizard={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '导出备份' }));
    await waitFor(() => {
      expect(hostApiFetch).toHaveBeenCalledWith(
        '/api/backup/export',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ targetPath: 'C:\\chosen.ktclaw' }),
        }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: '选择 .ktclaw 导入' }));
    await waitFor(() => {
      expect(hostApiFetch).toHaveBeenCalledWith(
        '/api/backup/preview',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ archivePath: 'C:\\incoming.ktclaw' }),
        }),
      );
    });

    expect(screen.getByText('导入预览')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '恢复所选内容' }));
    await waitFor(() => {
      expect(hostApiFetch).toHaveBeenCalledWith(
        '/api/backup/import',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            archivePath: 'C:\\incoming.ktclaw',
            modules: ['settings', 'memory', 'channelMetadata'],
          }),
        }),
      );
    });
  });
});
