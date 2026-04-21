/**
 * Channel Type Definitions
 * Types for the retained messaging channels only.
 */

/**
 * Supported channel types
 */
export type ChannelType =
  | 'dingtalk'
  | 'feishu'
  | 'wecom'
  | 'qqbot'
  | 'wechat';

/**
 * Channel connection status
 */
export type ChannelStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

/**
 * Channel connection type
 */
export type ChannelConnectionType = 'token' | 'qr' | 'oauth' | 'webhook';

/**
 * Channel data structure
 */
export interface Channel {
  id: string;
  type: ChannelType;
  name: string;
  status: ChannelStatus;
  accountId?: string;
  lastActivity?: string;
  error?: string;
  avatar?: string;
  metadata?: Record<string, unknown>;
  // Phase 6: Bot binding fields (one-to-one binding)
  boundAgentId?: string;
  boundTeamId?: string;
  responsiblePerson?: string;
}

/**
 * Channel configuration field definition
 */
export interface ChannelConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select';
  placeholder?: string;
  required?: boolean;
  envVar?: string;
  description?: string;
  options?: { value: string; label: string }[];
}

/**
 * Channel metadata with configuration info
 */
export interface ChannelMeta {
  id: ChannelType;
  name: string;
  icon: string;
  description: string;
  connectionType: ChannelConnectionType;
  docsUrl: string;
  configFields: ChannelConfigField[];
  instructions: string[];
  isPlugin?: boolean;
}

export type ChannelCapabilityAction = 'connect' | 'disconnect' | 'test' | 'send' | 'configure';

export interface ChannelCapabilityFlags {
  supportsConnect: boolean;
  supportsDisconnect: boolean;
  supportsTest: boolean;
  supportsSend: boolean;
  supportsSchemaSummary: boolean;
  supportsCredentialValidation: boolean;
}

export interface ChannelConfigSchemaSummary {
  totalFieldCount: number;
  requiredFieldCount: number;
  optionalFieldCount: number;
  sensitiveFieldCount: number;
  fieldKeys: string[];
}

export interface ChannelRuntimeCapability {
  channelId: string;
  channelType: string;
  accountId?: string;
  status: ChannelStatus;
  availableActions: ChannelCapabilityAction[];
  capabilityFlags: ChannelCapabilityFlags;
  configSchemaSummary: ChannelConfigSchemaSummary;
}

/**
 * Channel icons mapping
 */
export const CHANNEL_ICONS: Record<ChannelType, string> = {
  dingtalk: '💬',
  feishu: '🐦',
  wecom: '💼',
  qqbot: '🐧',
  wechat: '💬',
};

/**
 * Channel display names
 */
export const CHANNEL_NAMES: Record<ChannelType, string> = {
  dingtalk: 'DingTalk',
  feishu: 'Feishu / Lark',
  wecom: 'WeCom',
  qqbot: 'QQ Bot',
  wechat: '微信',
};

/**
 * Channel metadata with configuration information
 */
