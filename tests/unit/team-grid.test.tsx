import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TeamGrid } from '@/components/team/TeamGrid';
import type { TeamSummary } from '@/types/team';

const mockTeams: TeamSummary[] = [
  {
    id: 'team-1',
    name: 'Team Alpha',
    leaderId: 'leader-1',
    memberIds: ['member-1', 'member-2'],
    description: 'First team',
    status: 'active',
    createdAt: Date.now() - 86400000, // 1 day ago
    updatedAt: Date.now(),
    memberCount: 3,
    activeTaskCount: 5,
    lastActiveTime: Date.now() - 300000,
    leaderName: 'Alice',
    memberAvatars: [
      { id: 'leader-1', name: 'Alice', avatar: undefined },
      { id: 'member-1', name: 'Bob', avatar: undefined },
    ],
  },
  {
    id: 'team-2',
    name: 'Team Beta',
    leaderId: 'leader-2',
    memberIds: ['member-3'],
    description: 'Second team',
    status: 'idle',
    createdAt: Date.now() - 172800000, // 2 days ago
    updatedAt: Date.now(),
    memberCount: 2,
    activeTaskCount: 2,
    lastActiveTime: Date.now() - 600000,
    leaderName: 'Charlie',
    memberAvatars: [
      { id: 'leader-2', name: 'Charlie', avatar: undefined },
    ],
  },
  {
    id: 'team-3',
    name: 'Team Gamma',
    leaderId: 'leader-3',
    memberIds: [],
    description: 'Third team',
    status: 'blocked',
    createdAt: Date.now() - 43200000, // 12 hours ago
    updatedAt: Date.now(),
    memberCount: 1,
    activeTaskCount: 1,
    lastActiveTime: Date.now() - 900000,
    leaderName: 'David',
    memberAvatars: [
      { id: 'leader-3', name: 'David', avatar: undefined },
    ],
  },
];

function renderTeamGrid(teams: TeamSummary[] = mockTeams, loading = false, onDeleteTeam = vi.fn()) {
  return render(
    <BrowserRouter>
      <TeamGrid teams={teams} loading={loading} onDeleteTeam={onDeleteTeam} />
    </BrowserRouter>
  );
}

describe('TeamGrid', () => {
  it('renders all teams in grid layout', () => {
    renderTeamGrid();
    expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    expect(screen.getByText('Team Beta')).toBeInTheDocument();
    expect(screen.getByText('Team Gamma')).toBeInTheDocument();
  });

  it('applies responsive grid classes', () => {
    const { container } = renderTeamGrid();
    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('grid-cols-1');
    expect(grid).toHaveClass('md:grid-cols-2');
    expect(grid).toHaveClass('lg:grid-cols-3');
  });

  it('sorts teams by creation time (newest first)', () => {
    renderTeamGrid();
    const teamNames = screen.getAllByRole('heading', { level: 3 });
    // Team Gamma (12h ago) should be first, then Alpha (1d ago), then Beta (2d ago)
    expect(teamNames[0]).toHaveTextContent('Team Gamma');
    expect(teamNames[1]).toHaveTextContent('Team Alpha');
    expect(teamNames[2]).toHaveTextContent('Team Beta');
  });

  it('shows empty state when no teams exist', () => {
    renderTeamGrid([]);
    expect(screen.getByText('还没有团队')).toBeInTheDocument();
    expect(screen.getByText(/从右侧拖拽 Agent 到左侧创建区来创建第一个团队/)).toBeInTheDocument();
  });

  it('does not show empty state when teams exist', () => {
    renderTeamGrid();
    expect(screen.queryByText('还没有团队')).not.toBeInTheDocument();
  });

  it('passes onDeleteTeam callback to TeamCard', () => {
    const onDeleteTeam = vi.fn();
    renderTeamGrid(mockTeams, false, onDeleteTeam);

    // TeamCard should receive the callback
    const deleteButtons = screen.getAllByRole('button', { name: /删除/ });
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it('renders loading state', () => {
    renderTeamGrid([], true);
    // When loading, should not show empty state
    expect(screen.queryByText('还没有团队')).not.toBeInTheDocument();
  });

  it('applies gap spacing between cards', () => {
    const { container } = renderTeamGrid();
    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('gap-6');
  });
});
