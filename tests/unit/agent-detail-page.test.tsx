import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AgentDetail } from '@/pages/AgentDetail';

const { agentsStoreState } = vi.hoisted(() => ({
  agentsStoreState: {
    agents: [] as Array<{
      id: string;
      name: string;
      persona: string;
      isDefault: boolean;
      model: string;
      modelDisplay: string;
      inheritedModel: boolean;
      workspace: string;
      agentDir: string;
      mainSessionKey: string;
      channelTypes: string[];
    }>,
    loading: false,
    error: null as string | null,
    fetchAgents: vi.fn(async () => undefined),
  },
}));

vi.mock('@/stores/agents', () => ({
  useAgentsStore: () => agentsStoreState,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, options?: string | { defaultValue?: string; [key: string]: unknown }) => {
      if (typeof options === 'string') return options;
      return options?.defaultValue ?? _key;
    },
  }),
}));

describe('AgentDetail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    agentsStoreState.loading = false;
    agentsStoreState.error = null;
    agentsStoreState.agents = [
      {
        id: 'main',
        name: 'Main',
        persona: 'Primary coordinator',
        isDefault: true,
        model: 'gpt-5.4',
        modelDisplay: 'GPT-5.4',
        inheritedModel: false,
        workspace: '~/.openclaw/workspace',
        agentDir: '~/.openclaw/agents/main',
        mainSessionKey: 'agent:main:main',
        channelTypes: ['feishu'],
      },
      {
        id: 'researcher',
        name: 'Researcher',
        persona: 'Finds supporting evidence',
        isDefault: false,
        model: 'claude-sonnet-4',
        modelDisplay: 'Claude Sonnet 4',
        inheritedModel: true,
        workspace: '~/.openclaw/workspace-researcher',
        agentDir: '~/.openclaw/agents/researcher',
        mainSessionKey: 'agent:researcher:main',
        channelTypes: ['telegram', 'discord'],
      },
    ];
  });

  it('renders read-only metadata and derived hierarchy for an agent', async () => {
    render(
      <MemoryRouter initialEntries={['/agents/researcher']}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(agentsStoreState.fetchAgents).toHaveBeenCalled();
    });

    expect(screen.getByRole('heading', { name: 'Researcher' })).toBeInTheDocument();
    expect(screen.getByText('Finds supporting evidence')).toBeInTheDocument();
    expect(screen.getByText('researcher')).toBeInTheDocument();
    expect(screen.getByText('Claude Sonnet 4')).toBeInTheDocument();
    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('Researcher reports to Main')).toBeInTheDocument();
    expect(screen.getByText('telegram')).toBeInTheDocument();
    expect(screen.getByText('discord')).toBeInTheDocument();
  });

  it('shows a not-found state for unknown agents', async () => {
    render(
      <MemoryRouter initialEntries={['/agents/ghost']}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(agentsStoreState.fetchAgents).toHaveBeenCalled();
    });

    expect(screen.getByRole('heading', { name: 'Agent not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to agents' })).toHaveAttribute('href', '/agents');
  });
});
