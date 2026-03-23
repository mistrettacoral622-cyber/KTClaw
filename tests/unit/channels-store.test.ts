import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChannelsStore } from '@/stores/channels';

const { gatewayRpcMock } = vi.hoisted(() => ({
  gatewayRpcMock: vi.fn(),
}));

vi.mock('@/stores/gateway', () => ({
  useGatewayStore: {
    getState: () => ({
      rpc: gatewayRpcMock,
    }),
  },
}));

vi.mock('@/lib/host-api', () => ({
  hostApiFetch: vi.fn(),
}));

describe('channels store fetchChannels', () => {
  beforeEach(() => {
    gatewayRpcMock.mockReset();
    useChannelsStore.setState({
      channels: [],
      loading: false,
      error: null,
    });
  });

  it('preserves an error state when initial fetch fails', async () => {
    gatewayRpcMock.mockRejectedValueOnce(new Error('gateway unavailable'));

    await useChannelsStore.getState().fetchChannels();

    const state = useChannelsStore.getState();
    expect(state.channels).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.error).toContain('gateway unavailable');
  });
});
