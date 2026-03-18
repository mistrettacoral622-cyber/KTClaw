/**
 * Team Map Page — Frame 03b
 * 团队层级拓扑图：Org chart 显示 Agent 层级关系
 */
import { useState } from 'react';
import { cn } from '@/lib/utils';

const CHILDREN = [
  {
    icon: '🔍',
    iconBg: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
    name: '沉思小助手',
    role: '信息提取',
    status: 'idle' as const,
    stats: [
      { label: '2 tools', color: '#3b82f6' },
      { label: '1 cron', color: '#10b981' },
    ],
  },
  {
    icon: '🤖',
    iconBg: 'linear-gradient(135deg, #fb923c, #f97316)',
    name: 'Monkey',
    role: '字幕打轴',
    status: 'idle' as const,
    stats: [
      { label: '2 tools', color: '#3b82f6' },
      { label: '1 cron', color: '#10b981' },
    ],
  },
  {
    icon: '⚠️',
    iconBg: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
    name: '安全审核',
    role: '权限检查',
    status: 'blocked' as const,
    stats: [
      { label: '1 tool', color: '#3b82f6' },
    ],
  },
];

export function TeamMap() {
  const [activeTab, setActiveTab] = useState<'Teams' | 'Hierarchy'>('Hierarchy');

  return (
    <div className="-m-6 flex min-h-[calc(100vh-2.5rem)] flex-col bg-[#f2f2f7] p-6">
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">

        {/* Legend top-right */}
        <div className="absolute right-5 top-4 flex items-center gap-4 text-[12px] text-[#3c3c43]">
          <span className="flex items-center gap-1.5">
            <span className="h-[7px] w-[7px] rounded-full bg-[#007aff]" />
            活跃
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-[7px] w-[7px] rounded-full bg-[#ef4444]" />
            阻断
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-[7px] w-[7px] rounded-full bg-[#8e8e93]" />
            待命
          </span>
        </div>

        {/* Org chart */}
        <div className="flex flex-1 flex-col items-center justify-center pb-16">
          {/* Root node */}
          <div className="z-10 w-[184px] rounded-2xl border-2 border-[#007aff] bg-white p-5 text-center shadow-[0_2px_16px_rgba(0,122,255,0.12)]">
            <div
              className="mx-auto mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-2xl text-[24px] text-white"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              ✦
            </div>
            <p className="text-[15px] font-semibold text-[#000000]">KTClaw 主脑</p>
            <p className="text-[12px] text-[#8e8e93]">Orchestrator</p>
            <div className="mt-2 flex items-center justify-center gap-3 text-[12px]">
              <span className="text-[#3b82f6]">4 tools</span>
              <span className="text-[#10b981]">3 reports</span>
            </div>
          </div>

          {/* SVG connector lines */}
          <svg
            width="620"
            height="56"
            className="-my-px overflow-visible"
            style={{ display: 'block' }}
          >
            <line x1="310" y1="0" x2="310" y2="28" stroke="#d1d5db" strokeWidth="1.5" />
            <line x1="110" y1="28" x2="510" y2="28" stroke="#d1d5db" strokeWidth="1.5" />
            <line x1="110" y1="28" x2="110" y2="56" stroke="#d1d5db" strokeWidth="1.5" />
            <line x1="310" y1="28" x2="310" y2="56" stroke="#d1d5db" strokeWidth="1.5" />
            <line x1="510" y1="28" x2="510" y2="56" stroke="#d1d5db" strokeWidth="1.5" />
          </svg>

          {/* Children row */}
          <div className="flex gap-6">
            {CHILDREN.map((agent) => (
              <div
                key={agent.name}
                className={cn(
                  'w-[160px] rounded-2xl bg-white p-5 text-center shadow-[0_1px_4px_rgba(0,0,0,0.06)] cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]',
                  agent.status === 'blocked'
                    ? 'border-2 border-[#ef4444]'
                    : 'border border-black/[0.06]',
                )}
              >
                <div
                  className="mx-auto mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-2xl text-[22px] text-white"
                  style={{ background: agent.iconBg }}
                >
                  {agent.icon}
                </div>
                <p className="text-[14px] font-semibold text-[#000000]">{agent.name}</p>
                <p className="text-[12px] text-[#8e8e93]">{agent.role}</p>
                <div className="mt-2 flex items-center justify-center gap-2 text-[12px]">
                  {agent.stats.map((s) => (
                    <span key={s.label} style={{ color: s.color }}>
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Zoom controls (bottom-left) */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-1">
          {['+', '−', '⛶'].map((icon) => (
            <button
              key={icon}
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-[14px] text-[#3c3c43] shadow-sm transition-colors hover:bg-[#f2f2f7]"
            >
              {icon}
            </button>
          ))}
        </div>

        {/* Tab switcher (bottom-center) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <div className="flex rounded-lg border border-black/10 bg-white p-0.5 shadow-sm">
            {(['Teams', 'Hierarchy'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'rounded-md px-4 py-1.5 text-[13px] transition-colors',
                  activeTab === tab
                    ? 'bg-[#1c1c1e] font-medium text-white'
                    : 'text-[#3c3c43] hover:bg-[#f2f2f7]',
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
