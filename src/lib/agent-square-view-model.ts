import type { AgentSummary } from '@/types/agent';
import type { TeamSummary } from '@/types/team';

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

export interface EmployeeSquareCardModel {
  id: string;
  name: string;
  persona: string;
  roleLabel: 'leader' | 'worker';
  teamLabels: string[];
  modelLabel: string;
  channelCount: number;
  lastActiveLabel: string;
  activityTone: 'active' | 'idle' | 'blocked';
  isDirectChatBlocked: boolean;
  detailsHref: string;
  memoryHref: string;
}

function formatLastActiveLabel(lastActivityAt: number | undefined, now: number): string {
  if (!lastActivityAt) {
    return '最近暂无活动';
  }

  const elapsedMs = Math.max(0, now - lastActivityAt);

  if (elapsedMs < 60_000) {
    return '刚刚活跃';
  }

  if (elapsedMs < 3_600_000) {
    return `${Math.floor(elapsedMs / 60_000)} 分钟前活跃`;
  }

  if (elapsedMs < 86_400_000) {
    return `${Math.floor(elapsedMs / 3_600_000)} 小时前活跃`;
  }

  return `${Math.floor(elapsedMs / 86_400_000)} 天前活跃`;
}

function buildTeamLabelMap(teams: TeamSummary[]): Map<string, string[]> {
  const labelsByAgentId = new Map<string, string[]>();

  for (const team of teams) {
    for (const agentId of [team.leaderId, ...team.memberIds]) {
      const labels = labelsByAgentId.get(agentId) ?? [];
      if (!labels.includes(team.name)) {
        labels.push(team.name);
      }
      labelsByAgentId.set(agentId, labels);
    }
  }

  return labelsByAgentId;
}

export function buildEmployeeSquareCardModels(input: {
  agents: AgentSummary[];
  teams: TeamSummary[];
  sessionLastActivity: Record<string, number>;
  now?: number;
}): EmployeeSquareCardModel[] {
  const now = input.now ?? Date.now();
  const teamLabelsByAgentId = buildTeamLabelMap(input.teams);
  const lastActivityByAgentId = new Map(
    input.agents.map((agent) => [agent.id, input.sessionLastActivity[agent.mainSessionKey] ?? 0]),
  );

  return [...input.agents]
    .map((agent) => {
      const lastActivityAt = lastActivityByAgentId.get(agent.id) || undefined;
      const isRecentlyActive = lastActivityAt !== undefined && now - lastActivityAt < ACTIVE_WINDOW_MS;

      return {
        id: agent.id,
        name: agent.name,
        persona: agent.persona,
        roleLabel: agent.teamRole ?? (agent.isDefault ? 'leader' : 'worker'),
        teamLabels: teamLabelsByAgentId.get(agent.id) ?? [],
        modelLabel: agent.modelDisplay,
        channelCount: agent.channelTypes.length,
        lastActiveLabel: formatLastActiveLabel(lastActivityAt, now),
        activityTone: isRecentlyActive ? 'active' : 'idle',
        isDirectChatBlocked: agent.chatAccess === 'leader_only',
        detailsHref: `/agents/${encodeURIComponent(agent.id)}`,
        memoryHref: `/agents/${encodeURIComponent(agent.id)}?tab=memory`,
      } satisfies EmployeeSquareCardModel;
    })
    .sort((left, right) => {
      if (left.roleLabel !== right.roleLabel) {
        return left.roleLabel === 'leader' ? -1 : 1;
      }

      const leftLastActivity = lastActivityByAgentId.get(left.id) ?? 0;
      const rightLastActivity = lastActivityByAgentId.get(right.id) ?? 0;

      if (leftLastActivity !== rightLastActivity) {
        return rightLastActivity - leftLastActivity;
      }

      return left.name.localeCompare(right.name);
    });
}
