import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { TaskKanban } from '@/pages/TaskKanban';

const { agentsStoreState, approvalsStoreState, hostApiFetchMock } = vi.hoisted(() => ({
  agentsStoreState: {
    agents: [] as Array<{ id: string; name: string }>,
    fetchAgents: vi.fn(async () => undefined),
  },
  approvalsStoreState: {
    approvals: [] as Array<{ id: string; command?: string; prompt?: string; toolInput?: Record<string, unknown>; agentId?: string }>,
    fetchApprovals: vi.fn(async () => undefined),
    approveItem: vi.fn(async () => undefined),
    rejectItem: vi.fn(async () => undefined),
  },
  hostApiFetchMock: vi.fn(),
}));

vi.mock('@/stores/agents', () => ({
  useAgentsStore: () => agentsStoreState,
}));

vi.mock('@/stores/approvals', () => ({
  useApprovalsStore: () => approvalsStoreState,
}));

vi.mock('@/lib/host-api', () => ({
  hostApiFetch: hostApiFetchMock,
}));

function readStoredTicket(id: string): Record<string, unknown> | undefined {
  const raw = localStorage.getItem('clawport-kanban');
  const tickets = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : [];
  return tickets.find((ticket) => ticket.id === id);
}

describe('TaskKanban', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useRealTimers();
    approvalsStoreState.approvals = [];
    agentsStoreState.agents = [];
  });

  it('renders a readable AskUserQuestion action label', () => {
    approvalsStoreState.approvals = [
      {
        id: 'approval-1',
        command: 'AskUserQuestion',
        prompt: '{"question":"Pick one","options":["A","B"]}',
      },
    ];

    render(<TaskKanban />);

    expect(screen.getByRole('button', { name: 'Respond' })).toBeInTheDocument();
  });

  it('opens structured toolInput questions with context and prefills the previous answer', async () => {
    approvalsStoreState.approvals = [
      {
        id: 'approval-ask',
        command: 'AskUserQuestion',
        toolInput: {
          questions: [
            {
              question: 'Pick one',
              header: 'Choice',
              options: [{ label: 'A' }, { label: 'B' }],
            },
          ],
          answers: { 'Pick one': 'B' },
          context: {
            requestedToolInput: { command: 'rm -rf /tmp/unsafe' },
          },
        },
        agentId: 'agent-1',
      },
    ];

    render(<TaskKanban />);

    fireEvent.click(screen.getByRole('button', { name: 'Respond' }));
    await screen.findByText('Pick one');

    expect(screen.getByText('Command: rm -rf /tmp/unsafe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'B' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens a dedicated approval dialog for non-question tool approvals with danger warning', async () => {
    approvalsStoreState.approvals = [
      {
        id: 'approval-shell',
        command: 'ShellExec',
        prompt: 'run shell command',
        agentId: 'agent-1',
        toolInput: {
          command: 'rm -rf /tmp/unsafe',
          cwd: '/workspace',
        },
      },
    ];

    render(<TaskKanban />);

    fireEvent.click(screen.getByRole('button', { name: 'Review' }));

    expect(await screen.findByRole('dialog', { name: 'Approval review' })).toBeInTheDocument();
    expect(screen.getByText(/rm -rf \/tmp\/unsafe/)).toBeInTheDocument();
    expect(screen.getByText(/危险操作/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(approvalsStoreState.approveItem).toHaveBeenCalledWith('approval-shell', undefined);
  });

  it('does not submit on Enter while IME composition is active', () => {
    render(<TaskKanban />);

    fireEvent.click(screen.getByRole('button', { name: '+ 新建任务' }));
    expect(screen.getByRole('heading', { name: '新建任务' })).toBeInTheDocument();

    const [titleInput] = screen.getAllByRole('textbox');
    fireEvent.change(titleInput, { target: { value: 'IME title' } });

    fireEvent.compositionStart(titleInput);
    fireEvent.keyDown(titleInput, { key: 'Enter' });

    expect(screen.getByRole('heading', { name: '新建任务' })).toBeInTheDocument();
    expect(titleInput).toHaveValue('IME title');

    fireEvent.compositionEnd(titleInput);
    fireEvent.keyDown(titleInput, { key: 'Enter' });

    expect(screen.queryByRole('heading', { name: '新建任务' })).not.toBeInTheDocument();
    expect(screen.getByText('IME title')).toBeInTheDocument();
  });

  it('shows assigneeRole in detail and locks dragging for active work items', () => {
    localStorage.setItem('clawport-kanban', JSON.stringify([
      {
        id: 'ticket-locked',
        title: 'Runtime task',
        description: 'Waiting for agent runtime',
        status: 'todo',
        priority: 'high',
        assigneeRole: 'planner',
        workState: 'working',
        createdAt: '2026-03-25T00:00:00.000Z',
        updatedAt: '2026-03-25T00:00:00.000Z',
      },
    ]));

    render(<TaskKanban />);

    const card = screen.getByTestId('ticket-card-ticket-locked');
    expect(card).toHaveAttribute('draggable', 'false');

    fireEvent.click(screen.getByText('Runtime task'));

    expect(screen.getAllByText('planner').length).toBeGreaterThan(0);
    expect(screen.getByText(/运行中任务不可拖拽/)).toBeInTheDocument();
  });

  it('spawns a runtime session and shows transcript in the ticket detail panel', async () => {
    agentsStoreState.agents = [{ id: 'planner-1', name: 'Planner' }];
    localStorage.setItem('clawport-kanban', JSON.stringify([
      {
        id: 'ticket-runtime',
        title: 'Ship runtime task',
        description: 'Ask planner to investigate',
        status: 'todo',
        priority: 'medium',
        assigneeId: 'planner-1',
        workState: 'idle',
        createdAt: '2026-03-25T00:00:00.000Z',
        updatedAt: '2026-03-25T00:00:00.000Z',
      },
    ]));
    hostApiFetchMock.mockResolvedValueOnce({
      success: true,
      session: {
        id: 'runtime-1',
        sessionKey: 'agent:planner-1:main:subagent:runtime-1',
        prompt: 'Ship runtime task\n\nAsk planner to investigate',
        transcript: ['Ship runtime task\n\nAsk planner to investigate'],
        status: 'running',
      },
    });

    render(<TaskKanban />);
    fireEvent.click(screen.getByText('Ship runtime task'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start work' }));
    });

    expect(hostApiFetchMock).toHaveBeenCalledWith('/api/sessions/spawn', expect.objectContaining({ method: 'POST' }));
    await waitFor(() => {
      expect(screen.getAllByText(/runtime-1/).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/Ask planner to investigate/).length).toBeGreaterThan(0);
    expect(readStoredTicket('ticket-runtime')).toEqual(expect.objectContaining({
      status: 'in-progress',
      workState: 'working',
      runtimeSessionId: 'runtime-1',
      runtimeSessionKey: 'agent:planner-1:main:subagent:runtime-1',
    }));
  });

  it('steers and kills an active runtime session from the detail panel', async () => {
    localStorage.setItem('clawport-kanban', JSON.stringify([
      {
        id: 'ticket-runtime-steer',
        title: 'Investigate costs',
        description: 'Need more detail',
        status: 'todo',
        priority: 'medium',
        workState: 'working',
        runtimeSessionId: 'runtime-2',
        runtimeTranscript: ['Investigate costs'],
        createdAt: '2026-03-25T00:00:00.000Z',
        updatedAt: '2026-03-25T00:00:00.000Z',
      },
    ]));
    hostApiFetchMock
      .mockResolvedValueOnce({
        success: true,
        session: {
          id: 'runtime-2',
          status: 'running',
          transcript: ['Investigate costs', 'Follow up on anomalies'],
        },
      })
      .mockResolvedValueOnce({
        success: true,
        session: {
          id: 'runtime-2',
          status: 'killed',
          transcript: ['Investigate costs', 'Follow up on anomalies'],
        },
      });

    render(<TaskKanban />);
    fireEvent.click(screen.getByText('Investigate costs'));
    fireEvent.change(screen.getByRole('textbox', { name: 'Follow-up message' }), {
      target: { value: 'Follow up on anomalies' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Send follow-up' }));
    });
    expect(hostApiFetchMock).toHaveBeenCalledWith('/api/sessions/subagents/runtime-2/steer', expect.objectContaining({ method: 'POST' }));
    await waitFor(() => {
      expect(screen.getByText(/Follow up on anomalies/)).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Stop runtime' }));
    });
    expect(hostApiFetchMock).toHaveBeenCalledWith('/api/sessions/subagents/runtime-2/kill', expect.objectContaining({ method: 'POST' }));
    expect(screen.getByText(/Runtime killed|Manually stopped/)).toBeInTheDocument();
  });

  it('polls wait for active runtime work and maps blocked state back into ticket metadata', async () => {
    vi.useFakeTimers();
    localStorage.setItem('clawport-kanban', JSON.stringify([
      {
        id: 'ticket-blocked',
        title: 'Blocked runtime',
        description: 'Needs approval',
        status: 'todo',
        priority: 'medium',
        workState: 'working',
        runtimeSessionId: 'runtime-blocked',
        runtimeTranscript: ['Investigate failure'],
        createdAt: '2026-03-25T00:00:00.000Z',
        updatedAt: '2026-03-25T00:00:00.000Z',
      },
    ]));

    hostApiFetchMock.mockImplementation(async (path: string) => {
      if (path === '/api/sessions/subagents/runtime-blocked/wait') {
        return {
          success: true,
          session: {
            id: 'runtime-blocked',
            status: 'blocked',
            lastError: 'Waiting on dependency',
            transcript: ['Investigate failure', 'Blocked by missing data'],
          },
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    render(<TaskKanban />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(hostApiFetchMock).toHaveBeenCalledWith(
      '/api/sessions/subagents/runtime-blocked/wait',
      expect.objectContaining({ method: 'POST' }),
    );

    expect(readStoredTicket('ticket-blocked')).toEqual(expect.objectContaining({
      status: 'in-progress',
      workState: 'blocked',
      workError: 'Waiting on dependency',
      runtimeTranscript: ['Investigate failure', 'Blocked by missing data'],
    }));
  });

  it('maps waiting_approval then completed runtime states to review-ready ticket output', async () => {
    vi.useFakeTimers();
    localStorage.setItem('clawport-kanban', JSON.stringify([
      {
        id: 'ticket-review',
        title: 'Need review',
        description: 'Generate patch',
        status: 'in-progress',
        priority: 'medium',
        workState: 'working',
        runtimeSessionId: 'runtime-review',
        runtimeTranscript: ['Started task'],
        createdAt: '2026-03-25T00:00:00.000Z',
        updatedAt: '2026-03-25T00:00:00.000Z',
      },
    ]));

    hostApiFetchMock
      .mockResolvedValueOnce({
        success: true,
        session: {
          id: 'runtime-review',
          status: 'waiting_approval',
          lastError: 'Need manual approval',
          transcript: ['Started task', 'Please approve command'],
        },
      })
      .mockResolvedValueOnce({
        success: true,
        session: {
          id: 'runtime-review',
          status: 'completed',
          result: 'Patch prepared and ready for review',
          transcript: ['Started task', 'Patch prepared and ready for review'],
        },
      });

    render(<TaskKanban />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(readStoredTicket('ticket-review')).toEqual(expect.objectContaining({
      status: 'review',
      workState: 'waiting_approval',
      workError: 'Need manual approval',
    }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(readStoredTicket('ticket-review')).toEqual(expect.objectContaining({
      status: 'review',
      workState: 'done',
      workResult: 'Patch prepared and ready for review',
    }));
  });

  it.each(['error', 'killed', 'stopped'] as const)(
    'maps %s runtime state into failed work while preserving retry controls',
    async (runtimeStatus) => {
      vi.useFakeTimers();
      localStorage.setItem('clawport-kanban', JSON.stringify([
        {
          id: `ticket-${runtimeStatus}`,
          title: `Runtime ${runtimeStatus}`,
          description: 'Check status mapping',
          status: 'in-progress',
          priority: 'medium',
          workState: 'working',
          runtimeSessionId: `runtime-${runtimeStatus}`,
          runtimeTranscript: ['Start'],
          createdAt: '2026-03-25T00:00:00.000Z',
          updatedAt: '2026-03-25T00:00:00.000Z',
        },
      ]));

      hostApiFetchMock.mockResolvedValue({
        success: true,
        session: {
          id: `runtime-${runtimeStatus}`,
          status: runtimeStatus,
          lastError: `Runtime ${runtimeStatus}`,
          transcript: ['Start'],
        },
      });

      render(<TaskKanban />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });

      expect(readStoredTicket(`ticket-${runtimeStatus}`)).toEqual(expect.objectContaining({
        workState: 'failed',
        workError: `Runtime ${runtimeStatus}`,
        runtimeSessionId: `runtime-${runtimeStatus}`,
      }));

      fireEvent.click(screen.getByText(`Runtime ${runtimeStatus}`));
      expect(screen.getByRole('button', { name: 'Retry work' })).toBeInTheDocument();
    },
  );

  it('shows session-linked approvals in the ticket detail panel', async () => {
    approvalsStoreState.approvals = [
      {
        id: 'approval-linked',
        sessionKey: 'agent:planner-1:main:subagent:runtime-approval',
        command: 'ShellExec',
        agentId: 'planner-1',
        toolInput: {
          command: 'rm -rf /tmp/unsafe',
          cwd: '/workspace',
        },
      },
    ];
    localStorage.setItem('clawport-kanban', JSON.stringify([
      {
        id: 'ticket-approval',
        title: 'Needs approval binding',
        description: 'Review a dangerous command',
        status: 'review',
        priority: 'high',
        assigneeId: 'planner-1',
        workState: 'waiting_approval',
        runtimeSessionId: 'runtime-approval',
        runtimeSessionKey: 'agent:planner-1:main:subagent:runtime-approval',
        runtimeTranscript: ['Started task', 'Need approval'],
        createdAt: '2026-03-25T00:00:00.000Z',
        updatedAt: '2026-03-25T00:00:00.000Z',
      },
    ]));

    render(<TaskKanban />);
    fireEvent.click(screen.getByText('Needs approval binding'));

    const approvalsPanel = screen.getByTestId('ticket-runtime-approvals');
    expect(within(approvalsPanel).getByText('ShellExec')).toBeInTheDocument();

    fireEvent.click(within(approvalsPanel).getByRole('button', { name: 'Review' }));

    expect(await screen.findByRole('dialog', { name: 'Approval review' })).toBeInTheDocument();
  });

  it('retries runtime work as a child session and preserves lineage metadata', async () => {
    agentsStoreState.agents = [{ id: 'planner-1', name: 'Planner' }];
    localStorage.setItem('clawport-kanban', JSON.stringify([
      {
        id: 'ticket-runtime-retry',
        title: 'Retry runtime task',
        description: 'Need a follow-up run',
        status: 'review',
        priority: 'medium',
        assigneeId: 'planner-1',
        workState: 'failed',
        runtimeSessionId: 'runtime-parent',
        runtimeSessionKey: 'agent:planner-1:main:subagent:runtime-parent',
        runtimeTranscript: ['First run failed'],
        createdAt: '2026-03-25T00:00:00.000Z',
        updatedAt: '2026-03-25T00:00:00.000Z',
      },
    ]));
    hostApiFetchMock.mockResolvedValueOnce({
      success: true,
      session: {
        id: 'runtime-child',
        parentRuntimeId: 'runtime-parent',
        rootRuntimeId: 'runtime-parent',
        depth: 1,
        sessionKey: 'agent:planner-1:main:subagent:runtime-parent:subagent:runtime-child',
        parentSessionKey: 'agent:planner-1:main:subagent:runtime-parent',
        transcript: ['Retry runtime task\n\nNeed a follow-up run'],
        status: 'running',
      },
    });

    render(<TaskKanban />);
    fireEvent.click(screen.getByText('Retry runtime task'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Retry work' }));
    });

    const [, init] = hostApiFetchMock.mock.calls[0] as [string, { body?: string }];
    expect(JSON.parse(String(init.body))).toEqual(expect.objectContaining({
      parentRuntimeId: 'runtime-parent',
    }));
    expect(readStoredTicket('ticket-runtime-retry')).toEqual(expect.objectContaining({
      runtimeSessionId: 'runtime-child',
      runtimeParentSessionId: 'runtime-parent',
      runtimeRootSessionId: 'runtime-parent',
    }));
  });
});
