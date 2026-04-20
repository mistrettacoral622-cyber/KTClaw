// Types and interfaces
export type {
  ChannelPlugin,
  ChannelPluginMeta,
  ChannelCapabilities,
  GatewayApi,
  GatewayStartContext,
  InboundApi,
  InboundContext,
  OutboundAdapter,
  OutboundSendParams,
  OutboundMediaParams,
  SendResult,
  BaseChannelConfig,
} from './types';
export { BaseChannelConfigSchema } from './types';

// Registry (exclude _clearForTesting — it's internal)
export {
  registerChannel,
  getChannel,
  listChannels,
  getEnabledChannels,
} from './registry';

// Shared utilities
export { checkDmPolicy, checkGroupPolicy } from './shared/policy';
export type { PolicyCheckResult } from './shared/policy';

export { MessageDeduplicator } from './shared/dedup';

export {
  extractImagesFromText,
  extractFilesFromText,
  isImagePath,
  isHttpUrl,
  normalizeLocalPath,
} from './shared/media';
export type { ExtractedMedia, MediaParseResult, MediaSourceKind } from './shared/media';

export { ConnectionHealthMonitor } from './shared/health';
export type { HealthMonitorOptions } from './shared/health';

export { chunkMarkdownText, chunkPlainText } from './shared/chunker';

// Feishu
export { feishuChannel, FeishuChannelConfigSchema, createFeishuOutboundAdapter } from './feishu';
export type {
  FeishuChannelConfig,
  CreateFeishuOutboundAdapterOptions,
  FeishuOutboundTransport,
} from './feishu';

// WeChat
export {
  wechatChannel,
  WeChatChannelConfigSchema,
  createWeChatChannel,
  createWeChatOutboundAdapter,
  buildWeChatRuntime,
  createWeChatRuntime,
} from './wechat';
export type {
  WeChatChannelConfig,
  CreateWeChatChannelOptions,
  CreateWeChatOutboundAdapterOptions,
  WeChatOutboundTransport,
  BuildWeChatRuntimeOptions,
  WeChatRuntime,
} from './wechat';
