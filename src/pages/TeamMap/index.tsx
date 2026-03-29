import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useAgentsStore } from '@/stores/agents';
import { useChatStore } from '@/stores/chat';
import type { AgentSummary } from '@/types/agent';
import { deriveTeamWorkVisibility, type TeamMemberWorkVisibility } from '@/lib/team-work-visibility';
import { useTeamRuntime, type RuntimeSessionSummary } from '@/hooks/use-team-runtime';
import { hostApiFetch } from '@/lib/host-api';
import { Bot, UserCog, Code, Database, Zap, Cpu, Network, ScrollText, Terminal, Settings2 } from 'lucide-react';
import { motion } from 'framer-motion';

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-600 ring-1 ring-blue-500/20',
  'bg-amber-100 text-amber-600 ring-1 ring-amber-500/20',
  'bg-emerald-100 text-emerald-600 ring-1 ring-emerald-500/20',
  'bg-violet-100 text-violet-600 ring-1 ring-violet-500/20',
  'bg-pink-100 text-pink-600 ring-1 ring-pink-500/20',
  'bg-cyan-100 text-cyan-600 ring-1 ring-cyan-500/20',
];

const AVATAR_ICONS = [Bot, UserCog, Code, Database, Zap, Cpu];
const RECENT_MS = 5 * 60 * 1000;

function agentColor(idx: number) {
  return AVATAR_COLORS[idx % AVATAR_COLORS.length];
}

function AgentIcon({ idx, className }: { idx: number; className?: string }) {
  const Icon = AVATAR_ICONS[idx % AVATAR_ICONS.length];
  return <Icon className={className} />;
}

function isRecentlyActive(ts: number | undefined): boolean {
  return !!ts && Date.now() - ts < RECENT_MS;
}

function getTeamRole(agent: AgentSummary): 'leader' | 'worker' {
  return agent.teamRole ?? (agent.isDefault ? 'leader' : 'worker');
}

function getChatAccess(agent: AgentSummary): 'direct' | 'leader_only' {
  return agent.chatAccess ?? 'direct';
}

function getOwnedEntryPoints(
  agent: AgentSummary,
  channelOwners: Record<string, string>,
  configuredChannelTypes: string[],
): string[] {
  return configuredChannelTypes.filter((channelType) => channelOwners[channelType] === agent.id);
}

function deriveNextStep(statusKey: TeamMemberWorkVisibility['statusKey'], agentName: string): string {
  switch (statusKey) {
    case 'blocked':
      return `Unblock ${agentName}`;
    case 'waiting_approval':
      return `Review approval for ${agentName}`;
    case 'working':
      return `Track ${agentName}'s execution`;
    case 'active':
      return `Check the latest update from ${agentName}`;
    default:
      return `Queue the next work item for ${agentName}`;
  }
}

function AgentNode({
  agent,
  idx,
  isRoot,
  workVisibility,
  onClick,
}: {
  agent: AgentSummary;
  idx: number;
  isRoot: boolean;
  workVisibility?: TeamMemberWorkVisibility;
  onClick?: () => void;
}) {
  const { t } = useTranslation('common');
  const statusKey = workVisibility?.statusKey ?? 'idle';
  const currentWorkTitles = workVisibility?.currentWorkTitles ?? [];
  const role = getTeamRole(agent);
  const access = getChatAccess(agent);

  const isWorking = statusKey === 'working' || statusKey === 'active';

  const statusBorderClass = !isRoot
    ? statusKey === 'blocked' || statusKey === 'waiting_approval'
      ? 'border-l-4 border-l-amber-400 border-slate-200'
      : isWorking
        ? 'border-l-4 border-l-blue-500 border-slate-200'
        : 'border border-slate-200'
    : '';

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.();
      }}
      whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}
      className={cn(
        'rounded-[26px] bg-white p-5 text-left shadow-sm cursor-pointer transition-all relative',
        isRoot
          ? 'w-64 border-2 border-slate-900 bg-slate-50/80'
          : cn('w-56', statusBorderClass),
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-2xl relative',
            isRoot 
              ? 'h-14 w-14 bg-slate-900 text-white shadow-md' 
              : `h-12 w-12 ${agentColor(idx)}`,
          )}
        >
          {isRoot ? <Network className="h-7 w-7" /> : <AgentIcon idx={idx} className="h-6 w-6" />}
          {isWorking && (
             <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5">
               <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
               <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-blue-500 border-2 border-white"></span>
             </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {isRoot && (
            <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-blue-600">
              Team Leader
            </p>
          )}
          <p className={cn('truncate font-semibold text-slate-900', isRoot ? 'text-base' : 'text-sm')}>{agent.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">{t(`teamMap.role.${role}`)}</p>
          {access === 'leader_only' && (
            <p className="mt-1 text-[10px] font-medium text-blue-600">{t('teamMap.access.leader_only')}</p>
          )}
        </div>
      </div>
      <div className="mt-4 rounded-xl bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t('teamMap.node.currentTask')}</span>
          <span
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold',
              statusKey === 'blocked'
                ? 'bg-amber-100 text-amber-800'
                : statusKey === 'waiting_approval'
                  ? 'bg-violet-100 text-violet-800'
                  : isWorking
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-slate-100 text-slate-500',
            )}
          >
            <span className={cn(
              'h-1.5 w-1.5 rounded-full',
              statusKey === 'blocked' ? 'bg-amber-500'
              : statusKey === 'waiting_approval' ? 'bg-violet-500'
              : isWorking ? 'bg-blue-500'
              : 'bg-slate-400',
            )} />
            {t(`teamMap.status.${statusKey}`)}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 min-h-[36px] text-xs leading-5 text-slate-700">
          {currentWorkTitles[0] ?? t('teamMap.node.noCurrentWork')}
        </p>
      </div>
    </motion.div>
  );
}

