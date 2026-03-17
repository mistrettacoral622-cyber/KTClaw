import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Chat } from '@/pages/Chat';

const chatState = {
  messages: [] as Array<Record<string, unknown>>,
  currentSessionKey: 'agent:main:main',
  loading: false,
  sending: false,
  error: null as string | null,
  showThinking: false,
  streamingMessage: null as unknown,
  streamingTools: [] as Array<unknown>,
  pendingFinal: false,
  currentAgentId: 'main',
  sendMessage: vi.fn(),
  abortRun: vi.fn(),
  clearError: vi.fn(),
  cleanupEmptySession: vi.fn(),
};

const gatewayState = {
  status: {
    state: 'running',
    port: 18789,
  },
};

const agentsState = {
  agents: [
    {
      id: 'main',
      name: 'KaiTianClaw',
      isDefault: true,
      modelDisplay: 'GLM-5-Turbo',
      inheritedModel: false,
      workspace: '~/.openclaw/workspace',
      agentDir: '~/.openclaw/agents/main/agent',
      mainSessionKey: 'agent:main:main',
      channelTypes: [],
    },
  ],
  fetchAgents: vi.fn(),
};

vi.mock('@/stores/chat', () => ({
  useChatStore: (selector: (state: typeof chatState) => unknown) => selector(chatState),
}));

vi.mock('@/stores/gateway', () => ({
  useGatewayStore: (selector: (state: typeof gatewayState) => unknown) => selector(gatewayState),
}));

vi.mock('@/stores/agents', () => ({
  useAgentsStore: (selector: (state: typeof agentsState) => unknown) => selector(agentsState),
}));

vi.mock('@/hooks/use-stick-to-bottom-instant', () => ({
  useStickToBottomInstant: () => ({
    contentRef: { current: null },
    scrollRef: { current: null },
  }),
}));

vi.mock('@/hooks/use-min-loading', () => ({
  useMinLoading: () => false,
}));

vi.mock('@/pages/Chat/ChatInput', () => ({
  ChatInput: () => <div data-testid="chat-input">composer</div>,
}));

function translate(key: string, vars?: Record<string, unknown>): string {
  const map: Record<string, string> = {
    'common:workbench.files': '文件',
    'common:workbench.agent': 'Agent',
    'chat:workbench.quickConfig': '快速配置',
    'workbench.quickConfig': '快速配置',
    'chat:workbench.hero.subtitle': '描述你的目标，主分身会协同分身执行并实时反馈',
    'workbench.hero.subtitle': '描述你的目标，主分身会协同分身执行并实时反馈',
    'chat:workbench.quickConfigDescription': '设置当前分身的名称、角色、常用通道、默认技能与常用工具，让它立即进入可工作状态。',
    'workbench.quickConfigDescription': '设置当前分身的名称、角色、常用通道、默认技能与常用工具，让它立即进入可工作状态。',
  };

  if (key === 'chat:toolbar.currentAgent') {
    return `当前工作台：${String(vars?.agent ?? '')}`;
  }

  return map[key] ?? key;
}

vi.mock('react-i18next', () => ({
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
  useTranslation: () => ({
    t: translate,
  }),
}));

describe('Chat workbench shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatState.messages = [];
    chatState.loading = false;
    chatState.sending = false;
    chatState.error = null;
    chatState.showThinking = false;
    gatewayState.status = { state: 'running', port: 18789 };
  });

  it('renders workbench quick actions and onboarding content', () => {
    render(<Chat />);

    expect(screen.getByText('文件')).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(screen.getAllByText('快速配置').length).toBeGreaterThan(1);
    expect(screen.getAllByText('KaiTianClaw').length).toBeGreaterThan(0);
    expect(screen.getByText('描述你的目标，主分身会协同分身执行并实时反馈')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
  });
});
