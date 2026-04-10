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
    vi.mocked(hostApiFetch).mockResolvedValue({ ok: true });
  });

  it('renders real controls instead of a placeholder', () => {
    render(<SettingsMemoryStrategy />);

    expect(screen.getByRole('button', { name: '分析' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重建索引' })).toBeInTheDocument();
    expect(screen.getByText('暂未配置监控目录。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+/ })).toBeInTheDocument();
  });

  it('calls memory endpoints and updates watched directories', async () => {
    render(<SettingsMemoryStrategy />);

    fireEvent.click(screen.getByRole('button', { name: '分析' }));
    fireEvent.click(screen.getByRole('button', { name: '重建索引' }));

    await waitFor(() => {
      expect(hostApiFetch).toHaveBeenCalledWith('/api/memory/analyze', { method: 'POST' });
      expect(hostApiFetch).toHaveBeenCalledWith('/api/memory/reindex', { method: 'POST' });
    });

    fireEvent.click(screen.getByRole('button', { name: /\+/ }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'C:\\docs' },
    });
    fireEvent.click(screen.getByRole('button', { name: '添加' }));

    expect(useSettingsStore.getState().watchedMemoryDirs).toEqual(['C:\\docs']);
  });
});
