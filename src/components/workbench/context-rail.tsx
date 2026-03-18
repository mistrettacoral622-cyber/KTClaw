import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useSettingsStore } from '@/stores/settings';

export function ContextRail() {
  const contextRailCollapsed = useSettingsStore((state) => state.contextRailCollapsed);
  const setContextRailCollapsed = useSettingsStore((state) => state.setContextRailCollapsed);
  const [openModules, setOpenModules] = useState({
    about: true,
    capabilities: true,
    context: false,
    memory: false,
  });

  const toggleModule = (key: keyof typeof openModules) => {
    setOpenModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (contextRailCollapsed) {
    return (
      <aside className="flex h-full items-center border-l border-black/[0.06] bg-white px-2 py-3 dark:border-white/10 dark:bg-background">
        <button
          type="button"
          aria-label="展开 Agent 检查器"
          onClick={() => setContextRailCollapsed(false)}
          className="rounded-full border border-black/10 bg-[#f2f2f7] px-2.5 py-1.5 text-xs text-[#3c3c43] shadow-sm transition-colors hover:bg-[#e5e5ea]"
        >
          {'>'}
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col overflow-y-auto border-l border-black/[0.06] bg-white dark:border-white/10 dark:bg-background">
      {/* Header */}
      <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-black/[0.06] px-5">
        <span className="text-[14px] font-semibold text-[#000000]">Agent 检查器</span>
        <button
          type="button"
          aria-label="关闭 Agent 检查器"
          onClick={() => setContextRailCollapsed(true)}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[16px] text-[#8e8e93] transition-colors hover:bg-[#f2f2f7] hover:text-[#000000]"
        >
          ✕
        </button>
      </header>

      {/* Agent Profile */}
      <div className="flex flex-col items-center px-5 py-6">
        {/* Blue circle avatar */}
        <div className="mb-3 flex h-[80px] w-[80px] items-center justify-center rounded-full bg-[#007aff] text-[32px] text-white shadow-[0_4px_16px_rgba(0,122,255,0.25)]">
          ✦
        </div>
        <p className="text-[16px] font-semibold text-[#000000]">KTClaw 主脑</p>
        <p className="mt-0.5 text-[13px] text-[#8e8e93]">AI coworker</p>
      </div>

      {/* Accordions */}
      <div className="flex flex-col gap-0 border-t border-black/[0.06] px-4 pb-6 pt-2">

        {/* 基础设定（关于我） */}
        <AccordionRow
          label="基础设定（关于我）"
          open={openModules.about}
          onToggle={() => toggleModule('about')}
        >
          <KVRow label="风格" value="sharp resourceful" />
          <KVRow label="模型" value="GLM-5-Turbo" />
        </AccordionRow>

        {/* 能力与工具 */}
        <AccordionRow
          label="能力与工具"
          open={openModules.capabilities}
          onToggle={() => toggleModule('capabilities')}
        >
          <div className="flex flex-wrap gap-1.5">
            {['file_system', 'terminal', 'browser', 'git_ops'].map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-[#f2f2f7] px-2 py-0.5 text-[12px] text-[#3c3c43]"
              >
                {tag}
              </span>
            ))}
          </div>
        </AccordionRow>

        {/* 我眼中的你 */}
        <AccordionRow
          label="我眼中的你"
          open={openModules.context}
          onToggle={() => toggleModule('context')}
        >
          <KVRow label="专注" value="coding" />
          <KVRow label="时区" value="Asia/Shanghai" />
        </AccordionRow>

        {/* 工作记忆 */}
        <AccordionRow
          label="工作记忆"
          open={openModules.memory}
          onToggle={() => toggleModule('memory')}
        >
          <div className="space-y-2">
            <div>
              <p className="text-[12px] font-medium text-[#3c3c43]">
                最近笔记 <span className="text-[#8e8e93]">🔗</span>
              </p>
              <p className="mt-0.5 text-[11px] text-[#8e8e93]">Current project not recorded yet...</p>
            </div>
            <div className="rounded-lg border border-[#f59e0b]/30 bg-[#fffbeb] px-3 py-2">
              <p className="text-[12px] font-medium text-[#92400e]">重要教训</p>
              <p className="mt-0.5 text-[11px] text-[#b45309]">
                1. Confirm before making risky changes...
              </p>
            </div>
          </div>
        </AccordionRow>
      </div>
    </aside>
  );
}

function AccordionRow({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-black/[0.06] py-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-[13px] font-medium text-[#3c3c43]">{label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[#8e8e93] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

function KVRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[12px] text-[#8e8e93]">{label}</span>
      <span className="text-[12px] text-[#3c3c43]">{value}</span>
    </div>
  );
}