function ConnectorLines({ childCount, isWorking = false }: { childCount: number, isWorking?: boolean }) {
  if (childCount === 0) return null;

  const nodeW = 208;
  const gap = 24;
  const totalW = childCount * nodeW + (childCount - 1) * gap;
  const svgW = Math.max(totalW, 240);
  const cx = svgW / 2;
  const midY = 28;

  const childCenters = Array.from({ length: childCount }, (_, i) => {
    const startX = (svgW - totalW) / 2;
    return startX + i * (nodeW + gap) + nodeW / 2;
  });

  return (
    <svg
      width={svgW}
      height={56}
      className="-my-px overflow-visible"
      style={{ display: 'block' }}
    >
      {/* Base lines */}
      <path d={`M ${cx} 0 L ${cx} ${midY}`} stroke="#e2e8f0" strokeWidth="2" fill="none" />
      {childCount > 1 && (
        <path d={`M ${childCenters[0]} ${midY} L ${childCenters[childCenters.length - 1]} ${midY}`} stroke="#e2e8f0" strokeWidth="2" fill="none" />
      )}
      {childCenters.map((x, i) => (
        <path key={i} d={`M ${x} ${midY} L ${x} 56`} stroke="#e2e8f0" strokeWidth="2" fill="none" />
      ))}
      
      {/* Animated Flow for working state */}
      {isWorking && (
        <>
          <motion.path 
            d={`M ${cx} 0 L ${cx} ${midY}`} 
            stroke="#3b82f6" 
            strokeWidth="2" 
            fill="none" 
            strokeDasharray="4 8"
            animate={{ strokeDashoffset: -24 }}
            transition={{ repeat: Infinity, ease: "linear", duration: 1 }}
          />
          {childCount > 1 && (
            <motion.path 
              d={`M ${childCenters[0]} ${midY} L ${childCenters[childCenters.length - 1]} ${midY}`} 
              stroke="#3b82f6" 
              strokeWidth="2" 
              fill="none" 
              strokeDasharray="4 8"
              animate={{ strokeDashoffset: -24 }}
              transition={{ repeat: Infinity, ease: "linear", duration: 1 }}
            />
          )}
          {childCenters.map((x, i) => (
            <motion.path 
              key={`anim-${i}`} 
              d={`M ${x} ${midY} L ${x} 56`} 
              stroke="#3b82f6" 
              strokeWidth="2" 
              fill="none" 
              strokeDasharray="4 8"
              animate={{ strokeDashoffset: -24 }}
              transition={{ repeat: Infinity, ease: "linear", duration: 1 }}
            />
          ))}
        </>
      )}
    </svg>
  );
}

function EmptyState() {
  const { t } = useTranslation('common');
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
      <span className="text-[40px]">🤖</span>
      <p className="text-[14px] text-[#8e8e93]">{t('teamMap.empty.title')}</p>
      <p className="text-[12px] text-[#c6c6c8]">{t('teamMap.empty.description')}</p>
    </div>
  );
}

