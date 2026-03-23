import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Channels } from '@/pages/Channels';

const {
  hostApiFetchMock,
  channelsStoreState,
  settingsState,
} = vi.hoisted(() => ({
  hostApiFetchMock: vi.fn(),
  channelsStoreState: {
    channels: [] as Array<{
      id: string;
      type: 'feishu' | 'dingtalk' | 'wecom' | 'qqbot';
      name: string;
      status: 'connected' | 'connecting' | 'error' | 'disconnected';
      error?: string;
      accountId?: string;
      lastActivity?: string;
    }>,
    loading: false,
    error: null as string | null,
    fetchChannels: vi.fn(async () => undefined),
    connectChannel: vi.fn(async () => undefined),
    disconnectChannel: vi.fn(async () => undefined),
    deleteChannel: vi.fn(async () => undefined),
    addChannel: vi.fn(async () => ({
      id: 'new',
      type: 'feishu',
      name: 'new',
      status: 'disconnected',
    })),
  },
  settingsState: {
    defaultModel: 'claude-sonnet-4-6',
  },
}));

vi.mock('@/lib/host-api', () => ({
  hostApiFetch: hostApiFetchMock,
}));

vi.mock('@/stores/channels', () => ({
  useChannelsStore: () => channelsStoreState,
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: (selector: (state: typeof settingsState) => unknown) => selector(settingsState),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('Channels page composer UX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    channelsStoreState.channels = [
      {
        id: 'feishu-default',
        type: 'feishu',
        name: 'Dev Feishu',
        status: 'connected',
      },
    ];
    channelsStoreState.loading = false;
    channelsStoreState.error = null;
    settingsState.defaultModel = 'claude-sonnet-4-6';
  });

  it('keeps composer draft when send fails', async () => {
    hostApiFetchMock.mockRejectedValueOnce(new Error('send failed'));

    render(<Channels />);
    fireEvent.click(screen.getByText('Dev Feishu'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'hello from channel' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(hostApiFetchMock).toHaveBeenCalledWith(
        '/api/channels/feishu-default/send',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    expect(input).toHaveValue('hello from channel');
  });

  it('does not send when Enter is pressed during IME composition', () => {
    render(<Channels />);
    fireEvent.click(screen.getByText('Dev Feishu'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '输入法输入中' } });
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229, isComposing: true });

    expect(hostApiFetchMock).not.toHaveBeenCalled();
    expect(input).toHaveValue('输入法输入中');
  });

  it('uses settings default model in the composer model pill', () => {
    settingsState.defaultModel = 'gpt-5.2';

    render(<Channels />);
    fireEvent.click(screen.getByText('Dev Feishu'));

    expect(screen.getByText('gpt-5.2')).toBeInTheDocument();
  });
});
