import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Channels } from '@/pages/Channels';
import { useRightPanelStore } from '@/stores/rightPanelStore';

vi.mock('react-router-dom', () => ({
  useLocation: () => ({
    search: '',
  }),
}));

const { hostApiFetchMock, channelsStoreState, settingsState } = vi.hoisted(() => ({
  hostApiFetchMock: vi.fn(async () => ({ success: true })),
  channelsStoreState: {
    channels: [
      {
        id: 'feishu-default',
        type: 'feishu',
        name: 'feishu',
        status: 'connected',
        accountId: 'default',
      },
    ] as Array<{
      id: string;
      type: 'feishu';
      name: string;
      status: 'connected';
      accountId?: string;
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
    defaultModel: 'GLM-5',
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

vi.mock('@/stores/agents', () => ({
  useAgentsStore: (selector: (state: {
    agents: Array<{ id: string; name: string }>;
    fetchAgents: () => Promise<void>;
  }) => unknown) => selector({
    agents: [{ id: 'main', name: 'Main' }],
    fetchAgents: async () => undefined,
  }),
}));

vi.mock('@/lib/host-events', () => ({
  subscribeHostEvent: () => () => undefined,
}));

describe('channels add dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRightPanelStore.setState({
      open: false,
      type: null,
      agentId: null,
      taskId: null,
      activeChannelId: 'feishu-default',
      pendingBotSettings: null,
      pendingAddChannel: true,
    });
  });

  it('uses a visible solid primary style for the confirm button', async () => {
    render(<Channels />);

    const confirmButton = await screen.findByRole('button', { name: '确认添加' });
    expect(confirmButton).toBeVisible();
    expect(confirmButton.className).toContain('bg-[#0a84ff]');
    expect(confirmButton.className).toContain('text-white');
  });
});
