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
      animate={{ width: collapsed ? 72 : 360 }}
      className="shrink-0 bg-white border-l border-slate-200/80 shadow-xl flex flex-col"
    >
      {/* 头部 */}
      <div className="h-16 border-b border-slate-200/60 flex items-center justify-between px-5">
        {!collapsed && (
          <h3 className="text-base font-semibold text-slate-900">
            可用 Agent
          </h3>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'expand' : 'collapse'}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
        >
          {collapsed ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* 内容区 */}
      {!collapsed ? (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-2.5">
            {agents.map(agent => (
              <DraggableAgentCard
                key={agent.id}
                agent={agent}
                teamCount={agentTeamCounts[agent.id] || 0}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
          <Bot className="w-7 h-7 text-slate-400" />
          <div className="flex flex-col gap-2">
            {agents.slice(0, 3).map(agent => {
              const initials = agent.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
              return (
                <div
                  key={agent.id}
                  className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium"
                >
                  {initials}
                </div>
              );
            })}
          </div>
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
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "p-4 rounded-xl border-2 bg-white cursor-grab active:cursor-grabbing transition-all",
        isDragging
          ? "opacity-50 border-blue-300"
          : "border-slate-200 hover:border-blue-300 hover:shadow-md"
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-11 w-11 ring-2 ring-slate-100">
          {agent.avatar ? (
            <img src={agent.avatar} alt={agent.name} className="object-cover" />
          ) : (
            <AvatarFallback className="bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 text-sm font-semibold">
              {initials}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-slate-900 truncate">{agent.name}</p>
          <p className="text-xs text-slate-500 truncate">{agent.persona || '暂无描述'}</p>
        </div>
      </div>

      {/* 团队徽章 (per D-17) */}
      {teamCount > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <Badge variant="secondary" className="text-xs font-medium">
            已加入 {teamCount} 个团队
          </Badge>
        </div>
      )}
    </motion.div>
  );
}