function RecursiveNode({
  agent,
  idx,
  allAgents,
  workVisibility,
  sessionLastActivity,
  selectedAgentId,
  onSelectAgent
}: {
  agent: AgentSummary;
  idx: number;
  allAgents: AgentSummary[];
  workVisibility: Record<string, TeamMemberWorkVisibility>;
  sessionLastActivity: Record<string, number>;
  selectedAgentId: string | null;
  onSelectAgent: (agent: AgentSummary) => void;
}) {
  const isRoot = !agent.reportsTo && agent.isDefault;
  
  const childAgents = allAgents.filter(a => {
    if (a.id === agent.id) return false;
    if (isRoot) {
      return a.reportsTo === agent.id || (!a.reportsTo && !a.isDefault);
    }
    return a.reportsTo === agent.id;
  });

  return (
    <div className="flex flex-col items-center">
      <AgentNode
        agent={agent}
        idx={idx}
        isRoot={Boolean(isRoot)}
        workVisibility={workVisibility[agent.id] ?? {
          statusKey: isRecentlyActive(sessionLastActivity[agent.mainSessionKey]) ? 'active' : 'idle',
          activeTaskCount: 0,
          currentWorkTitles: [],
        }}
        onClick={() => onSelectAgent(agent)}
      />
      {childAgents.length > 0 && (
        <ConnectorLines
          childCount={childAgents.length}
          isWorking={childAgents.some(a => workVisibility[a.id]?.statusKey === 'working' || workVisibility[a.id]?.statusKey === 'active' || isRecentlyActive(sessionLastActivity[a.mainSessionKey]))}
        />
      )}
      {childAgents.length > 0 && (
        <div className="flex justify-center gap-8 items-start">
          {childAgents.map((child, cIdx) => (
            <RecursiveNode
              key={child.id}
              agent={child}
              idx={cIdx + 1}
              allAgents={allAgents}
              workVisibility={workVisibility}
              sessionLastActivity={sessionLastActivity}
              selectedAgentId={selectedAgentId}
              onSelectAgent={onSelectAgent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TeamMap() {
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState<'Teams' | 'Hierarchy'>('Hierarchy');
  const [scale, setScale] = useState(1);
  const [selectedAgent, setSelectedAgent] = useState<AgentSummary | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { agents, loading, fetchAgents, defaultAgentId, configuredChannelTypes, channelOwners } = useAgentsStore();
  const sessionLastActivity = useChatStore((s) => s.sessionLastActivity);
  const { byAgent: runtimeByAgent } = useTeamRuntime();
  const workVisibility = useMemo(
    () => deriveTeamWorkVisibility(agents, sessionLastActivity, runtimeByAgent),
    [agents, sessionLastActivity, runtimeByAgent],
  );

  useEffect(() => {
    void fetchAgents();
  }, [fetchAgents]);

  const rootAgent = agents.find((a) => a.id === defaultAgentId) ?? agents[0] ?? null;
  const focusedAgent = selectedAgent ?? rootAgent;

  const zoomIn = () => setScale((s) => Math.min(2, +(s + 0.2).toFixed(1)));
  const zoomOut = () => setScale((s) => Math.max(0.4, +(s - 0.2).toFixed(1)));
  const zoomFit = () => setScale(1);

  return (
    <div className="flex h-full flex-col bg-slate-50 p-6 xl:p-8">
      <div className="grid flex-1 min-h-0 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="relative flex min-h-0 flex-col overflow-hidden rounded-[32px] bg-slate-50 border border-slate-200/60 shadow-sm">
          <div className="absolute right-6 top-6 flex items-center gap-5 text-xs text-slate-500 z-10">
            <span className="flex items-center gap-2 font-medium">
              <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              {t('teamMap.status.active')}
            </span>
            <span className="flex items-center gap-2 font-medium">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              {t('teamMap.status.idle')}
            </span>
            {scale !== 1 && (
              <span className="text-slate-400 font-medium">{Math.round(scale * 100)}%</span>
            )}
            {loading && (
              <span className="text-slate-400">{t('status.loading')}</span>
            )}
          </div>

          {activeTab === 'Hierarchy' ? (
            !loading && !rootAgent ? (
              <EmptyState />
            ) : (
              <div
                ref={containerRef}
                className="flex flex-1 items-center justify-center overflow-auto pb-16 pt-12 relative bg-[#f1f5f9]/30"
                style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '24px 24px' }}
              >
                <div
                  className="flex flex-col items-center transition-transform duration-200"
                  style={{ transform: `scale(${scale})`, transformOrigin: 'center top' }}
                >
                  {rootAgent && (
                    <RecursiveNode
                      agent={rootAgent}
                      idx={0}
                      allAgents={agents}
                      workVisibility={workVisibility}
                      sessionLastActivity={sessionLastActivity}
                      selectedAgentId={selectedAgent?.id ?? null}
                      onSelectAgent={setSelectedAgent}
                    />
                  )}
                </div>
              </div>
            )
          ) : (
            <TeamsView
              agents={agents}
              loading={loading}
              sessionLastActivity={sessionLastActivity}
              workVisibility={workVisibility}
              onSelectAgent={setSelectedAgent}
            />
          )}

          <div className="absolute bottom-6 left-6 flex flex-col gap-1.5 z-10">
            {([
              { icon: '+', action: zoomIn, title: t('teamMap.zoom.in') },
              { icon: '−', action: zoomOut, title: t('teamMap.zoom.out') },
              { icon: '⛶', action: zoomFit, title: t('teamMap.zoom.reset') },
            ] as const).map(({ icon, action, title }) => (
              <button
                key={icon}
                type="button"
                title={title}
                onClick={action}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                {icon}
              </button>
            ))}
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
            <div className="flex rounded-full border border-slate-200 bg-white/90 p-1 shadow-sm backdrop-blur-md">
              {([['Teams', t('teamMap.tabs.teams')], ['Hierarchy', t('teamMap.tabs.hierarchy')]] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'rounded-full px-5 py-2 text-sm font-medium transition-colors',
                    activeTab === tab
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <OperationsRail
          agent={focusedAgent}
          workVisibility={focusedAgent ? workVisibility[focusedAgent.id] : undefined}
          ownedEntryPoints={focusedAgent ? getOwnedEntryPoints(focusedAgent, channelOwners, configuredChannelTypes) : []}
          runtimeSessions={focusedAgent ? (runtimeByAgent[focusedAgent.id] ?? []) : []}
        />
      </div>
    </div>
  );
}

function TeamsView({
  agents,
  loading,
  sessionLastActivity,
  workVisibility,
  onSelectAgent,
}: {
  agents: AgentSummary[];
  loading: boolean;
  sessionLastActivity: Record<string, number>;
  workVisibility: Record<string, TeamMemberWorkVisibility>;
  onSelectAgent: (agent: AgentSummary) => void;
}) {
  const { t } = useTranslation('common');
  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-sm text-slate-400">{t('status.loading')}</div>;
  }
  if (agents.length === 0) {
    return <EmptyState />;
  }

  const channelGroups = new Map<string, AgentSummary[]>();
  channelGroups.set(t('teamMap.allGroup'), agents);
  for (const agent of agents) {
    for (const ch of agent.channelTypes) {
      const prev = channelGroups.get(ch) ?? [];
      channelGroups.set(ch, [...prev, agent]);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 pb-16 bg-slate-50/50">
      <div className="space-y-8">
        {[...channelGroups.entries()].map(([group, groupAgents]) => (
          <div key={group}>
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{group}</span>
              <span className="rounded-full bg-slate-200/50 px-2 py-0.5 text-xs text-slate-500">{groupAgents.length}</span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
              {groupAgents.map((agent, idx) => (
                <AgentNode
                  key={agent.id}
                  agent={agent}
                  idx={idx}
                  isRoot={false}
                  workVisibility={workVisibility[agent.id] ?? {
                    statusKey: isRecentlyActive(sessionLastActivity[agent.mainSessionKey]) ? 'active' : 'idle',
                    activeTaskCount: 0,
                    currentWorkTitles: [],
                  }}
                  onClick={() => onSelectAgent(agent)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OperationsRail({
  agent,
  workVisibility,
  ownedEntryPoints,
  runtimeSessions,
}: {
  agent: AgentSummary | null;
  workVisibility?: TeamMemberWorkVisibility;
  ownedEntryPoints: string[];
  runtimeSessions?: RuntimeSessionSummary[];
}) {
  const { t } = useTranslation('common');
  const [railTab, setRailTab] = useState<'overview' | 'workspace' | 'terminal'>('overview');

  const [workspaceFiles, setWorkspaceFiles] = useState<{ agentsMd: string; soulMd: string }>({
    agentsMd: '',
    soulMd: '',
  });
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceDraft, setWorkspaceDraft] = useState<{ agentsMd: string; soulMd: string } | null>(null);
  const [workspaceSaving, setWorkspaceSaving] = useState(false);
  const [workspaceSaved, setWorkspaceSaved] = useState(false);

  useEffect(() => {
    if (!agent) return;
    setWorkspaceLoading(true);
    setWorkspaceDraft(null);
    setWorkspaceSaved(false);
    Promise.all([
      hostApiFetch<{ success: boolean; content: string; exists: boolean }>(
        `/api/agents/${encodeURIComponent(agent.id)}/workspace/AGENTS.md`,
      ).catch(() => ({ success: false, content: '', exists: false })),
      hostApiFetch<{ success: boolean; content: string; exists: boolean }>(
        `/api/agents/${encodeURIComponent(agent.id)}/workspace/SOUL.md`,
      ).catch(() => ({ success: false, content: '', exists: false })),
    ]).then(([agentsResult, soulResult]) => {
      setWorkspaceFiles({
        agentsMd: agentsResult.content || `# ${agent.name} — AGENTS.md\n\n(File not found in workspace)`,
        soulMd: soulResult.content || `# ${agent.name} — SOUL.md\n\n(File not found in workspace)`,
      });
      setWorkspaceLoading(false);
    });
  }, [agent?.id]); // re-fetch when selected agent changes

  const isDirty = workspaceDraft !== null && (
    workspaceDraft.agentsMd !== workspaceFiles.agentsMd ||
    workspaceDraft.soulMd !== workspaceFiles.soulMd
  );

  const handleSaveWorkspace = async () => {
    if (!agent || !workspaceDraft || workspaceSaving) return;
    setWorkspaceSaving(true);
    try {
      await Promise.all([
        hostApiFetch(`/api/agents/${encodeURIComponent(agent.id)}/workspace/AGENTS.md`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: workspaceDraft.agentsMd }),
        }),
        hostApiFetch(`/api/agents/${encodeURIComponent(agent.id)}/workspace/SOUL.md`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: workspaceDraft.soulMd }),
        }),
      ]);
      setWorkspaceFiles({ agentsMd: workspaceDraft.agentsMd, soulMd: workspaceDraft.soulMd });
      setWorkspaceDraft(null);
      setWorkspaceSaved(true);
      setTimeout(() => setWorkspaceSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save workspace files:', err);
    } finally {
      setWorkspaceSaving(false);
    }
  };

  if (!agent) {
    return (
      <aside className="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-sm flex items-center justify-center">
        <p className="text-sm text-slate-400">{t('teamMap.empty.description')}</p>
      </aside>
    );
  }

  const role = getTeamRole(agent);
  const access = getChatAccess(agent);
  const statusKey = workVisibility?.statusKey ?? 'idle';
  const currentWorkTitles = workVisibility?.currentWorkTitles ?? [];
  const nextStep = deriveNextStep(statusKey, agent.name);
  const isWorking = statusKey === 'working' || statusKey === 'active';

  return (
    <aside className="flex min-h-0 flex-col rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-sm relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-50 to-transparent pointer-events-none" />
      
      {/* Tab Navigation */}
      <div className="relative z-10 mb-6 flex rounded-xl border border-slate-200/60 bg-slate-50/50 p-1 shadow-sm backdrop-blur-md">
        {([
          ['overview', 'Overview', UserCog],
          ['workspace', 'Workspace', Settings2],
          ['terminal', 'Live Log', Terminal]
        ] as const).map(([tab, label, Icon]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setRailTab(tab)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all',
              railTab === tab
                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-900/5'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-5 overflow-y-auto relative z-10 pb-4 pr-1">
        {railTab === 'overview' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-5">
            <div className="rounded-[24px] bg-slate-50 border border-slate-100 p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">{t('teamMap.rail.title')}</p>
              <div className="mt-5 flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md relative shrink-0">
                   <Bot className="h-6 w-6" />
                   {isWorking && (
                     <span className="absolute -right-1 -top-1 flex h-3 w-3">
                       <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                       <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500 border-2 border-white"></span>
                     </span>
                   )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-slate-900 truncate">{agent.name}</p>
                  <p className="mt-1 text-xs text-slate-500 truncate">{t(`teamMap.role.${role}`)} · {t(`teamMap.access.${access}`)}</p>
                </div>
              </div>
            </div>

            <RailSection title={t('teamMap.rail.currentTask')}>
              {currentWorkTitles.length > 0 ? currentWorkTitles.map((title) => (
                <p key={title} className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm">{title}</p>
              )) : (
                <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">{t('teamMap.rail.noCurrentTask')}</p>
              )}
            </RailSection>

            <RailSection title={t('teamMap.rail.nextStep')}>
              <p className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">{nextStep}</p>
            </RailSection>

            <RailSection title={t('teamMap.rail.runtimeWork')}>
              <div className="grid gap-2">
                <RailRow label={t('teamMap.rail.currentWork')} value={currentWorkTitles[0] ?? t('teamMap.rail.noCurrentTask')} />
                <RailRow label={t('teamMap.rail.status')} value={t(`teamMap.status.${statusKey}`)} />
              </div>
            </RailSection>

            {runtimeSessions && runtimeSessions.length > 0 && runtimeSessions[0].status === 'running' && (
              <KillSessionButton sessionId={runtimeSessions[0].id} agentName={agent.name} />
            )}

            <RailSection title={t('teamMap.rail.profilePolicy')}>
              <div className="grid gap-2">
                <RailRow label={t('teamMap.drawer.role')} value={t(`teamMap.role.${role}`)} />
                <RailRow label={t('teamMap.drawer.access')} value={t(`teamMap.access.${access}`)} />
                <RailRow label={t('teamMap.drawer.responsibility')} value={agent.responsibility || '—'} />
              </div>
            </RailSection>

            <RailSection title={t('teamMap.rail.entryOwnership')}>
              {ownedEntryPoints.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {ownedEntryPoints.map((channelType) => (
                    <span key={channelType} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
                      {channelType}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">{t('teamMap.drawer.noOwnedEntryPoints')}</p>
              )}
            </RailSection>
          </div>
        )}

        {railTab === 'workspace' && (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="rounded-[20px] border border-slate-200 bg-slate-50 overflow-hidden shadow-sm flex flex-col">
              <div className="bg-white px-4 py-3 flex items-center gap-2 border-b border-slate-200">
                <ScrollText className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-bold text-slate-700">AGENTS.md (SOP)</span>
              </div>
              <textarea
                className="w-full h-40 p-4 text-xs font-mono text-slate-600 bg-transparent resize-none rounded-b-[20px] border-none outline-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400/30 transition-shadow"
                value={workspaceLoading ? 'Loading...' : (workspaceDraft?.agentsMd ?? workspaceFiles.agentsMd)}
                onChange={(e) => setWorkspaceDraft((prev) => ({
                  agentsMd: e.target.value,
                  soulMd: prev?.soulMd ?? workspaceFiles.soulMd,
                }))}
                spellCheck={false}
              />
            </div>
            
            <div className="rounded-[20px] border border-slate-200 bg-slate-50 overflow-hidden shadow-sm flex flex-col">
              <div className="bg-white px-4 py-3 flex items-center gap-2 border-b border-slate-200">
                <UserCog className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-700">SOUL.md (Persona)</span>
              </div>
              <textarea
                className="w-full h-28 p-4 text-xs font-mono text-slate-600 bg-transparent resize-none rounded-b-[20px] border-none outline-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400/30 transition-shadow"
                value={workspaceLoading ? 'Loading...' : (workspaceDraft?.soulMd ?? workspaceFiles.soulMd)}
                onChange={(e) => setWorkspaceDraft((prev) => ({
                  agentsMd: prev?.agentsMd ?? workspaceFiles.agentsMd,
                  soulMd: e.target.value,
                }))}
                spellCheck={false}
              />
            </div>

            {(isDirty || workspaceSaved) && (
              <div className="flex items-center gap-3">
                {isDirty && (
                  <button
                    type="button"
                    onClick={() => void handleSaveWorkspace()}
                    disabled={workspaceSaving}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    {workspaceSaving ? 'Saving...' : 'Save'}
                  </button>
                )}
                {workspaceSaved && (
                  <span className="text-xs font-medium text-emerald-600">Saved</span>
                )}
              </div>
            )}

            <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Model Override</span>
              <div className="flex items-center gap-3">
                 <span className="text-xs font-mono text-slate-500">{agent.modelDisplay || 'deepseek-chat'}</span>
              </div>
            </div>
          </div>
        )}

        {railTab === 'terminal' && (
          <div className="flex flex-col flex-1 h-[460px] animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex-1 rounded-2xl bg-slate-950 p-5 overflow-y-auto font-mono text-[11px] leading-relaxed shadow-inner border border-slate-800 space-y-1">
              {(() => {
                const session = runtimeSessions?.[0];
                if (!session) {
                  return <p className="text-slate-500">[Idle] No active session for {agent?.name}.</p>;
                }
                const history = session.history ?? [];
                if (history.length === 0) {
                  return <p className="text-slate-500">[{new Date(session.createdAt).toLocaleTimeString()}] Session started. Waiting for activity...</p>;
                }
                return history.slice(-40).map((msg, i) => {
                  const ts = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
                  const prefix = ts ? `[${ts}] ` : '';
                  if (msg.isError) {
                    return <p key={i} className="text-red-400">{prefix}[Error] {String(msg.toolName ?? msg.role)}</p>;
                  }
                  if (msg.role === 'tool' || msg.toolName) {
                    return <p key={i} className="text-blue-400">{prefix}[Tool] {String(msg.toolName ?? '')}</p>;
                  }
                  if (msg.role === 'assistant') {
                    const text = typeof msg.content === 'string'
                      ? msg.content.slice(0, 120)
                      : JSON.stringify(msg.content).slice(0, 120);
                    return <p key={i} className="text-green-400">{prefix}{text}{(typeof msg.content === 'string' && msg.content.length > 120) ? '…' : ''}</p>;
                  }
                  if (msg.role === 'user') {
                    const text = typeof msg.content === 'string'
                      ? msg.content.slice(0, 120)
                      : JSON.stringify(msg.content).slice(0, 120);
                    return <p key={i} className="text-slate-300">{prefix}&gt; {text}</p>;
                  }
                  return <p key={i} className="text-slate-500">{prefix}[{msg.role}]</p>;
                });
              })()}
            </div>
          </div>
        )}

      </div>
    </aside>
  );
}

function KillSessionButton({ sessionId, agentName }: { sessionId: string; agentName: string }) {
  const { t } = useTranslation('common');
  const [killing, setKilling] = useState(false);
  const [confirmPending, setConfirmPending] = useState(false);

  const handleKill = async () => {
    if (!confirmPending) {
      setConfirmPending(true);
      return;
    }
    setKilling(true);
    try {
      await hostApiFetch(`/api/sessions/subagents/${encodeURIComponent(sessionId)}/kill`, {
        method: 'POST',
      });
    } finally {
      setKilling(false);
      setConfirmPending(false);
    }
  };

  return (
    <div className="rounded-[20px] border border-red-100 bg-red-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-3">
        {t('teamMap.rail.activeSession', { defaultValue: 'Active Session' })}
      </p>
      <button
        type="button"
        onClick={() => void handleKill()}
        disabled={killing}
        className={cn(
          'w-full rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors',
          confirmPending
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-white border border-red-200 text-red-600 hover:bg-red-50',
        )}
      >
        {killing
          ? t('teamMap.rail.killing', { defaultValue: 'Terminating...' })
          : confirmPending
            ? t('teamMap.rail.confirmKill', { defaultValue: `Confirm: terminate ${agentName}?` })
            : t('teamMap.rail.killSession', { defaultValue: 'Terminate sub-task' })}
      </button>
      {confirmPending && !killing && (
        <button
          type="button"
          onClick={() => setConfirmPending(false)}
          className="mt-2 w-full text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          {t('actions.cancel')}
        </button>
      )}
    </div>
  );
}

function RailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[24px] border border-slate-200/80 bg-slate-50/60 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      <div className="mt-4 grid gap-2.5">{children}</div>
    </section>
  );
}

function RailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors hover:bg-slate-50">
      <span className="shrink-0 text-slate-500 font-medium">{label}</span>
      <span className="min-w-0 truncate text-right text-slate-900 font-medium">{value}</span>
    </div>
  );
}

export default TeamMap;
