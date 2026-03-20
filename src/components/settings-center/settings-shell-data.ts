export type SettingsGroupId = 'basic' | 'workflow' | 'capability' | 'governance';

export type SettingsSectionId =
  | 'general'
  | 'model-provider'
  | 'team-role-strategy'
  | 'channel-advanced'
  | 'automation-defaults'
  | 'memory-knowledge'
  | 'skills-mcp'
  | 'tool-permissions'
  | 'migration-backup'
  | 'feedback-developer';

export type SettingsNavItem = {
  id: SettingsSectionId;
  label: string;
  summary: string;
};

export type SettingsNavGroup = {
  id: SettingsGroupId;
  label: string;
  items: SettingsNavItem[];
};

export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    id: 'basic',
    label: '基础',
    items: [
      { id: 'general', label: '常规设置', summary: '' },
      { id: 'model-provider', label: '模型与 Provider', summary: '' },
    ],
  },
  {
    id: 'workflow',
    label: '工作流',
    items: [
      { id: 'team-role-strategy', label: '团队与角色策略', summary: '' },
      { id: 'channel-advanced', label: '通道高级配置', summary: '' },
      { id: 'automation-defaults', label: '自动化默认策略', summary: '' },
    ],
  },
  {
    id: 'capability',
    label: '能力',
    items: [
      { id: 'memory-knowledge', label: '记忆与知识', summary: '' },
      { id: 'skills-mcp', label: 'Skills 与 MCP', summary: '' },
      { id: 'tool-permissions', label: '工具权限', summary: '' },
    ],
  },
  {
    id: 'governance',
    label: '治理',
    items: [
      { id: 'migration-backup', label: '迁移与备份', summary: '' },
      { id: 'feedback-developer', label: '反馈与开发者', summary: '' },
    ],
  },
];

export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = 'general';

export const SETTINGS_SECTION_META: Record<
  SettingsSectionId,
  { title: string; subtitle: string; kicker: string }
> = {
  general: {
    title: '常规设置',
    subtitle: '管理全局外观、语言以及应用启动行为。',
    kicker: '外观与体验、应用行为',
  },
  'model-provider': {
    title: '模型与服务商',
    subtitle: '配置核心推理引擎，绑定第三方 API Key，并指定全局兜底模型。',
    kicker: 'API Key 配置、大语言模型选择',
  },
  'team-role-strategy': {
    title: '团队架构',
    subtitle: '管理如何自动派生系统子 AI，并给不同类任务指定默认角色处理。',
    kicker: '角色分配、上下文共享边界',
  },
  'channel-advanced': {
    title: '通道高级配置',
    subtitle: '管理飞书、企业微信、Telegram 等多宿主环境的收发言策略。',
    kicker: 'IM 集成、静默规则、消息路由',
  },
  'automation-defaults': {
    title: '自动化默认策略',
    subtitle: '定义 Cron 等无人值守工作流的并发资源池和异常熔断逻辑。',
    kicker: '定时调度限制、错误重试与告警',
  },
  'memory-knowledge': {
    title: 'Memory 记忆与知识库',
    subtitle: '管理长期记忆存储策略、自动浓缩规则和本地知识目录挂载。',
    kicker: '能力',
  },
  'skills-mcp': {
    title: 'Skills 与 MCP 服务',
    subtitle: '管理内部执行器 (Skills) 和外部协议服务 (mcp-servers)。',
    kicker: '能力组件拔插',
  },
  'tool-permissions': {
    title: '工具权限',
    subtitle: '严格规范哪些工具甚至哪个文件夹允许被智能系统修改。',
    kicker: '能力沙箱与拦截黑名单',
  },
  'migration-backup': {
    title: '迁移与备份',
    subtitle: '防止配置迷失、意外损毁并支持在主副工作计算机间的转移。',
    kicker: '配置同步、回滚、系统迁移',
  },
  'feedback-developer': {
    title: '反馈与开发者',
    subtitle: '继续承载更新、Doctor 诊断和开发者模式等真实功能。',
    kicker: '治理',
  },
};
