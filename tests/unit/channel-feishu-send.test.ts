import { describe, expect, it, vi } from 'vitest';
import { chunkMarkdownText } from '../../electron/channels/shared/chunker';
import {
  createFeishuOutboundAdapter,
  createFeishuPluginTransport,
  createFeishuRuntimeTransport,
  type FeishuOutboundTransport,
} from '../../electron/channels/feishu/outbound';
import { sendFeishuText, sendFeishuMedia } from '../../electron/channels/feishu/send';

describe('sendFeishuText', () => {
  it('sends short text as a single text call', async () => {
    const transport: FeishuOutboundTransport = {
      sendText: vi.fn(async ({ to, text }) => ({
        channel: 'feishu',
        messageId: `msg:${to}:${text}`,
      })),
    };

    const result = await sendFeishuText({
      cfg: {},
      to: 'chat:oc_short',
      text: 'hello',
      transport,
      textChunkLimit: 4000,
      sendMarkdownAsCard: false,
    });

    expect(transport.sendText).toHaveBeenCalledTimes(1);
    expect(transport.sendText).toHaveBeenCalledWith({
      cfg: {},
      to: 'chat:oc_short',
      text: 'hello',
    });
    expect(result).toEqual({
      channel: 'feishu',
      messageId: 'msg:chat:oc_short:hello',
    });
  });

  it('splits oversized markdown into multiple text sends', async () => {
    const chunksSent: string[] = [];
    const transport: FeishuOutboundTransport = {
      sendText: vi.fn(async ({ text }) => {
        chunksSent.push(text);
        return {
          channel: 'feishu',
          messageId: `chunk:${chunksSent.length}`,
        };
      }),
    };
    const text = `${'# Title\n\n'}${'A'.repeat(4100)}\n\n## Next`;

    const result = await sendFeishuText({
      cfg: {},
      to: 'chat:oc_long',
      text,
      transport,
      textChunkLimit: 4000,
      sendMarkdownAsCard: false,
    });

    expect(chunksSent).toEqual(chunkMarkdownText(text, 4000));
    expect(chunksSent.length).toBeGreaterThan(1);
    expect(result).toEqual({
      channel: 'feishu',
      messageId: `chunk:${chunksSent.length}`,
    });
  });

  it('uses card sending when markdown-card mode is enabled', async () => {
    const transport: FeishuOutboundTransport = {
      sendText: vi.fn(),
      sendCard: vi.fn(async ({ to, text }) => ({
        channel: 'feishu',
        messageId: `card:${to}:${text.length}`,
      })),
    };

    const result = await sendFeishuText({
      cfg: {},
      to: 'chat:oc_card',
      text: '## Card body',
      transport,
      textChunkLimit: 4000,
      sendMarkdownAsCard: true,
    });

    expect(transport.sendCard).toHaveBeenCalledTimes(1);
    expect(transport.sendText).not.toHaveBeenCalled();
    expect(result).toEqual({
      channel: 'feishu',
      messageId: 'card:chat:oc_card:12',
    });
  });
});

describe('sendFeishuMedia', () => {
  it('extracts media references from text and sends them with the remaining caption', async () => {
    const transport: FeishuOutboundTransport = {
      sendMedia: vi.fn(async ({ to, mediaUrl, text }) => ({
        channel: 'feishu',
        messageId: `media:${to}:${mediaUrl}:${text ?? ''}`,
      })),
    };

    const result = await sendFeishuMedia({
      cfg: {},
      to: 'chat:oc_media',
      text: 'See attachment\n\n![diagram](./diagram.png)',
      transport,
    });

    expect(transport.sendMedia).toHaveBeenCalledTimes(1);
    expect(transport.sendMedia).toHaveBeenCalledWith({
      cfg: {},
      to: 'chat:oc_media',
      mediaUrl: './diagram.png',
      text: 'See attachment',
    });
    expect(result).toEqual({
      channel: 'feishu',
      messageId: 'media:chat:oc_media:./diagram.png:See attachment',
    });
  });

  it('adapter sendMedia prefers explicit mediaUrl over extracted text media', async () => {
    const transport: FeishuOutboundTransport = {
      sendMedia: vi.fn(async ({ mediaUrl, text }) => ({
        channel: 'feishu',
        messageId: `explicit:${mediaUrl}:${text ?? ''}`,
      })),
    };
    const adapter = createFeishuOutboundAdapter({
      transport,
      sendMarkdownAsCard: false,
      textChunkLimit: 4000,
    });

    const result = await adapter.sendMedia({
      cfg: {},
      to: 'chat:oc_explicit',
      mediaUrl: 'https://example.test/file.png',
      text: 'caption',
    });

    expect(transport.sendMedia).toHaveBeenCalledWith({
      cfg: {},
      to: 'chat:oc_explicit',
      mediaUrl: 'https://example.test/file.png',
      text: 'caption',
    });
    expect(result).toEqual({
      channel: 'feishu',
      messageId: 'explicit:https://example.test/file.png:caption',
    });
  });
});

