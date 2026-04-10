import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AgentSummary } from '@/types/agent';
import { MemberDetailSheet } from '@/components/team-map/MemberDetailSheet';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'teamMap.memberDetail.tabs.overview': 'OVERVIEW_TAB',
        'teamMap.memberDetail.tabs.memory': 'MEMORY_TAB',
        'teamMap.memberDetail.tabs.skills': 'SKILLS_TAB',
        'teamMap.memberDetail.tabs.activity': 'ACTIVITY_TAB',
        'teamMap.memberDetail.openChat': 'OPEN_CHAT_ACTION',
        'teamMap.memberDetail.removeFromTeam': 'REMOVE_FROM_TEAM_ACTION',
        'teamMap.memberDetail.removeConfirm': 'REMOVE_CONFIRM_MESSAGE',
      };
      return translations[key] ?? (typeof options?.defaultValue === 'string' ? options.defaultValue : key);
    },
  }),
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

describe('MemberDetailSheet', () => {
  it('renders the required tab order and overview actions', () => {
    render(
      <MemberDetailSheet
        open
        onOpenChange={vi.fn()}
        agent={agent}
        teamId="team-alpha"
        isLeader={false}
        ownedEntryPoints={['feishu']}
        onRemoveMember={vi.fn(async () => {})}
        onOpenChat={vi.fn()}
      />,
    );

    expect(screen.getByRole('tab', { name: 'OVERVIEW_TAB' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'MEMORY_TAB' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'SKILLS_TAB' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'ACTIVITY_TAB' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OPEN_CHAT_ACTION' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'REMOVE_FROM_TEAM_ACTION' })).toBeInTheDocument();
  });

  it('hides remove action for the leader and opens a destructive confirm dialog for members', async () => {
    const onRemoveMember = vi.fn(async () => {});

    const { rerender } = render(
      <MemberDetailSheet
        open
        onOpenChange={vi.fn()}
        agent={agent}
        teamId="team-alpha"
        isLeader
        ownedEntryPoints={[]}
        onRemoveMember={onRemoveMember}
        onOpenChat={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'REMOVE_FROM_TEAM_ACTION' })).not.toBeInTheDocument();

    rerender(
      <MemberDetailSheet
        open
        onOpenChange={vi.fn()}
        agent={agent}
        teamId="team-alpha"
        isLeader={false}
        ownedEntryPoints={[]}
        onRemoveMember={onRemoveMember}
        onOpenChat={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'REMOVE_FROM_TEAM_ACTION' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByText('REMOVE_FROM_TEAM_ACTION').length).toBeGreaterThan(1);
    expect(screen.getByText('REMOVE_CONFIRM_MESSAGE')).toBeInTheDocument();
  });
});
