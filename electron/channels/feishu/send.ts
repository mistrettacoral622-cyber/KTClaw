import { chunkMarkdownText } from '../shared/chunker';
import { extractFilesFromText, extractImagesFromText } from '../shared/media';
import type {
  OutboundMediaParams,
  OutboundSendParams,
  SendResult,
} from '../types';
import type { FeishuOutboundTransport } from './outbound';

export interface SendFeishuTextParams extends OutboundSendParams {
  transport: FeishuOutboundTransport;
  textChunkLimit?: number;
  sendMarkdownAsCard?: boolean;
}

export interface SendFeishuMediaParams extends OutboundMediaParams {
  transport: FeishuOutboundTransport;
}

function missingTransport(method: string): never {
  throw new Error(`Feishu outbound transport is not configured for ${method}`);
}

export async function sendFeishuText(params: SendFeishuTextParams): Promise<SendResult> {
  const limit = params.textChunkLimit ?? 4000;

  if (params.sendMarkdownAsCard) {
    if (!params.transport.sendCard) {
      missingTransport('sendCard');
    }
    return params.transport.sendCard({
      cfg: params.cfg,
      to: params.to,
      text: params.text,
    });
  }

  if (!params.transport.sendText) {
    missingTransport('sendText');
  }

  const chunks = chunkMarkdownText(params.text, limit);
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

export async function sendFeishuMedia(params: SendFeishuMediaParams): Promise<SendResult> {
  if (!params.transport.sendMedia) {
    missingTransport('sendMedia');
  }

  if (params.mediaUrl) {
    return params.transport.sendMedia({
      cfg: params.cfg,
      to: params.to,
      mediaUrl: params.mediaUrl,
      text: params.text,
    });
  }

  const imageParse = extractImagesFromText(params.text ?? '');
  const fileParse = extractFilesFromText(imageParse.text);
  const attachments = [...imageParse.images, ...fileParse.files];
  const caption = fileParse.text.trim() || undefined;

  if (attachments.length === 0) {
    throw new Error('No Feishu media payload found');
  }

  let lastResult: SendResult | undefined;
  for (const [index, attachment] of attachments.entries()) {
    lastResult = await params.transport.sendMedia({
      cfg: params.cfg,
      to: params.to,
      mediaUrl: attachment.source,
      text: index === 0 ? caption : undefined,
    });
  }

  return lastResult ?? missingTransport('sendMedia');
}
