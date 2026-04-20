import { describe, expect, it, vi } from 'vitest';
import { chunkPlainText } from '../../electron/channels/shared/chunker';
import {
  createWeChatOutboundAdapter,
  createWeChatPluginTransport,
  createWeChatRuntimeTransport,
} from '../../electron/channels/wechat/outbound';
import { sendWeChatText, sendWeChatMedia } from '../../electron/channels/wechat/send';

describe('sendWeChatText', () => {
  it('sends short text as a single text call', async () => {
    const transport = {
      sendText: vi.fn(async ({ to, text }) => ({
        channel: 'wechat',
        messageId: `msg:${to}:${text}`,
      })),
    };

    const result = await sendWeChatText({
      cfg: {},
      to: 'wechat:default:test_chat_id',
      text: 'hello',
      transport,
      textChunkLimit: 4000,
    });

    expect(transport.sendText).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      channel: 'wechat',
      messageId: 'msg:wechat:default:test_chat_id:hello',
    });
  });

  it('splits oversized text into multiple sends', async () => {
    const chunksSent: string[] = [];
    const transport = {
      sendText: vi.fn(async ({ text }) => {
        chunksSent.push(text);
        return {
          channel: 'wechat',
          messageId: `chunk:${chunksSent.length}`,
        };
      }),
    };
    const text = `line-1\n${'A'.repeat(4100)}\nline-2`;

    const result = await sendWeChatText({
      cfg: {},
      to: 'wechat:default:test_chat_id',
      text,
      transport,
      textChunkLimit: 4000,
    });

    expect(chunksSent).toEqual(chunkPlainText(text, 4000));
    expect(result).toEqual({
      channel: 'wechat',
      messageId: `chunk:${chunksSent.length}`,
    });
  });
});

describe('sendWeChatMedia', () => {
  it('sends media through the transport with optional caption', async () => {
    const transport = {
      sendMedia: vi.fn(async ({ mediaUrl, text }) => ({
        channel: 'wechat',
        messageId: `media:${mediaUrl}:${text ?? ''}`,
      })),
    };

    const result = await sendWeChatMedia({
      cfg: {},
      to: 'wechat:default:test_chat_id',
      mediaUrl: './voice.ogg',
      text: 'caption',
      transport,
    });

    expect(transport.sendMedia).toHaveBeenCalledWith({
      cfg: {},
      to: 'wechat:default:test_chat_id',
      mediaUrl: './voice.ogg',
      text: 'caption',
    });
    expect(result).toEqual({
      channel: 'wechat',
      messageId: 'media:./voice.ogg:caption',
    });
  });
});

describe('createWeChatRuntimeTransport', () => {
  it('maps runtime chat.send into the transport contract', async () => {
    const sendRuntimeMessage = vi.fn(async ({ sessionKey, message }) => ({
      sessionKey,
      runId: `run:${message}`,
    }));
    const transport = createWeChatRuntimeTransport({ sendRuntimeMessage });

    const result = await transport.sendText?.({
      cfg: {},
      to: 'agent:main:wechat:group:test_chat_id',
      text: 'hello runtime',
    });

    expect(sendRuntimeMessage).toHaveBeenCalledWith({
      sessionKey: 'agent:main:wechat:group:test_chat_id',
      message: 'hello runtime',
    });
    expect(result).toEqual({
      channel: 'wechat',
      messageId: 'run:hello runtime',
      sessionKey: 'agent:main:wechat:group:test_chat_id',
      runId: 'run:hello runtime',
    });
  });
});

describe('createWeChatPluginTransport', () => {
  it('maps plugin sendMessageWeixin into the transport contract', async () => {
    const sendMessageWeixin = vi.fn(async ({ to, text }) => ({
      messageId: `msg:${to}:${text}`,
    }));
    const transport = createWeChatPluginTransport({
      loadConfig: async () => ({ channels: { wechat: {} } }),
      loadPluginModule: async () => ({ sendMessageWeixin }),
    });

    const result = await transport.sendText?.({
      cfg: {},
      to: 'wechat:default:test_chat_id',
      text: 'plugin text',
    });

    expect(sendMessageWeixin).toHaveBeenCalled();
    expect(result).toEqual({
      channel: 'wechat',
      messageId: 'msg:wechat:default:test_chat_id:plugin text',
    });
  });

  it('maps plugin sendWeixinMediaFile into the transport contract', async () => {
    const sendWeixinMediaFile = vi.fn(async ({ filePath }) => ({
      messageId: `media:${filePath}`,
    }));
    const transport = createWeChatPluginTransport({
      loadConfig: async () => ({ channels: { wechat: {} } }),
      loadPluginModule: async () => ({ sendWeixinMediaFile }),
    });

    const result = await transport.sendMedia?.({
      cfg: {},
      to: 'wechat:default:test_chat_id',
      mediaUrl: './image.png',
      text: 'caption',
    });

    expect(sendWeixinMediaFile).toHaveBeenCalled();
    expect(result).toEqual({
      channel: 'wechat',
      messageId: 'media:./image.png',
    });
  });
});

describe('createWeChatOutboundAdapter', () => {
  it('uses plain-text chunking and delegates to helper functions', async () => {
    const transport = {
      sendText: vi.fn(async ({ to, text }) => ({
        channel: 'wechat',
        messageId: `msg:${to}:${text}`,
      })),
    };
    const adapter = createWeChatOutboundAdapter({ transport, textChunkLimit: 4000 });

    const result = await adapter.sendText({
      cfg: {},
      to: 'wechat:default:test_chat_id',
      text: 'hello adapter',
    });

    expect(adapter.chunkerMode).toBe('plain');
    expect(result).toEqual({
      channel: 'wechat',
      messageId: 'msg:wechat:default:test_chat_id:hello adapter',
    });
  });
});
