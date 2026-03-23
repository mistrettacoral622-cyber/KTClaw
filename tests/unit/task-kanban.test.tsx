import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TaskKanban } from '@/pages/TaskKanban';

const { agentsStoreState, approvalsStoreState } = vi.hoisted(() => ({
  agentsStoreState: {
    agents: [] as Array<{ id: string; name: string }>,
    fetchAgents: vi.fn(async () => undefined),
  },
  approvalsStoreState: {
    approvals: [] as Array<{ id: string; command?: string; prompt?: string }>,
    fetchApprovals: vi.fn(async () => undefined),
    approveItem: vi.fn(async () => undefined),
    rejectItem: vi.fn(async () => undefined),
  },
}));

vi.mock('@/stores/agents', () => ({
  useAgentsStore: () => agentsStoreState,
}));

vi.mock('@/stores/approvals', () => ({
  useApprovalsStore: () => approvalsStoreState,
}));

describe('TaskKanban', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    approvalsStoreState.approvals = [];
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
});
