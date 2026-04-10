import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AgentPanel } from '@/components/team/AgentPanel';
import { useAgentsStore } from '@/stores/agents';
import { useTeamsStore } from '@/stores/teams';
import type { AgentSummary } from '@/types/agent';
import type { TeamSummary } from '@/types/team';

vi.mock('@/stores/agents');
vi.mock('@/stores/teams');
vi.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  }),
}));

const mockAgents: AgentSummary[] = [
  {
    id: 'agent-1',
    name: 'Alice',
    persona: 'Frontend Developer',
    isDefault: false,
    model: 'gpt-4',
    modelDisplay: 'GPT-4',
    inheritedModel: false,
    workspace: '/workspace',
    agentDir: '/agents/alice',
    mainSessionKey: 'session-1',
    channelTypes: [],
    teamRole: 'worker',
    chatAccess: 'direct',
    responsibility: 'Build UI',
    avatar: null,
  },
  {
    id: 'agent-2',
    name: 'Bob',
    persona: 'Backend Developer',
    isDefault: false,
    model: 'gpt-4',
    modelDisplay: 'GPT-4',
    inheritedModel: false,
    workspace: '/workspace',
    agentDir: '/agents/bob',
    mainSessionKey: 'session-2',
    channelTypes: [],
    teamRole: 'worker',
    chatAccess: 'direct',
    responsibility: 'Build API',
    avatar: null,
  },
];

const mockTeams: TeamSummary[] = [
  {
    id: 'team-1',
    name: 'Team Alpha',
    leaderId: 'agent-1',
    memberIds: ['agent-2'],
    description: 'Test team',
    status: 'idle',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    memberCount: 2,
    activeTaskCount: 0,
    lastActiveTime: undefined,
    leaderName: 'Alice',
    memberAvatars: [],
  },
];

describe('AgentPanel', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    onClose.mockReset();
    vi.mocked(useAgentsStore).mockReturnValue({
      agents: mockAgents,
      fetchAgents: vi.fn(),
      loading: false,
      error: null,
    } as never);

    vi.mocked(useTeamsStore).mockReturnValue({
      teams: mockTeams,
    } as never);
  });

  it('renders all agents', () => {
    render(<AgentPanel onClose={onClose} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('displays the joined-team badge for agents already assigned to teams', () => {
    render(<AgentPanel onClose={onClose} />);
    expect(screen.getAllByText(/已加入 1 个团队/)).toHaveLength(2);
  });

  it('shows the drag-and-drop helper copy', () => {
    render(<AgentPanel onClose={onClose} />);
    expect(screen.getByText('拖拽 Agent 到左侧创建区来组建团队')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    render(<AgentPanel onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('fetches agents on mount', () => {
    const fetchAgents = vi.fn();
    vi.mocked(useAgentsStore).mockReturnValue({
      agents: [],
      fetchAgents,
      loading: false,
      error: null,
    } as never);

    render(<AgentPanel onClose={onClose} />);
    expect(fetchAgents).toHaveBeenCalled();
  });
});
