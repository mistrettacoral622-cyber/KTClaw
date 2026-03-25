/**
 * Task Kanban Page / Frame 05
 * 任务看板 / 自动化工作流：拖拽式任务管理
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { hostApiFetch } from '@/lib/host-api';
import { useAgentsStore } from '@/stores/agents';
import { useApprovalsStore, type ApprovalItem } from '@/stores/approvals';
import type { AgentSummary } from '@/types/agent';
import { AskUserQuestionWizard } from './AskUserQuestionWizard';

/* ─── Types ─── */

type TicketStatus = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';
type TicketPriority = 'low' | 'medium' | 'high';
type WorkState = 'idle' | 'starting' | 'working' | 'blocked' | 'waiting_approval' | 'done' | 'failed';

interface KanbanTicket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigneeId?: string;
  assigneeRole?: string;
  workState: WorkState;
  workStartedAt?: string;
  workError?: string;
  workResult?: string;
  runtimeSessionId?: string;
  runtimeParentSessionId?: string;
  runtimeRootSessionId?: string;
  runtimeDepth?: number;
  runtimeSessionKey?: string;
  runtimeTranscript?: string[];
  runtimeChildSessionIds?: string[];
  createdAt: string;
  updatedAt: string;
}

interface RuntimeSessionResponse {
  id: string;
  sessionKey?: string;
  parentSessionKey?: string;
  parentRuntimeId?: string;
  rootRuntimeId?: string;
  depth?: number;
  childRuntimeIds?: string[];
  status?: string;
  transcript?: string[];
  lastError?: string;
  error?: string;
  result?: string;
  output?: string;
}

/* ─── Persistence ─── */

const STORAGE_KEY = 'clawport-kanban';

function loadTickets(): KanbanTicket[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as KanbanTicket[]) : [];
  } catch {
    return [];
  }
}

