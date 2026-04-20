import {
  type OutboundAdapter,
  type OutboundMediaParams,
  type OutboundSendParams,
  type SendResult,
} from '../types';
import { chunkMarkdownText } from '../shared/chunker';
import { sendFeishuMedia, sendFeishuText } from './send';
import { basename } from 'node:path';

export interface FeishuOutboundTransport {
  sendText?: (params: OutboundSendParams) => Promise<SendResult>;
  sendCard?: (params: OutboundSendParams) => Promise<SendResult>;
  sendMedia?: (params: OutboundMediaParams) => Promise<SendResult>;
}

export interface CreateFeishuRuntimeTransportOptions {
  sendRuntimeMessage: (params: { sessionKey: string; message: string }) => Promise<{
    sessionKey: string;
    runId?: string;
  }>;
}

export interface CreateFeishuPluginTransportOptions {
  accountId?: string;
  mediaLocalRoots?: readonly string[];
  loadConfig: () => Promise<Record<string, unknown> | null>;
  loadPluginModule: () => Promise<Record<string, unknown>>;
}

export interface CreateFeishuOutboundAdapterOptions {
  transport?: FeishuOutboundTransport;
  textChunkLimit?: number;
  sendMarkdownAsCard?: boolean;
}

export function createFeishuOutboundAdapter(
  options?: CreateFeishuOutboundAdapterOptions,
): OutboundAdapter {
  const textChunkLimit = options?.textChunkLimit ?? 4000;

  return {
    deliveryMode: 'direct',
    textChunkLimit,
    chunkerMode: 'markdown',
    chunker: (text: string, limit: number) => chunkMarkdownText(text, limit),
    sendText: async (params: OutboundSendParams): Promise<SendResult> => sendFeishuText({
      ...params,
      transport: options?.transport ?? {},
      textChunkLimit,
      sendMarkdownAsCard: options?.sendMarkdownAsCard ?? false,
    }),
    sendMedia: async (params: OutboundMediaParams): Promise<SendResult> => sendFeishuMedia({
      ...params,
      transport: options?.transport ?? {},
    }),
  };
}

export function createFeishuRuntimeTransport(
  options: CreateFeishuRuntimeTransportOptions,
): FeishuOutboundTransport {
  return {
    async sendText(params: OutboundSendParams): Promise<SendResult> {
      const runtimeResult = await options.sendRuntimeMessage({
        sessionKey: params.to,
        message: params.text,
      });

      return {
        channel: 'feishu',
        messageId: runtimeResult.runId ?? '',
        sessionKey: runtimeResult.sessionKey,
        ...(runtimeResult.runId ? { runId: runtimeResult.runId } : {}),
      };
    },
  };
}

export function createFeishuPluginTransport(
  options: CreateFeishuPluginTransportOptions,
): FeishuOutboundTransport {
  return {
    async sendText(params: OutboundSendParams): Promise<SendResult> {
      const cfg = await options.loadConfig();
      if (!cfg) {
        throw new Error('OpenClaw config not found');
      }
      const pluginModule = await options.loadPluginModule();
      const sendMessageFeishu = pluginModule.sendMessageFeishu as ((params: {
        cfg: Record<string, unknown>;
        to: string;
        text: string;
        accountId?: string;
      }) => Promise<{ messageId: string; chatId: string }>) | undefined;

      if (!sendMessageFeishu) {
        throw new Error('Feishu outbound text transport is unavailable');
      }

      const result = await sendMessageFeishu({
        cfg,
        to: params.to,
        text: params.text,
        accountId: options.accountId,
      });

      return {
        channel: 'feishu',
        messageId: result.messageId,
        chatId: result.chatId,
      };
    },

    async sendMedia(params: OutboundMediaParams): Promise<SendResult> {
      const cfg = await options.loadConfig();
      if (!cfg) {
        throw new Error('OpenClaw config not found');
      }
      const pluginModule = await options.loadPluginModule();
      const uploadAndSendMediaLark = pluginModule.uploadAndSendMediaLark as ((params: {
        cfg: Record<string, unknown>;
        to: string;
        mediaUrl?: string;
        fileName?: string;
        accountId?: string;
        mediaLocalRoots?: readonly string[];
      }) => Promise<{ messageId: string; chatId: string }>) | undefined;

      if (!uploadAndSendMediaLark) {
        throw new Error('Feishu outbound media transport is unavailable');
      }

      const result = await uploadAndSendMediaLark({
        cfg,
        to: params.to,
        mediaUrl: params.mediaUrl,
        fileName: params.mediaUrl ? basename(params.mediaUrl) : undefined,
        accountId: options.accountId,
        mediaLocalRoots: options.mediaLocalRoots,
      });

      return {
        channel: 'feishu',
        messageId: result.messageId,
        chatId: result.chatId,
      };
    },
  };
}
