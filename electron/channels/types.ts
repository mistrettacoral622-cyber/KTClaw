/**
 * ChannelPlugin type contracts for Phase 14 unified channel architecture.
 *
 * Per D-01, D-03, D-04, D-11 from 14-CONTEXT.md.
 * IMPORTANT: This file must NOT import from ./shared/ or ./registry to avoid circular imports.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Inbound
// ---------------------------------------------------------------------------

/** Standardized inbound message context across all channels (D-03, 13 camelCase fields). */
export interface InboundContext {
  body: string;
  rawBody: string;
  from: string;
  to: string;
  sessionKey: string;
  accountId: string;
  chatType: 'direct' | 'group';
  senderId: string;
  provider: string;
  messageSid: string;
  timestamp: number;
  wasMentioned: boolean;
  originatingChannel: string;
}

// ---------------------------------------------------------------------------
// Outbound
// ---------------------------------------------------------------------------

export interface SendResult {
  channel: string;
  messageId: string;
  chatId?: string;
  conversationId?: string;
  sessionKey?: string;
  runId?: string;
}

export interface OutboundSendParams {
  cfg: unknown;
  to: string;
  text: string;
}

export interface OutboundMediaParams {
  cfg: unknown;
  to: string;
  text?: string;
  mediaUrl?: string;
}

/** Standardized outbound adapter interface (D-04). */
export interface OutboundAdapter {
  deliveryMode: 'direct' | 'buffered';
  textChunkLimit: number;
  chunkerMode: 'markdown' | 'plain';
  chunker: (text: string, limit: number) => string[];
  sendText: (params: OutboundSendParams) => Promise<SendResult>;
  sendMedia: (params: OutboundMediaParams) => Promise<SendResult>;
}

// ---------------------------------------------------------------------------
// Plugin meta and capabilities
// ---------------------------------------------------------------------------

export interface ChannelPluginMeta {
  id: string;
  label: string;
  provider: string;
}

export interface ChannelCapabilities {
  chatTypes: ReadonlyArray<'direct' | 'group'>;
  media: boolean;
  reactions: boolean;
  threads: boolean;
  edit: boolean;
  reply: boolean;
}

// ---------------------------------------------------------------------------
// Gateway
// ---------------------------------------------------------------------------

export interface GatewayStartContext {
  accountId: string;
  abortSignal?: AbortSignal;
}

export interface GatewayApi {
  startAccount: (ctx: GatewayStartContext) => Promise<void>;
  stopAccount: (ctx: { accountId: string }) => Promise<void>;
  getStatus: () => { connected: boolean };
}

// ---------------------------------------------------------------------------
// Inbound API
// ---------------------------------------------------------------------------

export interface InboundApi {
  parseEvent: (raw: unknown) => InboundContext | null;
  buildContext: (parsed: unknown) => InboundContext;
  dispatch: (ctx: InboundContext) => Promise<void>;
}

// ---------------------------------------------------------------------------
// ChannelPlugin — top-level interface (D-01)
// ---------------------------------------------------------------------------

export interface ChannelPlugin {
  id: string;
  meta: ChannelPluginMeta;
  capabilities: ChannelCapabilities;
  outbound: OutboundAdapter;
  gateway: GatewayApi;
  inbound: InboundApi;
}

// ---------------------------------------------------------------------------
// Base config schema (D-11, Zod 3.x)
// ---------------------------------------------------------------------------

export const BaseChannelConfigSchema = z.object({
  enabled: z.boolean().optional().default(true),
  accountId: z.string().optional().default('default'),
  dmPolicy: z.enum(['open', 'pairing', 'allowlist']).optional().default('open'),
  groupPolicy: z.enum(['open', 'allowlist', 'disabled']).optional().default('open'),
  requireMention: z.boolean().optional().default(true),
  allowFrom: z.array(z.string()).optional(),
  groupAllowFrom: z.array(z.string()).optional(),
});

export type BaseChannelConfig = z.infer<typeof BaseChannelConfigSchema>;