describe('createFeishuRuntimeTransport', () => {
  it('maps runtime chat.send into a transport result with sessionKey and runId', async () => {
    const sendRuntimeMessage = vi.fn(async ({ sessionKey, message }) => ({
      sessionKey,
      runId: `run:${message}`,
    }));
    const transport = createFeishuRuntimeTransport({ sendRuntimeMessage });

    const result = await transport.sendText?.({
      cfg: {},
      to: 'agent:main:feishu:group:oc_runtime',
      text: 'hello runtime',
    });

    expect(sendRuntimeMessage).toHaveBeenCalledWith({
      sessionKey: 'agent:main:feishu:group:oc_runtime',
      message: 'hello runtime',
    });
    expect(result).toEqual({
      channel: 'feishu',
      messageId: 'run:hello runtime',
      sessionKey: 'agent:main:feishu:group:oc_runtime',
      runId: 'run:hello runtime',
    });
  });
});

describe('createFeishuPluginTransport', () => {
  it('maps plugin sendMessageFeishu into the transport contract', async () => {
    const sendMessageFeishu = vi.fn(async ({ to, text, accountId }) => ({
      messageId: `msg:${to}:${text}:${accountId}`,
      chatId: 'oc_chat_1',
    }));
    const transport = createFeishuPluginTransport({
      accountId: 'default',
      loadConfig: async () => ({ channels: { feishu: {} } }),
      loadPluginModule: async () => ({ sendMessageFeishu }),
    });

    const result = await transport.sendText?.({
      cfg: {},
      to: 'chat:oc_plugin',
      text: 'plugin text',
    });

    expect(sendMessageFeishu).toHaveBeenCalledWith({
      cfg: { channels: { feishu: {} } },
      to: 'chat:oc_plugin',
      text: 'plugin text',
      accountId: 'default',
    });
    expect(result).toEqual({
      channel: 'feishu',
      messageId: 'msg:chat:oc_plugin:plugin text:default',
      chatId: 'oc_chat_1',
    });
  });

  it('maps plugin uploadAndSendMediaLark into the transport contract', async () => {
    const uploadAndSendMediaLark = vi.fn(async ({ mediaUrl, accountId }) => ({
      messageId: `media:${mediaUrl}:${accountId}`,
      chatId: 'oc_media_1',
    }));
    const transport = createFeishuPluginTransport({
      accountId: 'default',
      mediaLocalRoots: ['C:/workspace'],
      loadConfig: async () => ({ channels: { feishu: {} } }),
      loadPluginModule: async () => ({ uploadAndSendMediaLark }),
    });

    const result = await transport.sendMedia?.({
      cfg: {},
      to: 'chat:oc_media',
      mediaUrl: './diagram.png',
      text: 'caption',
    });

    expect(uploadAndSendMediaLark).toHaveBeenCalledWith(expect.objectContaining({
      cfg: { channels: { feishu: {} } },
      to: 'chat:oc_media',
      mediaUrl: './diagram.png',
      fileName: 'diagram.png',
      accountId: 'default',
      mediaLocalRoots: ['C:/workspace'],
    }));
    expect(result).toEqual({
      channel: 'feishu',
      messageId: 'media:./diagram.png:default',
      chatId: 'oc_media_1',
    });
  });
});
