import { ConnectionHealthMonitor, type HealthMonitorOptions } from '../shared/health';
import type { GatewayApi, GatewayStartContext } from '../types';
import { importInstalledFeishuPluginModule, readFeishuOpenClawConfigJson } from './runtime';

interface FeishuGatewayHealthMonitor {
  start: (abortSignal?: AbortSignal) => void;
  stop: () => void;
  reportAlive?: () => void;
  getStatus?: () => 'connected' | 'disconnected';
}

export interface CreateFeishuGatewayOptions {
  monitorAccount?: (ctx: GatewayStartContext) => Promise<void> | void;
  stopMonitor?: (ctx: { accountId: string }) => Promise<void> | void;
  createHealthMonitor?: (options: HealthMonitorOptions) => FeishuGatewayHealthMonitor;
}

type GatewayRecord = {
  controller: AbortController;
  monitor: FeishuGatewayHealthMonitor;
  connected: boolean;
};

export function createFeishuGateway(options?: CreateFeishuGatewayOptions): GatewayApi {
  const accounts = new Map<string, GatewayRecord>();

  const createHealthMonitor = options?.createHealthMonitor
    ?? ((monitorOptions: HealthMonitorOptions) => new ConnectionHealthMonitor(monitorOptions));

  async function startMonitor(ctx: GatewayStartContext): Promise<void> {
    if (options?.monitorAccount) {
      await options.monitorAccount(ctx);
      return;
    }

    const cfg = await readFeishuOpenClawConfigJson();
    if (!cfg) {
      throw new Error('OpenClaw config not found');
    }
    const pluginModule = await importInstalledFeishuPluginModule('index.js');
    const monitorFeishuProvider = pluginModule.monitorFeishuProvider as ((opts?: {
      config: Record<string, unknown>;
      accountId?: string;
      abortSignal?: AbortSignal;
    }) => Promise<void>) | undefined;

    if (!monitorFeishuProvider) {
      throw new Error('Feishu monitor provider is unavailable');
    }

    await monitorFeishuProvider({
      config: cfg,
      accountId: ctx.accountId,
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
            void startMonitor({ accountId: ctx.accountId, abortSignal: controller.signal });
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
      record.connected = true;
      record.monitor.reportAlive?.();
      void startMonitor({ accountId: ctx.accountId, abortSignal: controller.signal }).catch(() => {
        const current = accounts.get(ctx.accountId);
        if (current) {
          current.connected = false;
        }
      });
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
      await options?.stopMonitor?.(ctx);
    },

    getStatus(): { connected: boolean } {
      return {
        connected: [...accounts.values()].some((record) => record.connected),
      };
    },
  };
}