export const CHANNEL_META: Record<ChannelType, ChannelMeta> = {
  dingtalk: {
    id: 'dingtalk',
    name: 'DingTalk',
    icon: '💬',
    description: 'channels:meta.dingtalk.description',
    connectionType: 'token',
    docsUrl: 'channels:meta.dingtalk.docsUrl',
    configFields: [
      {
        key: 'clientId',
        label: 'channels:meta.dingtalk.fields.clientId.label',
        type: 'text',
        placeholder: 'channels:meta.dingtalk.fields.clientId.placeholder',
        required: true,
      },
      {
        key: 'clientSecret',
        label: 'channels:meta.dingtalk.fields.clientSecret.label',
        type: 'password',
        placeholder: 'channels:meta.dingtalk.fields.clientSecret.placeholder',
        required: true,
      },
      {
        key: 'robotCode',
        label: 'channels:meta.dingtalk.fields.robotCode.label',
        type: 'text',
        placeholder: 'channels:meta.dingtalk.fields.robotCode.placeholder',
        required: false,
      },
      {
        key: 'corpId',
        label: 'channels:meta.dingtalk.fields.corpId.label',
        type: 'text',
        placeholder: 'channels:meta.dingtalk.fields.corpId.placeholder',
        required: false,
      },
      {
        key: 'agentId',
        label: 'channels:meta.dingtalk.fields.agentId.label',
        type: 'text',
        placeholder: 'channels:meta.dingtalk.fields.agentId.placeholder',
        required: false,
      },
    ],
    instructions: [
      'channels:meta.dingtalk.instructions.0',
      'channels:meta.dingtalk.instructions.1',
      'channels:meta.dingtalk.instructions.2',
      'channels:meta.dingtalk.instructions.3',
    ],
    isPlugin: true,
  },
  feishu: {
    id: 'feishu',
    name: 'Feishu / Lark',
    icon: '🐦',
    description: 'channels:meta.feishu.description',
    connectionType: 'token',
    docsUrl: 'channels:meta.feishu.docsUrl',
    configFields: [
      {
        key: 'appId',
        label: 'channels:meta.feishu.fields.appId.label',
        type: 'text',
        placeholder: 'channels:meta.feishu.fields.appId.placeholder',
        required: true,
        envVar: 'FEISHU_APP_ID',
      },
      {
        key: 'appSecret',
        label: 'channels:meta.feishu.fields.appSecret.label',
        type: 'password',
        placeholder: 'channels:meta.feishu.fields.appSecret.placeholder',
        required: true,
        envVar: 'FEISHU_APP_SECRET',
      },
    ],
    instructions: [
      'channels:meta.feishu.instructions.0',
      'channels:meta.feishu.instructions.1',
      'channels:meta.feishu.instructions.2',
      'channels:meta.feishu.instructions.3',
    ],
    isPlugin: true,
  },
  wecom: {
    id: 'wecom',
    name: 'WeCom',
    icon: '💼',
    description: 'channels:meta.wecom.description',
    connectionType: 'token',
    docsUrl: 'channels:meta.wecom.docsUrl',
    configFields: [
      {
        key: 'botId',
        label: 'channels:meta.wecom.fields.botId.label',
        type: 'text',
        placeholder: 'channels:meta.wecom.fields.botId.placeholder',
        required: true,
      },
      {
        key: 'secret',
        label: 'channels:meta.wecom.fields.secret.label',
        type: 'password',
        placeholder: 'channels:meta.wecom.fields.secret.placeholder',
        required: true,
      },
    ],
    instructions: [
      'channels:meta.wecom.instructions.0',
      'channels:meta.wecom.instructions.1',
      'channels:meta.wecom.instructions.2',
    ],
    isPlugin: true,
  },
  qqbot: {
    id: 'qqbot',
    name: 'QQ Bot',
    icon: '🐧',
    description: 'channels:meta.qqbot.description',
    connectionType: 'token',
    docsUrl: 'channels:meta.qqbot.docsUrl',
    configFields: [
      {
        key: 'appId',
        label: 'channels:meta.qqbot.fields.appId.label',
        type: 'text',
        placeholder: 'channels:meta.qqbot.fields.appId.placeholder',
        required: true,
      },
      {
        key: 'clientSecret',
        label: 'channels:meta.qqbot.fields.clientSecret.label',
        type: 'password',
        placeholder: 'channels:meta.qqbot.fields.clientSecret.placeholder',
        required: true,
      },
    ],
    instructions: [
      'channels:meta.qqbot.instructions.0',
      'channels:meta.qqbot.instructions.1',
      'channels:meta.qqbot.instructions.2',
    ],
    isPlugin: true,
  },
  wechat: {
    id: 'wechat',
    name: '微信',
    icon: '💬',
    description: 'channels:meta.wechat.description',
    connectionType: 'qr',
    docsUrl: 'channels:meta.wechat.docsUrl',
    configFields: [],
    instructions: [
      'channels:meta.wechat.instructions.0',
      'channels:meta.wechat.instructions.1',
    ],
    isPlugin: true,
  },
};

/**
 * Channels surfaced in the workbench and channel picker.
 */
export const CHANNEL_WORKBENCH_TYPES: ChannelType[] = ['feishu', 'dingtalk', 'wecom', 'qqbot', 'wechat'];

export function getPrimaryChannels(): ChannelType[] {
  return [...CHANNEL_WORKBENCH_TYPES];
}

/**
 * Get all available channels including plugins
 */
export function getAllChannels(): ChannelType[] {
  return Object.keys(CHANNEL_META) as ChannelType[];
}
