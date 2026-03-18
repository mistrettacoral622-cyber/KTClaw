/**
 * Task Kanban Page — Frame 05
 * 任务看板 / 自动化工作流：拖拽式任务管理
 */
import { useState } from 'react';
import { cn } from '@/lib/utils';

type Priority = '高优' | '中优' | '低优';
type Column = 'backlog' | 'todo' | 'inprogress' | 'review' | 'done';

interface Task {
  id: string;
  agent: { icon: string; name: string; color: string };
  title: string;
  desc: string;
  priority: Priority;
  time: string;
  column: Column;
}

const TASKS: Task[] = [
  {
    id: '1',
    agent: { icon: '🔍', name: '沉思小助手', color: '#3b82f6' },
    title: '整理 Q2 技术债务清单',
    desc: '收集过去 3 个 Sprint 的 TODO 注释',
    priority: '中优',
    time: '刚刚',
    column: 'backlog',
  },
  {
    id: '2',
    agent: { icon: '✦', name: 'KTClaw主脑', color: '#10b981' },
    title: '调研 OpenClaw Reddit 用户痛点',
    desc: '提取简报并生成报告',
    priority: '中优',
    time: '刚刚',
    column: 'backlog',
  },
  {
    id: '3',
    agent: { icon: '✦', name: 'KTClaw主脑', color: '#10b981' },
    title: '编写本地内存测试',
    desc: 'Lead Dev',
    priority: '高优',
    time: '3天前',
    column: 'backlog',
  },
  {
    id: '4',
    agent: { icon: '✦', name: 'KTClaw', color: '#10b981' },
    title: '发布 v1.0',
    desc: '团队内部评审',
    priority: '中优',
    time: '1天前',
    column: 'review',
  },
];

const COLUMNS: { key: Column; label: string }[] = [
  { key: 'backlog', label: 'Backlog 积压' },
  { key: 'todo', label: 'To Do 待办' },
  { key: 'inprogress', label: 'In Progress 进行中' },
  { key: 'review', label: 'Review 审查' },
  { key: 'done', label: 'Done 完成' },
];

const PRIORITY_STYLES: Record<Priority, { dot: string; text: string; bg: string }> = {
  高优: { dot: '#ef4444', text: '#ef4444', bg: '#fef2f2' },
  中优: { dot: '#f59e0b', text: '#d97706', bg: '#fffbeb' },
  低优: { dot: '#10b981', text: '#059669', bg: '#f0fdf4' },
};

const AGENT_FILTERS = [
  { label: '全部任务', icon: null },
  { label: 'KTClaw', icon: '✦' },
  { label: '沉思小助手', icon: '🔍' },
  { label: 'Monkey', icon: '🤖' },
];

export function TaskKanban() {
  const [activeFilter, setActiveFilter] = useState('全部任务');

  const filteredTasks = TASKS.filter(
    (t) =>
      activeFilter === '全部任务' ||
      t.agent.name === activeFilter ||
      t.agent.name.startsWith(activeFilter),
  );

  const activeCount = TASKS.length;

  return (
    <div className="-m-6 flex min-h-[calc(100vh-2.5rem)] flex-col bg-[#f2f2f7] p-6">
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">

        {/* Header */}
        <div className="flex shrink-0 items-start justify-between px-8 pb-5 pt-8">
          <div>
            <h1 className="text-[26px] font-semibold text-[#000000]">任务看板 Kanban</h1>
            <p className="mt-1 text-[13px] text-[#8e8e93]">{activeCount} 个活跃任务</p>
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg bg-[#ef4444] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#dc2626]"
          >
            + 新建任务
          </button>
        </div>

        {/* Filter pills */}
        <div className="flex shrink-0 items-center gap-2 px-8 pb-5">
          {AGENT_FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={() => setActiveFilter(f.label)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                activeFilter === f.label
                  ? 'bg-[#10b981] text-white'
                  : 'border border-black/10 bg-white text-[#3c3c43] hover:bg-[#f2f2f7]',
              )}
            >
              {f.icon && <span className="text-[12px]">{f.icon}</span>}
              {f.label}
            </button>
          ))}
        </div>

        {/* Kanban columns */}
        <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto px-8 pb-6">
          {COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.column === col.key);
            return (
              <div key={col.key} className="flex w-[280px] shrink-0 flex-col">
                {/* Column header */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-[#000000]">{col.label}</span>
                  <span className="text-[13px] text-[#8e8e93]">{colTasks.length}</span>
                </div>

                {/* Column body */}
                <div className="flex min-h-[120px] flex-1 flex-col gap-3 rounded-xl bg-[#f9f9f9] p-3">
                  {colTasks.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-[13px] text-[#8e8e93]">
                      No tickets
                    </div>
                  ) : (
                    colTasks.map((task) => <TaskCard key={task.id} task={task} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollbar indicator */}
        <div className="shrink-0 px-8 pb-4">
          <div className="h-[6px] rounded-full bg-[#e5e5ea]">
            <div className="h-[6px] w-2/5 rounded-full bg-[#8e8e93]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const p = PRIORITY_STYLES[task.priority];

  return (
    <div
      className="cursor-pointer rounded-xl bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
      style={{ borderLeft: `3px solid ${task.agent.color}` }}
    >
      {/* Agent label */}
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-[12px]" style={{ color: task.agent.color }}>
          {task.agent.icon}
        </span>
        <span className="text-[12px] font-medium" style={{ color: task.agent.color }}>
          {task.agent.name}
        </span>
      </div>

      {/* Title */}
      <p className="mb-1 text-[14px] font-semibold leading-snug text-[#000000]">{task.title}</p>

      {/* Desc */}
      <p className="mb-3 text-[12px] leading-snug text-[#8e8e93]">{task.desc}</p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{ background: p.bg, color: p.text }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.dot }} />
          {task.priority}
        </span>
        <span className="text-[11px] text-[#8e8e93]">{task.time}</span>
      </div>
    </div>
  );
}
