import { describe, expect, it } from 'vitest';
import { createFeishuGateway } from '../../electron/channels/feishu/gateway';
import type { HealthMonitorOptions } from '../../electron/channels/shared/health';

describe('createFeishuGateway', () => {
  it('starts and stops a single account monitor and reports connection state', async () => {
    const started: string[] = [];
    const stopped: string[] = [];

    const gateway = createFeishuGateway({
      monitorAccount: async ({ accountId }) => {
        started.push(accountId);
      },
      stopMonitor: async ({ accountId }) => {
        stopped.push(accountId);
      },
    });

    expect(gateway.getStatus()).toEqual({ connected: false });

    await gateway.startAccount({ accountId: 'default' });
    expect(started).toEqual(['default']);
    expect(gateway.getStatus()).toEqual({ connected: true });

    await gateway.stopAccount({ accountId: 'default' });
    expect(stopped).toEqual(['default']);
    expect(gateway.getStatus()).toEqual({ connected: false });
  });

  it('wires the health monitor reconnect callback to restart the account monitor', async () => {
    const started: string[] = [];
    let onReconnect: ((reason: string) => void) | undefined;

    const gateway = createFeishuGateway({
      monitorAccount: async ({ accountId }) => {
        started.push(accountId);
      },
      createHealthMonitor: (options: HealthMonitorOptions) => {
        onReconnect = options.onReconnect;
        return {
          start: () => {
            options.onStatusChange?.('connected');
          },
          stop: () => {},
          reportAlive: () => {},
          getStatus: () => 'connected',
        };
      },
    });

    await gateway.startAccount({ accountId: 'default' });
    onReconnect?.('stale connection');

    expect(started).toEqual(['default', 'default']);
  });
});
