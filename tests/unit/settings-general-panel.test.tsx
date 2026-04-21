import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsGeneralPanel } from '@/components/settings-center/settings-general-panel';
import { hostApiFetch } from '@/lib/host-api';
import { useSettingsStore } from '@/stores/settings';

vi.mock('@/lib/host-api', () => ({
  hostApiFetch: vi.fn(),
}));

describe('SettingsGeneralPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useSettingsStore.getState().resetSettings();
    vi.mocked(hostApiFetch).mockImplementation(async (path) => {
      if (path === '/api/agents') {
        return {
          agents: [{ id: 'researcher', name: 'Researcher' }],
        };
      }
      return {};
    });
  });

  it('renders the canonical general sections and live controls', async () => {
    render(<SettingsGeneralPanel />);

    expect(screen.getByRole('heading', { name: '账户与安全' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '外观与行为' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '品牌与身份' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '桌面行为' })).toBeInTheDocument();
    expect(screen.getByLabelText('工作台名称')).toBeInTheDocument();
    expect(screen.getByLabelText('品牌副标题')).toBeInTheDocument();
    expect(screen.getByLabelText('我的称呼')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: '系统通知' })).toBeInTheDocument();
    expect(screen.getByTestId('desktop-start-minimized')).toBeInTheDocument();
    expect(screen.getByTestId('desktop-minimize-to-tray')).toBeInTheDocument();
    expect(screen.getByLabelText('上传品牌 Logo')).toBeInTheDocument();
    expect(await screen.findByText('Researcher')).toBeInTheDocument();
  });

  it('updates general settings and persists the live-backed values', async () => {
    render(<SettingsGeneralPanel />);
    await screen.findByText('Researcher');

    fireEvent.click(screen.getByRole('button', { name: '深色模式' }));
    fireEvent.change(screen.getByLabelText('界面语言'), {
      target: { value: 'en' },
    });
    fireEvent.click(screen.getByRole('switch', { name: '开机自启' }));
    fireEvent.click(screen.getByRole('switch', { name: '显示 Tool Calls' }));
    fireEvent.click(screen.getByRole('switch', { name: '系统通知' }));
    fireEvent.click(screen.getByTestId('desktop-start-minimized').querySelector('[role=\"switch\"]') as HTMLElement);
    fireEvent.click(screen.getByTestId('desktop-minimize-to-tray').querySelector('[role=\"switch\"]') as HTMLElement);
    fireEvent.change(screen.getByLabelText('品牌副标题'), {
      target: { value: 'Ops Center' },
    });
    fireEvent.change(screen.getByLabelText('我的称呼'), {
      target: { value: 'Alice' },
    });

    expect(useSettingsStore.getState()).toMatchObject({
      theme: 'dark',
      language: 'en',
      launchAtStartup: true,
      showToolCalls: true,
      notificationsEnabled: false,
      startMinimized: true,
      minimizeToTray: false,
      brandSubtitle: 'Ops Center',
      myName: 'Alice',
    });

    await waitFor(() => {
      expect(hostApiFetch).toHaveBeenCalledWith(
        '/api/settings/language',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ value: 'en' }),
        }),
      );
      expect(hostApiFetch).toHaveBeenCalledWith(
        '/api/settings/launchAtStartup',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ value: true }),
        }),
      );
      expect(hostApiFetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ notificationsEnabled: false }),
        }),
      );
      expect(hostApiFetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ startMinimized: true }),
        }),
      );
      expect(hostApiFetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ minimizeToTray: false }),
        }),
      );
      expect(hostApiFetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ brandSubtitle: 'Ops Center' }),
        }),
      );
      expect(hostApiFetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ myName: 'Alice' }),
        }),
      );
    });
  });

  it('includes dark-theme aware classes for cards and theme buttons', async () => {
    render(<SettingsGeneralPanel />);
    await screen.findByText('Researcher');

    const sections = document.querySelectorAll('section');
    expect(sections[0]?.className).toContain('dark:bg-card');
    expect(sections[0]?.className).toContain('dark:border-border');

    const darkThemeButton = document.querySelector('button[title="深色模式"]') as HTMLButtonElement | null;
    expect(darkThemeButton).not.toBeNull();
    expect(darkThemeButton.className).toContain('dark:border-white/10');
    expect(darkThemeButton.className).toContain('ring-offset-background');
  });
});
