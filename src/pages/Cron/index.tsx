/**
 * Cron Page — Frame 06
 * 定时任务 / Cron 总览：自动化执行调度
 * 排期表 Schedule 视图（周历）
 */
import { useState } from 'react';
import { cn } from '@/lib/utils';

/* ─── Types ─── */

interface ScheduleTask {
  agent: string;
  agentIcon: string;
  name: string;
  time: string;
  color: string;    // border-left / text
  bg: string;       // card bg
}

/* ─── Static schedule data ─── */

const DAYS = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

const MONKEY: Omit<ScheduleTask, 'name' | 'time'> = {
  agent: 'Monkey',
  agentIcon: '🤖',
  color: '#f97316',
  bg: '#fff7ed',
};

const SECURITY: Omit<ScheduleTask, 'name' | 'time'> = {
  agent: '安全审核',
  agentIcon: '⚠️',
  color: '#8b5cf6',
  bg: '#f5f3ff',
};

const KTCLAW_DARK: Omit<ScheduleTask, 'name' | 'time'> = {
  agent: 'KTClaw主脑',
  agentIcon: '✦',
  color: '#ffffff',
  bg: '#1c1c1e',
};

const KTCLAW_LIGHT: Omit<ScheduleTask, 'name' | 'time'> = {
  agent: 'KTClaw主脑',
  agentIcon: '✦',
  color: '#3c3c43',
  bg: '#ffffff',
};

const SICHEN: Omit<ScheduleTask, 'name' | 'time'> = {
  agent: '沉思小助手',
  agentIcon: '🔍',
  color: '#059669',
  bg: '#f0fdf4',
};

type TimeBlock = {
  hour: string;
  entries: (ScheduleTask | null)[][];
};

function repeat5<T>(task: T): (T | null)[] {
  return [task, task, task, task, task, null];
}

const TIME_BLOCKS: TimeBlock[] = [
  {
    hour: '05:00',
    entries: [
      repeat5({ ...MONKEY, name: 'monkey-discovery', time: '05:00' }),
      repeat5({ ...SECURITY, name: 'auth-watchman', time: '05:30' }),
      repeat5({ ...KTCLAW_DARK, name: 'vault-snapshot', time: '05:50' }),
    ],
  },
  {
    hour: '06:00',
    entries: [
      repeat5({ ...KTCLAW_DARK, name: 'builder-briefing', time: '06:00' }),
    ],
  },
  {
    hour: '07:00',
    entries: [
      repeat5({ ...SICHEN, name: 'outpost-mirror', time: '07:00' }),
      // robin-weekly-brief (Tue only)
      [
        null,
        { ...KTCLAW_LIGHT, name: 'robin-weekly-brief', time: '07:30' },
        null,
        null,
        null,
        null,
      ],
    ],
  },
];

const TABS = ['总览 Overview', '排期表 Schedule', '流水线 Pipelines'] as const;
type Tab = (typeof TABS)[number];

/* ─── Components ─── */

export function Cron() {
  const [activeTab, setActiveTab] = useState<Tab>('排期表 Schedule');

  return (
    <div className="-m-6 flex min-h-[calc(100vh-2.5rem)] flex-col bg-[#f2f2f7] p-6">
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">

        {/* Header */}
        <div className="flex shrink-0 items-start justify-between px-8 pb-1 pt-8">
          <div>
            <h1 className="text-[26px] font-semibold text-[#000000]">Cron 监控面板</h1>
            <p className="mt-1 text-[13px] text-[#8e8e93]">30 个定时任务 · 全部正常</p>
          </div>
          <button
            type="button"
            className="mt-1 flex items-center gap-1 text-[13px] text-[#8e8e93] hover:text-[#3c3c43] transition-colors"
          >
            网刚更新 ↻
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 items-center gap-0 border-b border-black/[0.06] px-8 pt-4">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'relative mr-6 pb-3 text-[14px] font-medium transition-colors',
                activeTab === tab
                  ? 'text-[#10b981]'
                  : 'text-[#8e8e93] hover:text-[#3c3c43]',
              )}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#10b981]" />
              )}
            </button>
          ))}
        </div>

        {/* Schedule calendar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Time labels column */}
          <div className="flex w-[64px] shrink-0 flex-col">
            {/* spacer for header row */}
            <div className="h-[42px] shrink-0" />
            {TIME_BLOCKS.map((block) => (
              <div key={block.hour} className="relative">
                <div className="flex min-h-[120px] flex-col justify-start pt-2 pl-4">
                  <span className="text-[12px] font-medium text-[#8e8e93]">{block.hour}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex flex-1 flex-col overflow-auto border-l border-black/[0.04]">
            {/* Day headers */}
            <div className="flex shrink-0 border-b border-black/[0.06]">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="flex-1 py-3 text-center text-[12px] font-medium text-[#8e8e93]"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Time block rows */}
            {TIME_BLOCKS.map((block) => (
              <div key={block.hour} className="flex shrink-0 border-b border-black/[0.04]">
                {/* For each day column */}
                {DAYS.map((_, dayIdx) => (
                  <div key={dayIdx} className="flex flex-1 flex-col gap-2 border-r border-black/[0.04] p-2">
                    {block.entries.map((row, rowIdx) => {
                      const task = row[dayIdx];
                      if (!task) return <div key={rowIdx} className="invisible h-[60px]" />;
                      return <ScheduleCard key={rowIdx} task={task} />;
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Scrollbar track (right) */}
          <div className="flex w-3 shrink-0 flex-col border-l border-black/[0.04] bg-[#f9f9f9]">
            <div className="mx-auto mt-2 h-16 w-1.5 rounded-full bg-[#d1d5db]" />
          </div>
        </div>

        {/* Bottom scrollbar */}
        <div className="shrink-0 px-8 pb-4 pt-2">
          <div className="flex items-center gap-2">
            <button type="button" className="text-[14px] text-[#8e8e93]">◀</button>
            <div className="flex-1 h-[6px] rounded-full bg-[#e5e5ea]">
              <div className="h-[6px] w-2/3 rounded-full bg-[#8e8e93]" />
            </div>
            <button type="button" className="text-[14px] text-[#8e8e93]">▶</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleCard({ task }: { task: ScheduleTask }) {
  const isDark = task.bg === '#1c1c1e';

  return (
    <div
      className="rounded-lg px-2.5 py-2 text-left"
      style={{
        background: task.bg,
        borderLeft: `3px solid ${isDark ? task.color : task.color}`,
      }}
    >
      <div className="mb-0.5 flex items-center gap-1">
        <span className="text-[10px]">{task.agentIcon}</span>
        <span
          className="text-[10px] font-medium"
          style={{ color: isDark ? '#9ca3af' : task.color }}
        >
          {task.agent}
        </span>
      </div>
      <p
        className="text-[12px] font-semibold leading-tight"
        style={{ color: isDark ? '#ffffff' : '#1c1c1e' }}
      >
        {task.name}
      </p>
      <p
        className="mt-0.5 text-[11px]"
        style={{ color: isDark ? '#6b7280' : '#8e8e93' }}
      >
        {task.time}
      </p>
    </div>
  );
}

export default Cron;
