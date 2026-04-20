import { MessageDeduplicator } from '../shared/dedup';
import type { InboundApi, InboundContext } from '../types';

export interface WeChatInboundPayload {
  text?: string;
  rawText?: string;
  accountId?: string;
  chatId?: string;
  senderId?: string;
  messageId?: string;
  timestamp?: number;
  chatType?: 'direct' | 'group';
  wasMentioned?: boolean;
  agentId?: string;
}

export interface CreateWeChatInboundOptions {
  deduplicator?: MessageDeduplicator;
  dispatchMessage?: (ctx: InboundContext) => Promise<void>;
  checkPolicy?: (ctx: InboundContext) => boolean | Promise<boolean>;
  resolveSessionKey?: (payload: Required<Pick<WeChatInboundPayload, 'accountId' | 'senderId' | 'chatType' | 'agentId'>> & {
    chatId?: string;
  }) => string;
}

function resolveSessionKey(
  payload: Required<Pick<WeChatInboundPayload, 'accountId' | 'senderId' | 'chatType' | 'agentId'>> & { chatId?: string },
): string {
  if (payload.chatType === 'group') {
    return `agent:${payload.agentId}:wechat:group:${payload.chatId ?? payload.senderId}`;
  }
  return `agent:${payload.agentId}:wechat:direct:${payload.accountId}:${payload.senderId}`;
}

function toInboundContext(
  raw: WeChatInboundPayload,
  sessionKeyResolver: CreateWeChatInboundOptions['resolveSessionKey'],
): InboundContext {
  const accountId = raw.accountId ?? 'default';
  const senderId = raw.senderId ?? '';
  const chatType = raw.chatType === 'group' ? 'group' : 'direct';
  const agentId = raw.agentId ?? 'main';
  const sessionKey = (sessionKeyResolver ?? resolveSessionKey)({
    accountId,
    senderId,
    chatType,
    agentId,
    chatId: raw.chatId,
  });

  return {
    body: raw.text ?? '',
    rawBody: raw.rawText ?? raw.text ?? '',
    from: `wechat:${senderId}`,
    to: chatType === 'group' ? `chat:${raw.chatId ?? ''}` : `user:${senderId}`,
    sessionKey,
    accountId,
    chatType,
    senderId,
    provider: 'wechat',
    messageSid: raw.messageId ?? '',
    timestamp: raw.timestamp ?? 0,
    wasMentioned: raw.wasMentioned ?? false,
    originatingChannel: 'wechat',
  };
}

export function createWeChatInbound(options?: CreateWeChatInboundOptions): InboundApi {
  const deduplicator = options?.deduplicator ?? new MessageDeduplicator();

  return {
    parseEvent(raw: unknown): InboundContext | null {
      if (!raw || typeof raw !== 'object') {
        return null;
      }
      return toInboundContext(raw as WeChatInboundPayload, options?.resolveSessionKey);
    },

    buildContext(parsed: unknown): InboundContext {
      return toInboundContext(parsed as WeChatInboundPayload, options?.resolveSessionKey);
    },

    async dispatch(ctx: InboundContext): Promise<void> {
      if (deduplicator.isDuplicate(ctx.messageSid)) {
        return;
      }
      const allowed = await options?.checkPolicy?.(ctx);
      if (allowed === false) {
        return;
      }
      await options?.dispatchMessage?.(ctx);
    },
  };
}
