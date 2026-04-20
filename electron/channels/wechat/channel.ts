import type { ChannelPlugin } from '../types';
import { createWeChatRuntime } from './runtime';
import {
  createWeChatOutboundAdapter,
  createWeChatPluginTransport,
  type CreateWeChatOutboundAdapterOptions,
} from './outbound';
import { createWeChatGateway } from './gateway';
import { createWeChatInbound } from './bot';

export interface CreateWeChatChannelOptions {
  runtime?: ReturnType<typeof createWeChatRuntime>;
  outbound?: CreateWeChatOutboundAdapterOptions;
  gateway?: ChannelPlugin['gateway'];
  inbound?: ChannelPlugin['inbound'];
}

export function createWeChatChannel(options?: CreateWeChatChannelOptions): ChannelPlugin {
  const runtime = options?.runtime ?? createWeChatRuntime();
  const outboundOptions = options?.outbound ?? {
    transport: createWeChatPluginTransport({
      loadConfig: runtime.loadConfig,
      loadPluginModule: () => runtime.loadPluginModule('src/channel.js'),
      mediaLocalRoots: runtime.mediaLocalRoots,
    }),
  };

  return {
    id: 'wechat',
    meta: {
      id: 'wechat',
      label: 'WeChat',
      provider: 'wechat',
    },
    capabilities: {
      chatTypes: ['direct', 'group'],
      media: true,
      reactions: false,
      threads: false,
      edit: false,
      reply: true,
    },
    outbound: createWeChatOutboundAdapter(outboundOptions),
    gateway: options?.gateway ?? createWeChatGateway(),
    inbound: options?.inbound ?? createWeChatInbound(),
  };
}

export const wechatChannel: ChannelPlugin = createWeChatChannel();
