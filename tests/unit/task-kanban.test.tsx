import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskKanban } from '@/pages/TaskKanban';

const {
  agentsStoreState,
  approvalsStoreState,
  rightPanelStoreState,
  searchParamsState,
  setSearchParamsMock,
} = vi.hoisted(() => ({
  agentsStoreState: {
    agents: [] as Array<{ id: string; name: string; teamRole?: 'leader' | 'worker' }>,
    fetchAgents: vi.fn(async () => undefined),
  },
  approvalsStoreState: {
    tasks: [] as Array<Record<string, unknown>>,
    fetchTasks: vi.fn(async () => undefined),
    createTask: vi.fn(async () => undefined),
  },
  rightPanelStoreState: {
    openPanel: vi.fn(),
  },
  searchParamsState: {
    current: new URLSearchParams('view=board'),
  },
  setSearchParamsMock: vi.fn((next: URLSearchParams) => {
    searchParamsState.current = next;
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [searchParamsState.current, setSearchParamsMock],
  };
});

vi.mock('@/stores/agents', () => ({
  useAgentsStore: (selector: (state: typeof agentsStoreState) => unknown) => selector(agentsStoreState),
}));

vi.mock('@/stores/approvals', () => ({
  useApprovalsStore: (selector: (state: typeof approvalsStoreState) => unknown) => selector(approvalsStoreState),
}));

vi.mock('@/stores/rightPanelStore', () => ({
  useRightPanelStore: (selector: (state: typeof rightPanelStoreState) => unknown) =>
    selector(rightPanelStoreState),
}));

vi.mock('./ManualTaskForm', async () => {
  const actual = await vi.importActual<typeof import('@/pages/TaskKanban/ManualTaskForm')>(
    '@/pages/TaskKanban/ManualTaskForm',
  );
  return actual;
});

describe('TaskKanban', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsState.current = new URLSearchParams('view=board');
    agentsStoreState.agents = [];
    approvalsStoreState.tasks = [];
  });

  it('renders the board header, view tabs, and empty-agent state', () => {
    render(<TaskKanban />);

    expect(screen.getByRole('heading', { name: '任务看板' })).toBeInTheDocument();
    expect(screen.getByText('0 个进行中的任务')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '创建任务' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '看板' })).toHaveAttribute('data-state', 'active');
    expect(screen.getByRole('tab', { name: '日程' })).toBeInTheDocument();
    expect(screen.getByText('暂无 Agent')).toBeInTheDocument();
  });

  it('renders agent rows and places tasks under the correct status columns', () => {
    agentsStoreState.agents = [
      { id: 'leader-1', name: 'Leader One', teamRole: 'leader' },
      { id: 'worker-1', name: 'Worker One', teamRole: 'worker' },
    ];
    approvalsStoreState.tasks = [
      {
        id: 'task-team',
        title: 'Coordinate launch',
        description: 'Prepare release checklist',
        status: 'todo',
        priority: 'high',
        assigneeId: 'leader-1',
        workState: 'working',
        teamName: 'Alpha',
        isTeamTask: true,
        createdAt: '2026-04-09T00:00:00.000Z',
        updatedAt: '2026-04-09T00:00:00.000Z',
      },
      {
        id: 'task-worker',
        title: 'Write migration guide',
        description: 'Document the restore path',
        status: 'review',
        priority: 'medium',
        assigneeId: 'worker-1',
        workState: 'idle',
        isTeamTask: false,
        createdAt: '2026-04-09T00:00:00.000Z',
        updatedAt: '2026-04-09T00:00:00.000Z',
      },
    ];

    render(<TaskKanban />);

    expect(screen.getByText('Leader One')).toBeInTheDocument();
    expect(screen.getByText('Worker One')).toBeInTheDocument();
    expect(screen.getByText('团队Alpha：Coordinate launch')).toBeInTheDocument();
    expect(screen.getByText('Write migration guide')).toBeInTheDocument();
    expect(screen.getByText('工作中')).toBeInTheDocument();
    expect(screen.getByText('审查')).toBeInTheDocument();
  });

  it('opens the task panel and syncs search params when a task card is clicked', () => {
    agentsStoreState.agents = [{ id: 'worker-1', name: 'Worker One', teamRole: 'worker' }];
    approvalsStoreState.tasks = [
      {
        id: 'task-123',
        title: 'Inspect sync issue',
        description: 'Review the channel history',
        status: 'todo',
        priority: 'medium',
        assigneeId: 'worker-1',
        workState: 'idle',
        isTeamTask: false,
        createdAt: '2026-04-09T00:00:00.000Z',
        updatedAt: '2026-04-09T00:00:00.000Z',
      },
    ];

    render(<TaskKanban />);

    fireEvent.click(screen.getByText('Inspect sync issue'));

    expect(rightPanelStoreState.openPanel).toHaveBeenCalledWith('task', 'task-123');
    expect(setSearchParamsMock).toHaveBeenCalledTimes(1);
    const nextParams = setSearchParamsMock.mock.calls[0]?.[0] as URLSearchParams;
    expect(nextParams.get('taskId')).toBe('task-123');
    expect(nextParams.get('view')).toBe('board');
  });

  it('opens the selected task from search params on mount', async () => {
    searchParamsState.current = new URLSearchParams('view=board&taskId=task-from-query');

    render(<TaskKanban />);

    await waitFor(() => {
      expect(rightPanelStoreState.openPanel).toHaveBeenCalledWith('task', 'task-from-query');
    });
  });

  it('shows the calendar empty state when the calendar tab is the current view and no tasks have deadlines', () => {
    searchParamsState.current = new URLSearchParams('view=calendar');
    agentsStoreState.agents = [{ id: 'worker-1', name: 'Worker One', teamRole: 'worker' }];
    approvalsStoreState.tasks = [
      {
        id: 'task-no-deadline',
        title: 'Undated task',
        description: 'No deadline yet',
        status: 'todo',
        priority: 'low',
        assigneeId: 'worker-1',
        workState: 'idle',
        isTeamTask: false,
        createdAt: '2026-04-09T00:00:00.000Z',
        updatedAt: '2026-04-09T00:00:00.000Z',
      },
    ];

    render(<TaskKanban />);

    expect(screen.getByRole('tab', { name: '日程' })).toHaveAttribute('data-state', 'active');
    expect(screen.getByText('暂无排期任务')).toBeInTheDocument();
  });
});
