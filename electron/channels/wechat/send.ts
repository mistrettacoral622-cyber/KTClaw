import { chunkPlainText } from '../shared/chunker';
import type {
  OutboundMediaParams,
  OutboundSendParams,
  SendResult,
} from '../types';
import type { WeChatOutboundTransport } from './outbound';

export interface SendWeChatTextParams extends OutboundSendParams {
  transport: WeChatOutboundTransport;
  textChunkLimit?: number;
}

export interface SendWeChatMediaParams extends OutboundMediaParams {
  transport: WeChatOutboundTransport;
}

function missingTransport(method: string): never {
  throw new Error(`WeChat outbound transport is not configured for ${method}`);
}

export async function sendWeChatText(params: SendWeChatTextParams): Promise<SendResult> {
  const limit = params.textChunkLimit ?? 4000;
  if (!params.transport.sendText) {
    missingTransport('sendText');
  }

  const chunks = chunkPlainText(params.text, limit);
  let lastResult: SendResult | undefined;
  for (const chunk of chunks) {
    lastResult = await params.transport.sendText({
      cfg: params.cfg,
      to: params.to,
      text: chunk,
    });
  }

  return lastResult ?? missingTransport('sendText');
}

export async function sendWeChatMedia(params: SendWeChatMediaParams): Promise<SendResult> {
  if (!params.transport.sendMedia) {
    missingTransport('sendMedia');
  }
  if (!params.mediaUrl) {
    throw new Error('WeChat media payload is required');
  }

  return params.transport.sendMedia({
    cfg: params.cfg,
    to: params.to,
    mediaUrl: params.mediaUrl,
    text: params.text,
  });
}
