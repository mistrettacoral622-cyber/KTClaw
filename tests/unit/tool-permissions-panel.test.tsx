import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsToolPermissionsPanel } from '@/components/settings-center/settings-tool-permissions-panel';
import { hostApiFetch } from '@/lib/host-api';
import { useSettingsStore } from '@/stores/settings';

vi.mock('@/lib/host-api', () => ({
  hostApiFetch: vi.fn().mockResolvedValue({}),
}));

describe('SettingsToolPermissionsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.getState().resetSettings();
  });

  it('renders the dedicated tool permissions controls instead of a placeholder', () => {
    render(<SettingsToolPermissionsPanel />);

    expect(screen.getByRole('heading', { name: '工具权限' })).toBeInTheDocument();
    expect(screen.getByTestId('global-risk-level-select')).toBeInTheDocument();
    expect(screen.getByTestId('file-acl-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('terminal-acl-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('network-acl-toggle')).toBeInTheDocument();
    expect(screen.queryByTestId('tool-permissions-placeholder')).not.toBeInTheDocument();
  });

  it('persists risk level and action toggles through the settings api', async () => {
    render(<SettingsToolPermissionsPanel />);

    fireEvent.change(screen.getByTestId('global-risk-level-select'), {
      target: { value: 'strict' },
    });
    fireEvent.click(screen.getByTestId('file-acl-toggle'));
    fireEvent.click(screen.getByTestId('terminal-acl-toggle'));
    fireEvent.click(screen.getByTestId('network-acl-toggle'));

    await waitFor(() => {
      expect(hostApiFetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ globalRiskLevel: 'strict' }),
        }),
      );
      expect(hostApiFetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ fileAcl: false }),
        }),
      );
      expect(hostApiFetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ terminalAcl: false }),
        }),
      );
      expect(hostApiFetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ networkAcl: false }),
        }),
      );
    });

    expect(useSettingsStore.getState()).toMatchObject({
      globalRiskLevel: 'strict',
      fileAcl: false,
      terminalAcl: false,
      networkAcl: false,
    });
  });
});
