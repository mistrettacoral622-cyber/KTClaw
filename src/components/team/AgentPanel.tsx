import { useEffect, useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Bot } from 'lucide-react';
import { useAgentsStore } from '@/stores/agents';
import { useTeamsStore } from '@/stores/teams';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { AgentSummary } from '@/types/agent';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    setStoredValue(value);
    window.localStorage.setItem(key, JSON.stringify(value));
  };

  return [storedValue, setValue];
}

export function AgentPanel() {
  const { agents, fetchAgents } = useAgentsStore();
  const { teams } = useTeamsStore();
  const [collapsed, setCollapsed] = useLocalStorage('agentPanelCollapsed', false);

  // 计算每个 Agent 所属团队数 (per D-17)
  const agentTeamCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    teams.forEach(team => {
      [team.leaderId, ...team.memberIds].forEach(agentId => {
        counts[agentId] = (counts[agentId] || 0) + 1;
      });
    });
    return counts;
  }, [teams]);

  useEffect(() => {
    void fetchAgents();
  }, [fetchAgents]);

  return (
    <motion.div
      initial={false}
      animate={{ width: collapsed ? 60 : 320 }}
      className="fixed right-0 top-0 h-full bg-white border-l border-slate-200 shadow-lg z-10"
    >
      {/* 折叠/展开按钮 */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'expand' : 'collapse'}
        className="absolute top-4 left-4 p-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        {collapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>

      {!collapsed && (
        <div className="flex flex-col h-full pt-16 px-4 pb-4">
          <h3 className="text-lg font-semibold mb-4">可用 Agent</h3>

          <div className="flex-1 overflow-y-auto space-y-3">
            {agents.map(agent => (
              <DraggableAgentCard
                key={agent.id}
                agent={agent}
                teamCount={agentTeamCounts[agent.id] || 0}
              />
            ))}
          </div>
        </div>
      )}

      {collapsed && (
        <div className="flex items-center justify-center h-full">
          <Bot className="w-6 h-6 text-slate-400" />
        </div>
      )}
    </motion.div>
  );
}

function DraggableAgentCard({ agent, teamCount }: { agent: AgentSummary; teamCount: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: agent.id,
    data: { agent },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Get initials for avatar fallback
  const initials = agent.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "p-4 rounded-xl border border-slate-200 bg-white cursor-grab active:cursor-grabbing transition-opacity",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          {agent.avatar ? (
            <img src={agent.avatar} alt={agent.name} className="object-cover" />
          ) : (
            <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-medium">
              {initials}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{agent.name}</p>
          <p className="text-xs text-slate-500 truncate">{agent.persona}</p>
        </div>
      </div>

      {/* 团队徽章 (per D-17) */}
      {teamCount > 0 && (
        <Badge variant="secondary" className="mt-2">
          {teamCount} 个团队
        </Badge>
      )}
    </motion.div>
  );
}
