/**
 * Team Overview Page — Frame 03
 * 员工与分工总览：4张 Agent 卡片，卡片式布局
 */

type AgentStatus = '工作中' | '待命' | '阻断';

interface StaffCard {
  icon: string;
  iconBg: string;
  name: string;
  role: string;
  status: AgentStatus;
  statusColor: string;
  currentTask: string;
  latestOutput: string;
  scheduled: boolean;
}

const STAFF: StaffCard[] = [
  {
    icon: '✦',
    iconBg: 'linear-gradient(135deg, #10b981, #059669)',
    name: 'KTClaw 主脑',
    role: 'Orchestrator',
    status: '工作中',
    statusColor: '#10b981',
    currentTask: '代码重构与提取方案',
    latestOutput: '架构大纲 v1.2',
    scheduled: true,
  },
  {
    icon: '🔍',
    iconBg: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
    name: '沉思小助手',
    role: '信息提取',
    status: '待命',
    statusColor: '#8e8e93',
    currentTask: '每日 07:30 晨报',
    latestOutput: 'Agent 生态早报',
    scheduled: true,
  },
  {
    icon: '🤖',
    iconBg: 'linear-gradient(135deg, #fb923c, #f97316)',
    name: 'Monkey',
    role: '字幕打轴',
    status: '待命',
    statusColor: '#8e8e93',
    currentTask: 'YouTube URL 入列',
    latestOutput: 'Monkey Asset Batch #11',
    scheduled: false,
  },
  {
    icon: '⚠️',
    iconBg: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
    name: '安全审核',
    role: '权限检查',
    status: '阻断',
    statusColor: '#ef4444',
    currentTask: '拦截 /root 读取',
    latestOutput: 'Access Denied',
    scheduled: false,
  },
];

export function TeamOverview() {
  return (
    <div className="-m-6 flex min-h-[calc(100vh-2.5rem)] flex-col bg-[#f2f2f7] p-6">
      <div className="flex flex-1 flex-col rounded-2xl bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-[26px] font-semibold text-[#000000]">员工与分工总览</h1>
            <p className="mt-1 text-[13px] text-[#8e8e93]">
              所有激活的 Agent 角色及当前工作状态 · 点击卡片查看 Map
            </p>
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-4 py-2 text-[13px] font-medium text-[#000000] shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          >
            + 雇佣新员工
          </button>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-4 gap-4">
          {STAFF.map((agent) => (
            <StaffCardView key={agent.name} agent={agent} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StaffCardView({ agent }: { agent: StaffCard }) {
  return (
    <div className="flex cursor-pointer flex-col rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      {/* Avatar + Name */}
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[20px] text-white"
          style={{ background: agent.iconBg }}
        >
          {agent.icon}
        </div>
        <div>
          <p className="text-[15px] font-semibold text-[#000000]">{agent.name}</p>
          <p className="text-[12px] text-[#8e8e93]">{agent.role}</p>
        </div>
      </div>

      {/* Divider */}
      <div className="mb-3 h-px bg-black/[0.05]" />

      {/* Stats */}
      <div className="space-y-2">
        <Row label="当前状态">
          <span className="flex items-center gap-1.5 text-[13px]" style={{ color: agent.statusColor }}>
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: agent.statusColor }}
            />
            {agent.status}
          </span>
        </Row>
        <Row label={agent.status === '待命' ? '下一项' : '正在处理'}>
          <span className="text-[13px] text-[#3c3c43]">{agent.currentTask}</span>
        </Row>
        <Row label="最近产出">
          <span className="text-[13px] text-[#3c3c43]">{agent.latestOutput}</span>
        </Row>
        <Row label="是否排班">
          <span className="text-[13px] text-[#3c3c43]">{agent.scheduled ? '已排班' : '未排班'}</span>
        </Row>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-[12px] text-[#8e8e93]">{label}</span>
      <span className="min-w-0 truncate text-right">{children}</span>
    </div>
  );
}
