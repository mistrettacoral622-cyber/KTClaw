import { describe, expect, it, vi } from 'vitest';
import type { ChannelPlugin } from '../../electron/channels/types';
import { chunkPlainText } from '../../electron/channels/shared/chunker';
import {
  WeChatChannelConfigSchema,
  type WeChatChannelConfig,
} from '../../electron/channels/wechat/config';
import {
  buildWeChatRuntime,
  createWeChatRuntime,
} from '../../electron/channels/wechat/runtime';
import { createWeChatChannel, wechatChannel } from '../../electron/channels/wechat/channel';
import * as channelsIndex from '../../electron/channels/index';

describe('WeChat channel config schema', () => {
  it('accepts minimal valid config and applies defaults', () => {
    const result = WeChatChannelConfigSchema.safeParse({
      channelType: 'wechat',
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    const cfg: WeChatChannelConfig = result.data;
    expect(cfg.channelType).toBe('wechat');
    expect(cfg.accountId).toBe('default');
    expect(cfg.dmPolicy).toBe('open');
    expect(cfg.groupPolicy).toBe('open');
    expect(cfg.requireMention).toBe(true);
    expect(cfg.textChunkLimit).toBe(4000);
    expect(cfg.qrPollMs).toBe(2000);
    expect(cfg.qrTtlMs).toBe(300000);
  });
});

describe('WeChat runtime wrappers', () => {
  it('builds a runtime with injected loaders', async () => {
    const loadConfig = vi.fn(async () => ({ channels: { wechat: {} } }));
    const loadPluginModule = vi.fn(async () => ({ plugin: 'ok' }));

    const runtime = buildWeChatRuntime({
      loadConfig,
      loadPluginModule,
    });

    await expect(runtime.loadConfig()).resolves.toEqual({ channels: { wechat: {} } });
    await expect(runtime.loadPluginModule('index.js')).resolves.toEqual({ plugin: 'ok' });
    expect(loadPluginModule).toHaveBeenCalledWith('index.js');
  });

  it('creates the default runtime shape', () => {
    const runtime = createWeChatRuntime();

    expect(typeof runtime.loadConfig).toBe('function');
    expect(typeof runtime.loadPluginModule).toBe('function');
    expect(Array.isArray(runtime.mediaLocalRoots)).toBe(true);
  });
});

describe('WeChat channel plugin shell', () => {
  it('satisfies the ChannelPlugin contract', () => {
    const plugin = wechatChannel satisfies ChannelPlugin;

    expect(plugin.id).toBe('wechat');
    expect(plugin.meta).toEqual({
      id: 'wechat',
      label: 'WeChat',
      provider: 'wechat',
    });
    expect(plugin.capabilities).toEqual({
      chatTypes: ['direct', 'group'],
      media: true,
      reactions: false,
      threads: false,
      edit: false,
      reply: true,
    });
    expect(plugin.outbound.deliveryMode).toBe('direct');
    expect(plugin.outbound.chunkerMode).toBe('plain');
    expect(plugin.outbound.textChunkLimit).toBe(4000);
  });

  it('uses plain-text chunking for oversized messages', () => {
    const longText = `line-1\n${'A'.repeat(4100)}\nline-2`;

    const chunks = wechatChannel.outbound.chunker(longText, 4000);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks).toEqual(chunkPlainText(longText, 4000));
  });

  it('can create a channel with an injected outbound transport', async () => {
    const channel = createWeChatChannel({
      outbound: {
        transport: {
          sendText: async ({ to, text }) => ({
            channel: 'wechat',
            messageId: `msg:${to}:${text}`,
          }),
        },
      },
    });

    const result = await channel.outbound.sendText({
      cfg: {},
      to: 'wechat:default:test_chat_id',
      text: 'hello wechat',
    });

    expect(result).toEqual({
      channel: 'wechat',
      messageId: 'msg:wechat:default:test_chat_id:hello wechat',
    });
  });

  it('is re-exported from electron/channels/index', () => {
    expect(channelsIndex.wechatChannel).toBe(wechatChannel);
  });
});
