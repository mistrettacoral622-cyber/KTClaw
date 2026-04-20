import { ConnectionHealthMonitor, type HealthMonitorOptions } from '../shared/health';
import type { GatewayApi, GatewayStartContext } from '../types';
import { createWeChatRuntime } from './runtime';

interface WeChatGatewayHealthMonitor {
  start: (abortSignal?: AbortSignal) => void;
  stop: () => void;
  reportAlive?: () => void;
  getStatus?: () => 'connected' | 'disconnected';
}

export interface CreateWeChatGatewayOptions {
  startAccountLifecycle?: (ctx: GatewayStartContext) => Promise<void> | void;
  stopAccountLifecycle?: (ctx: { accountId: string }) => Promise<void> | void;
  createHealthMonitor?: (options: HealthMonitorOptions) => WeChatGatewayHealthMonitor;
}

type GatewayRecord = {
  controller: AbortController;
  monitor: WeChatGatewayHealthMonitor;
  connected: boolean;
};

export function createWeChatGateway(options?: CreateWeChatGatewayOptions): GatewayApi {
  const accounts = new Map<string, GatewayRecord>();
  const createHealthMonitor = options?.createHealthMonitor
    ?? ((monitorOptions: HealthMonitorOptions) => new ConnectionHealthMonitor(monitorOptions));

  async function startLifecycle(ctx: GatewayStartContext): Promise<void> {
    if (options?.startAccountLifecycle) {
      await options.startAccountLifecycle(ctx);
      return;
    }

    const runtime = createWeChatRuntime();
    const cfg = await runtime.loadConfig();
    if (!cfg) {
      throw new Error('OpenClaw config not found');
    }
    const pluginModule = await runtime.loadPluginModule('src/monitor/monitor.js');
    const monitorWeixinProvider = pluginModule.monitorWeixinProvider as ((opts: {
      accountId: string;
      config: Record<string, unknown>;
      abortSignal?: AbortSignal;
      baseUrl?: string;
      cdnBaseUrl?: string;
      token?: string;
    }) => Promise<void>) | undefined;

    if (!monitorWeixinProvider) {
      throw new Error('WeChat monitor provider is unavailable');
    }

    await monitorWeixinProvider({
      accountId: ctx.accountId,
      config: cfg,
      abortSignal: ctx.abortSignal,
    });
  }

  return {
    async startAccount(ctx: GatewayStartContext): Promise<void> {
      const existing = accounts.get(ctx.accountId);
      if (existing) {
        existing.connected = true;
        existing.monitor.reportAlive?.();
        return;
      }

      const controller = new AbortController();
      const record: GatewayRecord = {
        controller,
        connected: false,
        monitor: createHealthMonitor({
          onReconnect: () => {
            void startLifecycle({ accountId: ctx.accountId, abortSignal: controller.signal });
          },
          onStatusChange: (status) => {
            const current = accounts.get(ctx.accountId);
            if (current) {
              current.connected = status === 'connected';
            }
          },
        }),
      };

      accounts.set(ctx.accountId, record);
      record.monitor.start(controller.signal);
      await startLifecycle({ accountId: ctx.accountId, abortSignal: controller.signal });
      record.connected = true;
      record.monitor.reportAlive?.();
    },

    async stopAccount(ctx: { accountId: string }): Promise<void> {
      const record = accounts.get(ctx.accountId);
      if (!record) {
        return;
      }

      record.controller.abort();
      record.monitor.stop();
      record.connected = false;
      accounts.delete(ctx.accountId);
      await options?.stopAccountLifecycle?.(ctx);
    },

    getStatus(): { connected: boolean } {
      return {
        connected: [...accounts.values()].some((record) => record.connected),
      };
    },
  };
}
