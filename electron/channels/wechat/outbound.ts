import {
  type OutboundAdapter,
  type OutboundMediaParams,
  type OutboundSendParams,
  type SendResult,
} from '../types';
import { chunkPlainText } from '../shared/chunker';
import { basename } from 'node:path';
import { sendWeChatMedia, sendWeChatText } from './send';

export interface WeChatOutboundTransport {
  sendText?: (params: OutboundSendParams) => Promise<SendResult>;
  sendMedia?: (params: OutboundMediaParams) => Promise<SendResult>;
}

export interface CreateWeChatRuntimeTransportOptions {
  sendRuntimeMessage: (params: { sessionKey: string; message: string }) => Promise<{
    sessionKey: string;
    runId?: string;
  }>;
}

export interface CreateWeChatPluginTransportOptions {
  loadConfig: () => Promise<Record<string, unknown> | null>;
  loadPluginModule: () => Promise<Record<string, unknown>>;
  mediaLocalRoots?: readonly string[];
}

export interface CreateWeChatOutboundAdapterOptions {
  transport?: WeChatOutboundTransport;
  textChunkLimit?: number;
}

function missingTransport(method: string): never {
  throw new Error(`WeChat outbound transport is not configured for ${method}`);
}

export function createWeChatOutboundAdapter(
  options?: CreateWeChatOutboundAdapterOptions,
): OutboundAdapter {
  const textChunkLimit = options?.textChunkLimit ?? 4000;

  return {
    deliveryMode: 'direct',
    textChunkLimit,
    chunkerMode: 'plain',
    chunker: (text: string, limit: number) => chunkPlainText(text, limit),
    sendText: async (params: OutboundSendParams): Promise<SendResult> => sendWeChatText({
      ...params,
      transport: options?.transport ?? {},
      textChunkLimit,
    }),
    sendMedia: async (params: OutboundMediaParams): Promise<SendResult> => sendWeChatMedia({
      ...params,
      transport: options?.transport ?? {},
    }),
  };
}

export function createWeChatRuntimeTransport(
  options: CreateWeChatRuntimeTransportOptions,
): WeChatOutboundTransport {
  return {
    async sendText(params: OutboundSendParams): Promise<SendResult> {
      const runtimeResult = await options.sendRuntimeMessage({
        sessionKey: params.to,
        message: params.text,
      });

      return {
        channel: 'wechat',
        messageId: runtimeResult.runId ?? '',
        sessionKey: runtimeResult.sessionKey,
        ...(runtimeResult.runId ? { runId: runtimeResult.runId } : {}),
      };
    },
  };
}

export function createWeChatPluginTransport(
  options: CreateWeChatPluginTransportOptions,
): WeChatOutboundTransport {
  return {
    async sendText(params: OutboundSendParams): Promise<SendResult> {
      const cfg = await options.loadConfig();
      if (!cfg) {
        throw new Error('OpenClaw config not found');
      }
      const pluginModule = await options.loadPluginModule();
      const sendMessageWeixin = pluginModule.sendMessageWeixin as ((params: {
        to: string;
        text: string;
        opts?: Record<string, unknown>;
      }) => Promise<{ messageId: string }>) | undefined;

      if (!sendMessageWeixin) {
        throw new Error('WeChat outbound text transport is unavailable');
      }

      const result = await sendMessageWeixin({
        to: params.to,
        text: params.text,
        opts: { cfg },
      });

      return {
        channel: 'wechat',
        messageId: result.messageId,
      };
    },

    async sendMedia(params: OutboundMediaParams): Promise<SendResult> {
      const cfg = await options.loadConfig();
      if (!cfg) {
        throw new Error('OpenClaw config not found');
      }
      const pluginModule = await options.loadPluginModule();
      const sendWeixinMediaFile = pluginModule.sendWeixinMediaFile as ((params: {
        to: string;
        text?: string;
        filePath: string;
        fileName?: string;
        opts?: Record<string, unknown>;
      }) => Promise<{ messageId: string }>) | undefined;

      if (!sendWeixinMediaFile) {
        throw new Error('WeChat outbound media transport is unavailable');
      }

      const result = await sendWeixinMediaFile({
        to: params.to,
        text: params.text,
        filePath: params.mediaUrl ?? '',
        fileName: params.mediaUrl ? basename(params.mediaUrl) : undefined,
        opts: { cfg, mediaLocalRoots: options.mediaLocalRoots },
      });

      return {
        channel: 'wechat',
        messageId: result.messageId,
      };
    },
  };
}