function saveTickets(tickets: KanbanTicket[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

function createTicket(input: { title: string; description: string; priority: TicketPriority; assigneeId?: string; assigneeRole?: string }): KanbanTicket {
  const now = new Date().toISOString();
  return {
    id: `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: input.title,
    description: input.description,
    status: 'backlog',
    priority: input.priority,
    assigneeId: input.assigneeId,
    assigneeRole: input.assigneeRole,
    workState: 'idle',
    createdAt: now,
    updatedAt: now,
  };
}

/* ─── Constants ─── */

const COLUMNS: { key: TicketStatus; label: string }[] = [
  { key: 'backlog',     label: 'Backlog 积压' },
  { key: 'todo',        label: 'To Do 待办' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'review',      label: 'Review 审查' },
  { key: 'done',        label: 'Done 完成' },
];

const PRIORITY_STYLES: Record<TicketPriority, { dot: string; text: string; bg: string; label: string }> = {
  high:   { dot: '#ef4444', text: '#ef4444', bg: '#fef2f2', label: '高优' },
  medium: { dot: '#f59e0b', text: '#d97706', bg: '#fffbeb', label: '中优' },
  low:    { dot: '#10b981', text: '#059669', bg: '#f0fdf4', label: '低优' },
};

const WORK_STATE_STYLES: Record<WorkState, { label: string; color: string }> = {
  idle:     { label: '',       color: '' },
  starting: { label: 'Starting', color: '#f59e0b' },
  working:  { label: 'Working', color: '#3b82f6' },
  blocked:  { label: 'Blocked', color: '#f97316' },
  waiting_approval: { label: 'Waiting Approval', color: '#7c3aed' },
  done:     { label: 'Done', color: '#10b981' },
  failed:   { label: 'Failed',   color: '#ef4444' },
};

const ACTIVE_RUNTIME_WORK_STATES = new Set<WorkState>(['starting', 'working', 'blocked', 'waiting_approval']);
const RUNTIME_WAIT_POLL_MS = 3000;

function readRuntimeError(session: RuntimeSessionResponse): string | undefined {
  if (typeof session.lastError === 'string' && session.lastError.trim()) return session.lastError.trim();
  if (typeof session.error === 'string' && session.error.trim()) return session.error.trim();
  return undefined;
}

function readRuntimeResult(session: RuntimeSessionResponse): string | undefined {
  if (typeof session.result === 'string' && session.result.trim()) return session.result.trim();
  if (typeof session.output === 'string' && session.output.trim()) return session.output.trim();
  if (Array.isArray(session.transcript) && session.transcript.length > 0) {
    const last = session.transcript.at(-1);
    if (typeof last === 'string' && last.trim()) return last.trim();
  }
  return undefined;
}

function mapRuntimeSessionToTicketUpdates(ticket: KanbanTicket, session: RuntimeSessionResponse): Partial<KanbanTicket> {
  const status = (session.status ?? '').toLowerCase();
  const runtimeError = readRuntimeError(session);
  const runtimeResult = readRuntimeResult(session);
  const base: Partial<KanbanTicket> = {
    runtimeSessionId: session.id || ticket.runtimeSessionId,
    runtimeParentSessionId: session.parentRuntimeId || ticket.runtimeParentSessionId,
    runtimeRootSessionId: session.rootRuntimeId || ticket.runtimeRootSessionId,
    runtimeDepth: typeof session.depth === 'number' ? session.depth : ticket.runtimeDepth,
    runtimeSessionKey: session.sessionKey || ticket.runtimeSessionKey,
    runtimeTranscript: Array.isArray(session.transcript) ? session.transcript : ticket.runtimeTranscript,
    runtimeChildSessionIds: Array.isArray(session.childRuntimeIds) ? session.childRuntimeIds : ticket.runtimeChildSessionIds,
  };

  if (status === 'running') {
    return {
      ...base,
      status: 'in-progress',
      workState: 'working',
      workError: undefined,
    };
  }
  if (status === 'blocked') {
    return {
      ...base,
      status: 'in-progress',
      workState: 'blocked',
      workError: runtimeError ?? ticket.workError ?? 'Runtime blocked',
      workResult: undefined,
    };
  }
  if (status === 'waiting_approval') {
    return {
      ...base,
      status: 'review',
      workState: 'waiting_approval',
      workError: runtimeError ?? ticket.workError ?? 'Waiting for approval',
      workResult: undefined,
    };
  }
  if (status === 'completed') {
    return {
      ...base,
      status: 'review',
      workState: 'done',
      workError: undefined,
      workResult: runtimeResult ?? ticket.workResult,
    };
  }
  if (status === 'error') {
    return {
      ...base,
      workState: 'failed',
      workError: runtimeError ?? ticket.workError ?? 'Runtime error',
    };
  }
  if (status === 'killed') {
    return {
      ...base,
      workState: 'failed',
      workError: runtimeError ?? ticket.workError ?? 'Runtime killed',
    };
  }
  if (status === 'stopped') {
    return {
      ...base,
      workState: 'failed',
      workError: runtimeError ?? ticket.workError ?? 'Runtime stopped',
    };
  }

  return base;
}

function isSameTranscript(a?: string[], b?: string[]): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function hasRuntimeTicketChanges(ticket: KanbanTicket, updates: Partial<KanbanTicket>): boolean {
  if ('status' in updates && updates.status !== ticket.status) return true;
  if ('workState' in updates && updates.workState !== ticket.workState) return true;
  if ('workError' in updates && updates.workError !== ticket.workError) return true;
  if ('workResult' in updates && updates.workResult !== ticket.workResult) return true;
  if ('runtimeSessionId' in updates && updates.runtimeSessionId !== ticket.runtimeSessionId) return true;
  if ('runtimeParentSessionId' in updates && updates.runtimeParentSessionId !== ticket.runtimeParentSessionId) return true;
  if ('runtimeRootSessionId' in updates && updates.runtimeRootSessionId !== ticket.runtimeRootSessionId) return true;
  if ('runtimeDepth' in updates && updates.runtimeDepth !== ticket.runtimeDepth) return true;
  if ('runtimeSessionKey' in updates && updates.runtimeSessionKey !== ticket.runtimeSessionKey) return true;
  if ('runtimeTranscript' in updates && !isSameTranscript(ticket.runtimeTranscript, updates.runtimeTranscript)) return true;
  if ('runtimeChildSessionIds' in updates && !isSameTranscript(ticket.runtimeChildSessionIds, updates.runtimeChildSessionIds)) return true;
  return false;
}

function getApprovalsForTicket(ticket: KanbanTicket, approvals: ApprovalItem[]): ApprovalItem[] {
  return approvals.filter((approval) => {
    if (ticket.runtimeSessionKey && approval.sessionKey) {
      return approval.sessionKey === ticket.runtimeSessionKey;
    }
    if (ticket.assigneeId && approval.agentId) {
      return approval.agentId === ticket.assigneeId;
    }
    return false;
  });
}

/* ─── Agent color helper ─── */

const AGENT_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f97316', '#ef4444', '#06b6d4'];
function agentColor(idx: number) { return AGENT_COLORS[idx % AGENT_COLORS.length]; }

/* ─── Main component ─── */

export function TaskKanban() {
  const [tickets, setTickets] = useState<KanbanTicket[]>(() => loadTickets());
  const [filterAgentId, setFilterAgentId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTicket, setDetailTicket] = useState<KanbanTicket | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TicketStatus | null>(null);

  const { agents, fetchAgents } = useAgentsStore();
  const { approvals, fetchApprovals, approveItem, rejectItem } = useApprovalsStore();

  useEffect(() => { void fetchAgents(); }, [fetchAgents]);
  useEffect(() => { void fetchApprovals(); }, [fetchApprovals]);

  // Persist on every change
  useEffect(() => { saveTickets(tickets); }, [tickets]);

  const updateTicket = useCallback((id: string, updates: Partial<KanbanTicket>) => {
    setTickets((prev) =>
      prev.map((t) => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t)
    );
    if (detailTicket?.id === id) {
      setDetailTicket((prev) => prev ? { ...prev, ...updates, updatedAt: new Date().toISOString() } : prev);
    }
  }, [detailTicket?.id]);

  const deleteTicket = (id: string) => {
    setTickets((prev) => prev.filter((t) => t.id !== id));
    if (detailTicket?.id === id) setDetailTicket(null);
  };

  const moveTicket = (id: string, status: TicketStatus) => {
    updateTicket(id, { status });
  };

  const handleCreate = (input: { title: string; description: string; priority: TicketPriority; assigneeId?: string; assigneeRole?: string }) => {
    const ticket = createTicket(input);
    setTickets((prev) => [ticket, ...prev]);
    setCreateOpen(false);
  };

  useEffect(() => {
    const activeTickets = tickets.filter((ticket) => {
      if (!ticket.runtimeSessionId) return false;
      return ACTIVE_RUNTIME_WORK_STATES.has(ticket.workState);
    });
    if (activeTickets.length === 0) return undefined;

    let disposed = false;
    const pollRuntime = async () => {
      for (const ticket of activeTickets) {
        if (!ticket.runtimeSessionId) continue;
        try {
          const response = await hostApiFetch<{
            success: boolean;
            session: RuntimeSessionResponse;
          }>(`/api/sessions/subagents/${encodeURIComponent(ticket.runtimeSessionId)}/wait`, {
            method: 'POST',
          });
          if (disposed || !response?.session) continue;
          const runtimeUpdates = mapRuntimeSessionToTicketUpdates(ticket, response.session);
          if (hasRuntimeTicketChanges(ticket, runtimeUpdates)) {
            updateTicket(ticket.id, runtimeUpdates);
          }
        } catch (error) {
          if (disposed) continue;
          const runtimeUpdates: Partial<KanbanTicket> = {
            workState: 'failed',
            workError: String(error),
          };
          if (hasRuntimeTicketChanges(ticket, runtimeUpdates)) {
            updateTicket(ticket.id, runtimeUpdates);
          }
        }
      }
    };

    const timer = window.setInterval(() => {
      void pollRuntime();
    }, RUNTIME_WAIT_POLL_MS);

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [tickets, updateTicket]);

  const startRuntimeWork = async (ticket: KanbanTicket) => {
    updateTicket(ticket.id, {
      status: 'in-progress',
      workState: 'starting',
      workError: undefined,
      workResult: undefined,
      workStartedAt: new Date().toISOString(),
    });

    try {
      const response = await hostApiFetch<{
        success: boolean;
        session: RuntimeSessionResponse;
      }>('/api/sessions/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentSessionKey: `agent:${ticket.assigneeId ?? 'main'}:main`,
          ...(ticket.runtimeSessionId ? { parentRuntimeId: ticket.runtimeSessionId } : {}),
          agentName: ticket.assigneeRole ?? ticket.assigneeId,
          prompt: [ticket.title, ticket.description].filter(Boolean).join('\n\n'),
          mode: 'session',
        }),
      });

      updateTicket(ticket.id, mapRuntimeSessionToTicketUpdates(ticket, response.session));
    } catch (error) {
      updateTicket(ticket.id, {
        workState: 'failed',
        workError: String(error),
      });
    }
  };

  const steerRuntimeWork = async (ticket: KanbanTicket, input: string) => {
    if (!ticket.runtimeSessionId || !input.trim()) return;
    try {
      const response = await hostApiFetch<{
        success: boolean;
        session: RuntimeSessionResponse;
      }>(`/api/sessions/subagents/${encodeURIComponent(ticket.runtimeSessionId)}/steer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim() }),
      });

      const runtimeUpdates = mapRuntimeSessionToTicketUpdates(ticket, response.session);
      updateTicket(ticket.id, runtimeUpdates);
    } catch (error) {
      updateTicket(ticket.id, {
        workError: String(error),
      });
    }
  };

  const stopRuntimeWork = async (ticket: KanbanTicket) => {
    if (!ticket.runtimeSessionId) return;
    try {
      const response = await hostApiFetch<{
        success: boolean;
        session: RuntimeSessionResponse;
      }>(`/api/sessions/subagents/${encodeURIComponent(ticket.runtimeSessionId)}/kill`, {
        method: 'POST',
      });

      const runtimeUpdates = mapRuntimeSessionToTicketUpdates(ticket, response.session);
      updateTicket(ticket.id, {
        ...runtimeUpdates,
        workState: runtimeUpdates.workState ?? 'failed',
        workError: runtimeUpdates.workError ?? 'Manually stopped',
      });
    } catch (error) {
      updateTicket(ticket.id, {
        workError: String(error),
      });
    }
  };

  /* Drag handlers */
  const handleDragStart = (id: string) => setDragId(id);
  const handleDragEnd = () => { setDragId(null); setDragOverCol(null); };
  const handleDrop = (col: TicketStatus) => {
    if (dragId) moveTicket(dragId, col);
    setDragId(null);
    setDragOverCol(null);
  };

  const filtered = filterAgentId
    ? tickets.filter((t) => t.assigneeId === filterAgentId)
    : tickets;

  const activeCount = tickets.filter((t) => t.status !== 'done').length;

  return (
    <div className="flex h-full flex-col bg-[#f2f2f7] p-6">
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">

        {/* Header */}
        <div className="flex shrink-0 items-start justify-between px-8 pb-5 pt-8">
          <div>
            <h1 className="text-[26px] font-semibold text-[#000000]">任务看板 Kanban</h1>
            <p className="mt-1 text-[13px] text-[#8e8e93]">{activeCount} active tasks</p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#ef4444] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#dc2626]"
          >
            + 新建任务
          </button>
        </div>

        {/* Pending Approvals */}
        {approvals.length > 0 && (
          <ApprovalsSection
            approvals={approvals}
            onApprove={(id, reason) => void approveItem(id, reason)}
            onReject={(id, reason) => void rejectItem(id, reason)}
          />
        )}

        {/* Agent filter pills */}
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto px-8 pb-5">
          <button
            type="button"
            onClick={() => setFilterAgentId(null)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors',
              filterAgentId === null
                ? 'bg-[#10b981] text-white'
                : 'border border-black/10 bg-white text-[#3c3c43] hover:bg-[#f2f2f7]',
            )}
          >
            全部任务
          </button>
          {agents.map((agent, idx) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => setFilterAgentId(agent.id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                filterAgentId === agent.id
                  ? 'bg-[#10b981] text-white'
                  : 'border border-black/10 bg-white text-[#3c3c43] hover:bg-[#f2f2f7]',
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: agentColor(idx) }} />
              {agent.name}
            </button>
          ))}
        </div>

        {/* Kanban columns */}
        <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto px-8 pb-6">
          {COLUMNS.map((col) => {
            const colTickets = filtered.filter((t) => t.status === col.key);
            const isOver = dragOverCol === col.key;
            return (
              <div
                key={col.key}
                className="flex w-[280px] shrink-0 flex-col"
                onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key); }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={() => handleDrop(col.key)}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-[#000000]">{col.label}</span>
                  <span className="text-[13px] text-[#8e8e93]">{colTickets.length}</span>
                </div>
                <div className={cn(
                  'flex min-h-[120px] flex-1 flex-col gap-3 rounded-xl p-3 transition-colors',
                  isOver ? 'bg-[#f0f7ff] ring-2 ring-clawx-ac/30' : 'bg-[#f9f9f9]',
                )}>
                  {colTickets.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-[13px] text-[#c6c6c8]">
                      拖拽到此处                    </div>
                  ) : (
                    colTickets.map((ticket) => (
                      <TicketCard
                        key={ticket.id}
                        ticket={ticket}
                        agents={agents}
                        isDragging={dragId === ticket.id}
                        onClick={() => setDetailTicket(ticket)}
                        onDragStart={() => handleDragStart(ticket.id)}
                        onDragEnd={handleDragEnd}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create modal */}
      {createOpen && (
        <CreateModal
          agents={agents}
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreate}
        />
      )}

      {/* Detail panel */}
      {detailTicket && (
        <DetailPanel
          ticket={detailTicket}
          agents={agents}
          approvals={getApprovalsForTicket(detailTicket, approvals)}
          onClose={() => setDetailTicket(null)}
          onUpdate={(updates) => updateTicket(detailTicket.id, updates)}
          onDelete={() => deleteTicket(detailTicket.id)}
          onStartRuntime={() => void startRuntimeWork(detailTicket)}
          onSteerRuntime={(input) => void steerRuntimeWork(detailTicket, input)}
          onStopRuntime={() => void stopRuntimeWork(detailTicket)}
          onApproveApproval={(id, reason) => void approveItem(id, reason)}
          onRejectApproval={(id, reason) => void rejectItem(id, reason)}
        />
      )}
    </div>
  );
}

/* ─── Ticket Card ─── */

function TicketCard({
  ticket, agents, isDragging, onClick, onDragStart, onDragEnd,
}: {
  ticket: KanbanTicket;
  agents: AgentSummary[];
  isDragging: boolean;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const p = PRIORITY_STYLES[ticket.priority];
  const agentIdx = agents.findIndex((a) => a.id === ticket.assigneeId);
  const agent = agentIdx >= 0 ? agents[agentIdx] : null;
  const color = agent ? agentColor(agentIdx) : '#8e8e93';
  const ws = WORK_STATE_STYLES[ticket.workState];
  const isDragLocked = ACTIVE_RUNTIME_WORK_STATES.has(ticket.workState);

  return (
    <div
      data-testid={`ticket-card-${ticket.id}`}
      draggable={!isDragLocked}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-xl bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]',
        isDragging && 'opacity-40 scale-95',
      )}
      style={{ borderLeft: `3px solid ${color}` }}
    >
      {agent && (
        <div className="mb-2 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          <span className="text-[12px] font-medium" style={{ color }}>{agent.name}</span>
        </div>
      )}
      {ticket.assigneeRole && (
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[#6b7280]">
          {ticket.assigneeRole}
        </div>
      )}
      <p className="mb-1 text-[14px] font-semibold leading-snug text-[#000000]">{ticket.title}</p>
      {ticket.description && (
        <p className="mb-3 line-clamp-2 text-[12px] leading-snug text-[#8e8e93]">{ticket.description}</p>
      )}
      <div className="flex items-center justify-between">
        <span
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{ background: p.bg, color: p.text }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.dot }} />
          {p.label}
        </span>
        {ws.label && (
          <span className="text-[11px] font-medium" style={{ color: ws.color }}>{ws.label}</span>
        )}
      </div>
    </div>
  );
}

