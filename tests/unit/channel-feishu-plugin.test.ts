import { describe, expect, it } from 'vitest';
import type { ChannelPlugin } from '../../electron/channels/types';
import { chunkMarkdownText } from '../../electron/channels/shared/chunker';
import {
  FeishuChannelConfigSchema,
  type FeishuChannelConfig,
} from '../../electron/channels/feishu/config';
import { createFeishuChannel, feishuChannel } from '../../electron/channels/feishu/channel';
import { createFeishuRuntimeTransport } from '../../electron/channels/feishu/outbound';
import * as channelsIndex from '../../electron/channels/index';

describe('Feishu channel config schema', () => {
  it('accepts minimal valid config and applies defaults', () => {
    const result = FeishuChannelConfigSchema.safeParse({
      appId: 'cli_test_123',
      appSecret: 'secret_123',
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    const cfg: FeishuChannelConfig = result.data;
    expect(cfg.appId).toBe('cli_test_123');
    expect(cfg.appSecret).toBe('secret_123');
    expect(cfg.accountId).toBe('default');
    expect(cfg.dmPolicy).toBe('open');
    expect(cfg.groupPolicy).toBe('open');
    expect(cfg.requireMention).toBe(true);
    expect(cfg.sendMarkdownAsCard).toBe(false);
    expect(cfg.textChunkLimit).toBe(4000);
    expect(cfg.connectionMode).toBe('websocket');
    expect(cfg.dedupTtlMs).toBe(60_000);
  });
});

describe('Feishu channel plugin shell', () => {
  it('satisfies the ChannelPlugin contract', () => {
    const plugin = feishuChannel satisfies ChannelPlugin;

    expect(plugin.id).toBe('feishu');
    expect(plugin.meta).toEqual({
      id: 'feishu',
      label: 'Feishu',
      provider: 'feishu',
    });
    expect(plugin.capabilities).toEqual({
      chatTypes: ['direct', 'group'],
      media: true,
      reactions: true,
      threads: true,
      edit: true,
      reply: true,
    });
    expect(plugin.outbound.deliveryMode).toBe('direct');
    expect(plugin.outbound.chunkerMode).toBe('markdown');
    expect(plugin.outbound.textChunkLimit).toBe(4000);
    expect(typeof plugin.gateway.startAccount).toBe('function');
    expect(typeof plugin.gateway.stopAccount).toBe('function');
    expect(typeof plugin.gateway.getStatus).toBe('function');
    expect(typeof plugin.inbound.parseEvent).toBe('function');
    expect(typeof plugin.inbound.buildContext).toBe('function');
    expect(typeof plugin.inbound.dispatch).toBe('function');
  });

  it('uses markdown chunking for oversized messages', () => {
    const longMarkdown = `${'# Title\n\n'}${'A'.repeat(4100)}\n\n## Next`;

    const chunks = feishuChannel.outbound.chunker(longMarkdown, 4000);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks).toEqual(chunkMarkdownText(longMarkdown, 4000));
  });

  it('is re-exported from electron/channels/index', () => {
    expect(channelsIndex.feishuChannel).toBe(feishuChannel);
  });

  it('can create a channel with runtime transport-backed outbound sending', async () => {
    const channel = createFeishuChannel({
      outbound: {
        transport: createFeishuRuntimeTransport({
          sendRuntimeMessage: async ({ sessionKey, message }) => ({
            sessionKey,
            runId: `run:${message}`,
          }),
        }),
      },
    });

    const result = await channel.outbound.sendText({
      cfg: {},
      to: 'agent:main:feishu:group:oc_runtime',
      text: 'hello channel factory',
    });

    expect(result).toEqual(expect.objectContaining({
      channel: 'feishu',
      sessionKey: 'agent:main:feishu:group:oc_runtime',
      runId: 'run:hello channel factory',
    }));
  });
});
