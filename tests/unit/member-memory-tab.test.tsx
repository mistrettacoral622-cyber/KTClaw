import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentSummary } from '@/types/agent';
import { MemberMemoryTab } from '@/components/team-map/MemberMemoryTab';
import { getMemoryOverview, reindexMemory, saveMemoryFile } from '@/lib/memory-client';

vi.mock('@/lib/host-api', () => ({
  hostApiFetch: vi.fn(() => {
    throw new Error('MemberMemoryTab should use the shared memory client instead of hostApiFetch directly');
  }),
}));

vi.mock('@/lib/memory-client', () => ({
  getMemoryOverview: vi.fn(),
  saveMemoryFile: vi.fn(),
  reindexMemory: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options?.defaultValue && typeof options.defaultValue === 'string') {
        return options.defaultValue;
      }
      return key;
    },
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const agent: AgentSummary = {
  id: 'researcher',
  name: 'Researcher',
  persona: 'Finds information',
  isDefault: false,
  model: 'claude-sonnet-4',
  modelDisplay: 'Claude Sonnet 4',
  inheritedModel: true,
  workspace: '~/workspace-researcher',
  agentDir: '~/agents/researcher',
  mainSessionKey: 'agent:researcher:main',
  channelTypes: [],
  teamRole: 'worker',
  chatAccess: 'leader_only',
  responsibility: 'Finds information',
};

describe('MemberMemoryTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();

    vi.mocked(getMemoryOverview).mockResolvedValue({
      files: [
        {
          relativePath: 'MEMORY.md',
          label: 'MEMORY.md',
          content: 'Initial memory',
          lastModified: '2026-04-02T00:00:00.000Z',
        },
      ],
      activeScope: 'researcher',
      workspaceDir: '/workspace/researcher',
    });
    vi.mocked(saveMemoryFile).mockResolvedValue({ ok: true });
    vi.mocked(reindexMemory).mockResolvedValue({ ok: true });
  });

  it('loads the current agent MEMORY.md from the scoped memory API', async () => {
    render(<MemberMemoryTab agent={agent} />);

    expect(await screen.findByDisplayValue('Initial memory')).toBeInTheDocument();
    expect(getMemoryOverview).toHaveBeenCalledWith({ scope: 'researcher' });
  });

  it('autosaves MEMORY.md after 1500ms with the agent scope and save states', async () => {
    render(<MemberMemoryTab agent={agent} />);

    const textarea = await screen.findByRole('textbox');
    vi.useFakeTimers();
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'Updated memory' } });
    });

    expect(screen.getByText('Saving...')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveMemoryFile).toHaveBeenCalledWith({
      relativePath: 'MEMORY.md',
      content: 'Updated memory',
      scope: 'researcher',
      expectedMtime: '2026-04-02T00:00:00.000Z',
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(reindexMemory).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Synced')).toBeInTheDocument();
  });
});
