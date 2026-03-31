import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TeamCard } from '@/components/team/TeamCard';
import type { TeamSummary } from '@/types/team';

const mockTeam: TeamSummary = {
  id: 'team-1',
  name: 'Engineering Team',
  leaderId: 'leader-1',
  memberIds: ['member-1', 'member-2', 'member-3'],
  description: 'This is a test team description that should be truncated to two lines when it exceeds the maximum length allowed for display in the card component.',
  status: 'active',
  createdAt: Date.now() - 86400000,
  updatedAt: Date.now(),
  memberCount: 4,
  activeTaskCount: 5,
  lastActiveTime: Date.now() - 300000,
  leaderName: 'Alice',
  memberAvatars: [
    { id: 'leader-1', name: 'Alice', avatar: undefined },
    { id: 'member-1', name: 'Bob', avatar: undefined },
    { id: 'member-2', name: 'Charlie', avatar: undefined },
    { id: 'member-3', name: 'David', avatar: undefined },
  ],
};

function renderTeamCard(team: TeamSummary = mockTeam, onDelete = vi.fn()) {
  return render(
    <BrowserRouter>
      <TeamCard team={team} onDelete={onDelete} />
    </BrowserRouter>
  );
}

describe('TeamCard', () => {
  it('renders team name as title', () => {
    renderTeamCard();
    expect(screen.getByText('Engineering Team')).toBeInTheDocument();
  });

  it('renders leader information', () => {
    renderTeamCard();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders member count', () => {
    renderTeamCard();
    expect(screen.getByText(/4.*成员/)).toBeInTheDocument();
  });

  it('renders status badge with correct variant', () => {
    renderTeamCard();
    expect(screen.getByText('活跃')).toBeInTheDocument();
  });

  it('renders active task count', () => {
    renderTeamCard();
    expect(screen.getByText(/5.*个任务/)).toBeInTheDocument();
  });

  it('renders description truncated to 2 lines', () => {
    renderTeamCard();
    const description = screen.getByText(/This is a test team description/);
    expect(description).toHaveClass('line-clamp-2');
  });

  it('renders placeholder when description is empty', () => {
    const teamWithoutDesc = { ...mockTeam, description: '' };
    renderTeamCard(teamWithoutDesc);
    expect(screen.getByText('暂无职责描述')).toBeInTheDocument();
  });

  it('displays first 3 member avatars', () => {
    renderTeamCard();
    // Should show 3 avatars (excluding leader who is shown separately)
    const avatars = screen.getAllByRole('img', { hidden: true });
    expect(avatars.length).toBeGreaterThanOrEqual(3);
  });

  it('displays +N overflow when more than 4 members', () => {
    const teamWithManyMembers = {
      ...mockTeam,
      memberCount: 8,
      memberAvatars: [
        ...mockTeam.memberAvatars,
        { id: 'member-4', name: 'Eve', avatar: undefined },
        { id: 'member-5', name: 'Frank', avatar: undefined },
      ],
    };
    renderTeamCard(teamWithManyMembers);
    expect(screen.getByText(/\+4/)).toBeInTheDocument();
  });

  it('navigates to team map when card is clicked', () => {
    renderTeamCard();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/team-map/team-1');
  });

  it('shows delete button on hover', () => {
    renderTeamCard();

    const card = screen.getByRole('link').parentElement;
    expect(card).toBeInTheDocument();

    // Delete button should exist but be hidden initially
    const deleteButton = screen.getByRole('button', { name: /删除/ });
    expect(deleteButton).toHaveClass('opacity-0');
  });

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn();
    renderTeamCard(mockTeam, onDelete);

    const deleteButton = screen.getByRole('button', { name: /删除/ });
    fireEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith('team-1');
  });

  it('renders idle status with correct styling', () => {
    const idleTeam = { ...mockTeam, status: 'idle' as const };
    renderTeamCard(idleTeam);
    expect(screen.getByText('空闲')).toBeInTheDocument();
  });

  it('renders blocked status with correct styling', () => {
    const blockedTeam = { ...mockTeam, status: 'blocked' as const };
    renderTeamCard(blockedTeam);
    expect(screen.getByText('阻塞')).toBeInTheDocument();
  });

  it('formats last active time correctly', () => {
    renderTeamCard();
    // Should show "5 分钟前" or similar
    expect(screen.getByText(/分钟前/)).toBeInTheDocument();
  });
});