/* ─── Create Modal ─── */

function CreateModal({
  agents, onClose, onCreate,
}: {
  agents: AgentSummary[];
  onClose: () => void;
  onCreate: (input: { title: string; description: string; priority: TicketPriority; assigneeId?: string; assigneeRole?: string }) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [assigneeRole, setAssigneeRole] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      description: description.trim(),
      priority,
      assigneeId: assigneeId || undefined,
      assigneeRole: assigneeRole.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-[420px] rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-[16px] font-semibold text-[#000000]">新建任务</h2>
        <div className="mb-3">
          <p className="mb-1.5 text-[13px] font-medium text-[#000000]">任务标题</p>
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={() => {
              isComposingRef.current = false;
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              const nativeEvent = e.nativeEvent as KeyboardEvent;
              const syntheticIsComposing = (e as unknown as { isComposing?: boolean }).isComposing === true;
              if (
                isComposingRef.current
                || syntheticIsComposing
                || nativeEvent.isComposing
                || nativeEvent.keyCode === 229
              ) {
                return;
              }
              e.preventDefault();
              handleSubmit();
            }}
            placeholder="简短描述任务目标..."
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-[13px] outline-none focus:border-clawx-ac"
          />
        </div>
        <div className="mb-3">
          <p className="mb-1.5 text-[13px] font-medium text-[#000000]">任务描述</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="详细说明..."
            rows={3}
            className="w-full resize-none rounded-lg border border-black/10 px-3 py-2 text-[13px] outline-none focus:border-clawx-ac"
          />
        </div>
        <div className="mb-3">
          <p className="mb-1.5 text-[13px] font-medium text-[#000000]">Priority</p>
          <div className="flex gap-2">
            {(['high', 'medium', 'low'] as TicketPriority[]).map((p) => {
              const s = PRIORITY_STYLES[p];
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    'flex-1 rounded-lg border py-1.5 text-[13px] font-medium transition-colors',
                    priority === p ? 'border-transparent' : 'border-black/10 bg-white',
                  )}
                  style={priority === p ? { background: s.bg, color: s.text, borderColor: s.dot } : { color: s.text }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
        {agents.length > 0 && (
          <div className="mb-5">
            <p className="mb-1.5 text-[13px] font-medium text-[#000000]">指派 Agent</p>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full appearance-none rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] text-[#000000] outline-none focus:border-clawx-ac"
            >
              <option value="">Unassigned</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="mb-5">
          <p className="mb-1.5 text-[13px] font-medium text-[#000000]">Assignee Role</p>
          <input
            value={assigneeRole}
            onChange={(e) => setAssigneeRole(e.target.value)}
            placeholder="例如：planner / reviewer / operator"
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-[13px] outline-none focus:border-clawx-ac"
          />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-black/10 py-2 text-[13px] text-[#3c3c43] hover:bg-[#f2f2f7]">取消</button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="flex-1 rounded-xl bg-[#ef4444] py-2 text-[13px] font-medium text-white hover:bg-[#dc2626] disabled:opacity-50"
          >
            创建任务
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Detail Panel ─── */

function DetailPanel({
  ticket, agents, approvals, onClose, onUpdate, onDelete,
  onStartRuntime,
  onSteerRuntime,
  onStopRuntime,
  onApproveApproval,
  onRejectApproval,
}: {
  ticket: KanbanTicket;
  agents: AgentSummary[];
  approvals: ApprovalItem[];
  onClose: () => void;
  onUpdate: (updates: Partial<KanbanTicket>) => void;
  onDelete: () => void;
  onStartRuntime: () => void;
  onSteerRuntime: (input: string) => void;
  onStopRuntime: () => void;
  onApproveApproval: (id: string, reason?: string) => void;
  onRejectApproval: (id: string, reason: string) => void;
}) {
  const agentIdx = agents.findIndex((a) => a.id === ticket.assigneeId);
  const agent = agentIdx >= 0 ? agents[agentIdx] : null;
  const color = agent ? agentColor(agentIdx) : '#8e8e93';
  const p = PRIORITY_STYLES[ticket.priority];
  const [followup, setFollowup] = useState('');
  const [wizard, setWizard] = useState<ApprovalItem | null>(null);
  const [reviewing, setReviewing] = useState<ApprovalItem | null>(null);
  const reviewText = reviewing?.toolInput
    ? JSON.stringify(reviewing.toolInput, null, 2)
    : (reviewing?.prompt ?? '');
  const riskPreview = reviewText.toLowerCase();
  const isDangerous = ['rm -rf', 'sudo', 'del ', 'format ', 'powershell -command remove-item'].some((token) => riskPreview.includes(token));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/20" onClick={onClose}>
      <div
        className="flex h-full w-[380px] flex-col bg-white shadow-[-4px_0_24px_rgba(0,0,0,0.08)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-black/[0.06] px-5 py-4">
          <span className="text-[14px] font-semibold text-[#000000]">任务详情</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDelete}
              className="rounded-md border border-[#ef4444]/20 px-2.5 py-1 text-[12px] text-[#ef4444] hover:bg-[#fef2f2]"
            >
              删除
            </button>
            <button type="button" onClick={onClose} className="text-[18px] text-[#8e8e93] hover:text-[#3c3c43]">×</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#8e8e93]">标题</p>
            <p className="text-[15px] font-semibold text-[#000000]">{ticket.title}</p>
          </div>

          {ticket.description && (
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#8e8e93]">描述</p>
              <p className="text-[13px] leading-relaxed text-[#3c3c43]">{ticket.description}</p>
            </div>
          )}

          <div className="flex gap-4">
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#8e8e93]">Priority</p>
              <span
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium"
                style={{ background: p.bg, color: p.text }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.dot }} />
                {p.label}
              </span>
            </div>
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#8e8e93]">Status</p>
              <span className="text-[13px] text-[#3c3c43]">
                {COLUMNS.find((c) => c.key === ticket.status)?.label ?? ticket.status}
              </span>
            </div>
          </div>

          {agent && (
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#8e8e93]">指派 Agent</p>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                <span className="text-[13px] font-medium" style={{ color }}>{agent.name}</span>
              </div>
            </div>
          )}

          {ticket.assigneeRole && (
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#8e8e93]">Assignee Role</p>
              <p className="text-[13px] font-medium text-[#3c3c43]">{ticket.assigneeRole}</p>
            </div>
          )}

          {ticket.workState !== 'idle' && (
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#8e8e93]">Execution</p>
              <span className="text-[13px] font-medium" style={{ color: WORK_STATE_STYLES[ticket.workState].color }}>
                {WORK_STATE_STYLES[ticket.workState].label}
              </span>
              {ticket.workError && (
                <p className="mt-1 text-[12px] text-[#ef4444]">{ticket.workError}</p>
              )}
              {ticket.workResult && (
                <p className="mt-1 text-[12px] text-[#3c3c43]">{ticket.workResult}</p>
              )}
              {ACTIVE_RUNTIME_WORK_STATES.has(ticket.workState) && (
                <p className="mt-2 text-[12px] text-[#8e8e93]">运行中任务不可拖拽，等待 runtime 返回结果后再移动状态。</p>
              )}
            </div>
          )}

          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[#8e8e93]">Runtime</p>
            {ticket.runtimeSessionId ? (
              <>
                <div className="mb-2 rounded-lg bg-[#f8fafc] px-3 py-2 text-[12px] text-[#475467]">
                  Session: {ticket.runtimeSessionId}
                </div>
                {ticket.runtimeSessionKey && (
                  <div className="mb-2 rounded-lg bg-[#f8fafc] px-3 py-2 text-[12px] text-[#475467]">
                    Session key: {ticket.runtimeSessionKey}
                  </div>
                )}
                {ticket.runtimeParentSessionId && (
                  <div className="mb-2 rounded-lg bg-[#f8fafc] px-3 py-2 text-[12px] text-[#475467]">
                    Parent run: {ticket.runtimeParentSessionId}
                    {typeof ticket.runtimeDepth === 'number' ? ` · Depth ${ticket.runtimeDepth}` : ''}
                  </div>
                )}
                {ticket.runtimeChildSessionIds && ticket.runtimeChildSessionIds.length > 0 && (
                  <div className="mb-2 rounded-lg bg-[#f8fafc] px-3 py-2 text-[12px] text-[#475467]">
                    Child runs: {ticket.runtimeChildSessionIds.length}
                  </div>
                )}
                <div className="mb-3 rounded-xl border border-black/[0.06] bg-[#fafafa] px-3 py-3">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[#8e8e93]">Transcript</p>
                  <div className="flex flex-col gap-2">
                    {(ticket.runtimeTranscript ?? []).map((entry, index) => (
                      <div key={`${ticket.runtimeSessionId}-${index}`} className="rounded-lg bg-white px-3 py-2 text-[12px] text-[#3c3c43] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                        {entry}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mb-2 flex gap-2">
                  <input
                    aria-label="Follow-up message"
                    value={followup}
                    onChange={(e) => setFollowup(e.target.value)}
                    placeholder="继续追问这个 ticket..."
                    className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-[13px] outline-none focus:border-clawx-ac"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onSteerRuntime(followup);
                      setFollowup('');
                    }}
                    disabled={!followup.trim()}
                    className="rounded-lg bg-clawx-ac px-3 py-2 text-[12px] font-medium text-white hover:bg-[#0056b3] disabled:opacity-50"
                  >
                    Send follow-up
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onStopRuntime}
                    className="rounded-lg border border-[#ef4444]/20 px-3 py-2 text-[12px] text-[#ef4444] hover:bg-[#fef2f2]"
                  >
                    Stop runtime
                  </button>
                  <button
                    type="button"
                    onClick={onStartRuntime}
                    className="rounded-lg border border-black/10 px-3 py-2 text-[12px] text-[#3c3c43] hover:bg-[#f2f2f7]"
                  >
                    Retry work
                  </button>
                </div>

                {approvals.length > 0 && (
                  <div data-testid="ticket-runtime-approvals" className="mt-3 rounded-xl border border-[#f59e0b]/30 bg-[#fffbeb] px-3 py-3">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[#8e8e93]">Runtime approvals</p>
                    <div className="flex flex-col gap-2">
                      {approvals.map((approval) => (
                        <div key={approval.id} className="rounded-lg bg-white px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[12px] font-medium text-[#111827]">
                                {approval.command ?? approval.prompt ?? approval.id}
                              </p>
                              {approval.requestedAt || approval.createdAt ? (
                                <p className="mt-1 text-[11px] text-[#8e8e93]">
                                  {new Date(approval.requestedAt ?? approval.createdAt ?? '').toLocaleString('zh-CN')}
                                </p>
                              ) : null}
                            </div>
                            {approval.command === 'AskUserQuestion' ? (
                              <button
                                type="button"
                                onClick={() => setWizard(approval)}
                                className="rounded-lg bg-clawx-ac px-2.5 py-1 text-[12px] font-medium text-white hover:bg-[#005fd6]"
                              >
                                Respond
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setReviewing(approval)}
                                className="rounded-lg bg-[#111827] px-2.5 py-1 text-[12px] font-medium text-white hover:bg-[#1f2937]"
                              >
                                Review
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onStartRuntime}
                  className="rounded-lg bg-clawx-ac px-3 py-2 text-[12px] font-medium text-white hover:bg-[#0056b3]"
                >
                  Start work
                </button>
                <span className="text-[12px] text-[#8e8e93]">启动一个 runtime session 让 agent 开始处理这个 ticket。</span>
              </div>
            )}
          </div>

          {/* Move to column */}
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[#8e8e93]">Move To</p>
            <div className="flex flex-wrap gap-2">
              {COLUMNS.filter((c) => c.key !== ticket.status).map((col) => (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => onUpdate({ status: col.key })}
                  className="rounded-lg border border-black/10 px-3 py-1.5 text-[12px] text-[#3c3c43] hover:bg-[#f2f2f7]"
                >
                  {col.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {wizard && (
        <AskUserQuestionWizard
          approval={wizard}
          onRespond={(answers) => {
            onApproveApproval(wizard.id, JSON.stringify(answers));
            setWizard(null);
          }}
          onDismiss={() => setWizard(null)}
        />
      )}

      {reviewing && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/35" role="dialog" aria-label="Approval review">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-semibold text-[#111827]">Tool approval review</h3>
                <p className="mt-1 text-[12px] text-[#6b7280]">Agent: {reviewing.agentId ?? 'unknown'} · Command: {reviewing.command ?? 'unknown'}</p>
              </div>
              <button type="button" onClick={() => setReviewing(null)} className="text-[18px] text-[#8e8e93] hover:text-[#3c3c43]">×</button>
            </div>

            {isDangerous && (
              <div className="mb-4 rounded-xl border border-[#fca5a5] bg-[#fef2f2] px-4 py-3 text-[13px] text-[#b91c1c]">
                危险操作：当前审批包含高风险命令，请确认后再放行。
              </div>
            )}

            {reviewing.prompt ? (
              <div className="mb-3">
                <p className="mb-1 text-[12px] font-medium text-[#6b7280]">Prompt</p>
                <div className="rounded-xl bg-[#f8fafc] px-4 py-3 text-[13px] text-[#374151]">{reviewing.prompt}</div>
              </div>
            ) : null}

            <div className="mb-5">
              <p className="mb-1 text-[12px] font-medium text-[#6b7280]">Tool input</p>
              <pre className="overflow-x-auto rounded-xl bg-[#111827] px-4 py-3 text-[12px] text-[#e5e7eb]">{reviewText || '(empty)'}</pre>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewing(null)}
                className="rounded-lg border border-black/10 px-3 py-2 text-[13px] text-[#3c3c43] hover:bg-[#f2f2f7]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onApproveApproval(reviewing.id);
                  setReviewing(null);
                }}
                className="rounded-lg bg-[#10b981] px-3 py-2 text-[13px] font-medium text-white hover:bg-[#059669]"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => {
                  onRejectApproval(reviewing.id, 'Rejected from ticket detail');
                  setReviewing(null);
                }}
                className="rounded-lg border border-[#ef4444]/30 px-3 py-2 text-[13px] text-[#ef4444] hover:bg-[#fef2f2]"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskKanban;

/* ─── Approvals Section ─── */


function ApprovalsSection({
  approvals,
  onApprove,
  onReject,
}: {
  approvals: ApprovalItem[];
  onApprove: (id: string, reason?: string) => void;
  onReject: (id: string, reason: string) => void;
}) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [wizard, setWizard] = useState<ApprovalItem | null>(null);
  const [reviewing, setReviewing] = useState<ApprovalItem | null>(null);

  const reviewText = reviewing?.toolInput
    ? JSON.stringify(reviewing.toolInput, null, 2)
    : (reviewing?.prompt ?? '');
  const riskPreview = reviewText.toLowerCase();
  const isDangerous = ['rm -rf', 'sudo', 'del ', 'format ', 'powershell -command remove-item'].some((token) => riskPreview.includes(token));

  return (
    <>
      <div className="shrink-0 border-b border-black/[0.06] px-8 pb-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f59e0b] text-[11px] font-bold text-white">
            {approvals.length}
          </span>
          <span className="text-[13px] font-semibold text-[#000000]">Pending Approvals</span>
        </div>
        <div className="flex flex-col gap-2">
          {approvals.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-4 rounded-xl border border-[#f59e0b]/30 bg-[#fffbeb] px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-[#000000]">
                  {item.command ?? item.prompt ?? item.id}
                </p>
                {item.agentId && (
                  <p className="mt-0.5 text-[11px] text-[#8e8e93]">Agent: {item.agentId}</p>
                )}
                {(item.createdAt ?? item.requestedAt) && (
                  <p className="mt-0.5 text-[11px] text-[#8e8e93]">
                    {new Date(item.createdAt ?? item.requestedAt ?? '').toLocaleString('zh-CN')}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {item.command === 'AskUserQuestion' ? (
                  <button
                    type="button"
                    onClick={() => setWizard(item)}
                    className="rounded-lg bg-clawx-ac px-2.5 py-1 text-[12px] font-medium text-white hover:bg-[#005fd6]"
                  >
                    Respond
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setReviewing(item)}
                    className="rounded-lg bg-[#111827] px-2.5 py-1 text-[12px] font-medium text-white hover:bg-[#1f2937]"
                  >
                    Review
                  </button>
                )}
                {item.command === 'AskUserQuestion' ? null : rejectingId === item.id ? (
                  <>
                    <input
                      autoFocus
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="拒绝原因..."
                      className="w-[140px] rounded-lg border border-black/10 px-2 py-1 text-[12px] outline-none focus:border-clawx-ac"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (rejectReason.trim()) {
                          onReject(item.id, rejectReason.trim());
                          setRejectingId(null);
                          setRejectReason('');
                        }
                      }}
                      className="rounded-lg bg-[#ef4444] px-2.5 py-1 text-[12px] font-medium text-white hover:bg-[#dc2626]"
                    >
                      确认
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRejectingId(null); setRejectReason(''); }}
                      className="rounded-lg border border-black/10 px-2.5 py-1 text-[12px] text-[#3c3c43] hover:bg-[#f2f2f7]"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setRejectingId(item.id)}
                      className="rounded-lg border border-[#ef4444]/30 px-2.5 py-1 text-[12px] text-[#ef4444] hover:bg-[#fef2f2]"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {wizard && (
        <AskUserQuestionWizard
          approval={wizard}
          onRespond={(answers) => {
            onApprove(wizard.id, JSON.stringify(answers));
            setWizard(null);
          }}
          onDismiss={() => setWizard(null)}
        />
      )}

      {reviewing && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/35" role="dialog" aria-label="Approval review">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-semibold text-[#111827]">Tool approval review</h3>
                <p className="mt-1 text-[12px] text-[#6b7280]">Agent: {reviewing.agentId ?? 'unknown'} · Command: {reviewing.command ?? 'unknown'}</p>
              </div>
              <button type="button" onClick={() => setReviewing(null)} className="text-[18px] text-[#8e8e93] hover:text-[#3c3c43]">×</button>
            </div>

            {isDangerous && (
              <div className="mb-4 rounded-xl border border-[#fca5a5] bg-[#fef2f2] px-4 py-3 text-[13px] text-[#b91c1c]">
                危险操作：当前审批包含高风险命令，请确认后再放行。
              </div>
            )}

            {reviewing.prompt ? (
              <div className="mb-3">
                <p className="mb-1 text-[12px] font-medium text-[#6b7280]">Prompt</p>
                <div className="rounded-xl bg-[#f8fafc] px-4 py-3 text-[13px] text-[#374151]">{reviewing.prompt}</div>
              </div>
            ) : null}

            <div className="mb-5">
              <p className="mb-1 text-[12px] font-medium text-[#6b7280]">Tool input</p>
              <pre className="overflow-x-auto rounded-xl bg-[#111827] px-4 py-3 text-[12px] text-[#e5e7eb]">{reviewText || '(empty)'}</pre>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewing(null)}
                className="rounded-lg border border-black/10 px-3 py-2 text-[13px] text-[#3c3c43] hover:bg-[#f2f2f7]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onApprove(reviewing.id);
                  setReviewing(null);
                }}
                className="rounded-lg bg-[#10b981] px-3 py-2 text-[13px] font-medium text-white hover:bg-[#059669]"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
