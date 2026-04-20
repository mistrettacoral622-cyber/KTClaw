import type { ChannelPlugin } from '../types';
import { createFeishuGateway } from './gateway';
import { createFeishuInbound } from './bot';
import {
  createFeishuOutboundAdapter,
  createFeishuPluginTransport,
  type CreateFeishuOutboundAdapterOptions,
} from './outbound';
import { importInstalledFeishuPluginModule, readFeishuOpenClawConfigJson } from './runtime';

export interface CreateFeishuChannelOptions {
  outbound?: CreateFeishuOutboundAdapterOptions;
  gateway?: ChannelPlugin['gateway'];
  inbound?: ChannelPlugin['inbound'];
}

export function createFeishuChannel(options?: CreateFeishuChannelOptions): ChannelPlugin {
  const outboundOptions = options?.outbound ?? {
    transport: createFeishuPluginTransport({
      loadConfig: readFeishuOpenClawConfigJson,
      loadPluginModule: () => importInstalledFeishuPluginModule('index.js'),
    }),
  };

  return {
    id: 'feishu',
    meta: {
      id: 'feishu',
      label: 'Feishu',
      provider: 'feishu',
    },
    capabilities: {
      chatTypes: ['direct', 'group'],
      media: true,
      reactions: true,
      threads: true,
      edit: true,
      reply: true,
    },
    outbound: createFeishuOutboundAdapter(outboundOptions),
    gateway: options?.gateway ?? createFeishuGateway(),
    inbound: options?.inbound ?? createFeishuInbound(),
  };
}

export const feishuChannel: ChannelPlugin = createFeishuChannel();
