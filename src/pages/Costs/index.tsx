/**
 * Costs Page — 费用 / Token 用量统计 + 监控大盘
 * 合并原 SettingsMonitoringPanel 的全部功能
 */
import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { hostApiFetch } from '@/lib/host-api';
import { RefreshCw, TrendingUp, Zap, DollarSign, BarChart3 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

/* ─── Types ─── */

interface TokenUsageEntry {
  timestamp: string;
  sessionId: string;
  agentId: string;
  model?: string;
  provider?: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
  costUsd?: number;
}

type TabId = 'realtime' | 'dashboard' | 'usage' | 'alerts';

const TABS: { id: TabId; label: string }[] = [
  { id: 'realtime', label: '实时用量' },
  { id: 'dashboard', label: '大盘监控' },
  { id: 'usage', label: '用量分析' },
  { id: 'alerts', label: '告警策略' },
];

/* ─── Helpers ─── */

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCost(usd?: number): string {
  if (usd == null) return '—';
  if (usd < 0.001) return '<$0.001';
  return `$${usd.toFixed(4)}`;
}

function formatDate(ts: string): string {
  try {
    return new Date(ts).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return ts;
  }
}

/* ─── Main component ─── */

export function Costs() {
  const [activeTab, setActiveTab] = useState<TabId>('realtime');
  const [entries, setEntries] = useState<TokenUsageEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(200);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await hostApiFetch<TokenUsageEntry[]>(
        `/api/usage/recent-token-history?limit=${limit}`,
      );
      setEntries(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const totalInput = entries.reduce((s, e) => s + e.inputTokens, 0);
  const totalOutput = entries.reduce((s, e) => s + e.outputTokens, 0);
  const totalCache = entries.reduce((s, e) => s + e.cacheReadTokens + e.cacheWriteTokens, 0);
  const totalCost = entries.reduce((s, e) => s + (e.costUsd ?? 0), 0);

  const modelMap = new Map<string, { tokens: number; cost: number; count: number }>();
  for (const e of entries) {
    const key = e.model ?? '未知模型';
    const prev = modelMap.get(key) ?? { tokens: 0, cost: 0, count: 0 };
    modelMap.set(key, { tokens: prev.tokens + e.totalTokens, cost: prev.cost + (e.costUsd ?? 0), count: prev.count + 1 });
  }
  const modelRows = [...modelMap.entries()].sort((a, b) => b[1].tokens - a[1].tokens);

  return (
    <div className="flex h-full flex-col bg-[#f2f2f7]">
      {/* Header */}
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-[#c6c6c8] bg-white px-5">
        <h1 className="text-[15px] font-semibold text-[#000000]">费用 / 监控</h1>
        <div className="flex items-center gap-3">
          {activeTab === 'realtime' && (
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="h-8 rounded-lg border border-[#c6c6c8] bg-[#f2f2f7] px-2 text-[12px] text-[#3c3c43] outline-none"
            >
              <option value={50}>最近 50 条</option>
              <option value={200}>最近 200 条</option>
              <option value={500}>最近 500 条</option>
            </select>
          )}
          <button
            type="button"
            onClick={() => void fetchData()}
            disabled={loading}
            className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] text-[#3c3c43] transition-colors hover:bg-[#f2f2f7] disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            刷新
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 gap-6 border-b border-[#c6c6c8] bg-white px-5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'border-b-2 pb-3 pt-3 text-[13px] font-medium transition-colors',
              activeTab === tab.id
                ? 'border-[#007aff] text-[#007aff]'
                : 'border-transparent text-[#8e8e93] hover:text-[#000000]',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-5">
        {error && (
          <div className="mb-4 rounded-xl bg-[#fef2f2] px-4 py-3 text-[13px] text-[#ef4444]">{error}</div>
        )}

        {activeTab === 'realtime' && (
          <RealtimeTab
            entries={entries}
            loading={loading}
            totalInput={totalInput}
            totalOutput={totalOutput}
            totalCache={totalCache}
            totalCost={totalCost}
            modelRows={modelRows}
          />
        )}
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'usage' && <UsageTab />}
        {activeTab === 'alerts' && <AlertsTab />}
      </div>
    </div>
  );
}

/* ─── Static data (Dashboard / Usage tabs) ─── */

const KPI_CARDS = [
  { label: '总预估花费', value: '$142.50', meta: '↗ 27% (+$30)', tone: 'text-rose-500' },
  { label: '本周花费', value: '$34.12', meta: '上周 $28.00', tone: 'text-[#667085]' },
  { label: '缓存节省', value: '$89.40', meta: 'Hit Rate: 68%', tone: 'text-emerald-600' },
  { label: '异常情况', value: '0', meta: '全部服务正常运行', tone: 'text-[#667085]' },
] as const;

const COST_SPIKES = [
  { name: 'x-radar-collect', value: '$45.20', meta: '60 次执行 · 均价 $0.75/次', borderColor: 'border-rose-500' },
  { name: 'daily-digest-news', value: '$28.90', meta: '30 次执行 · 均价 $0.96/次', borderColor: 'border-amber-500' },
  { name: 'github-issue-triage', value: '$15.40', meta: '120 次执行 · 均价 $0.12/次', borderColor: 'border-sky-500' },
] as const;

const DAILY_COST = [
  { day: 'Mon', value: 80 }, { day: 'Tue', value: 60 }, { day: 'Wed', value: 140 },
  { day: 'Thu', value: 92 }, { day: 'Fri', value: 112 }, { day: 'Sat', value: 42 }, { day: 'Sun', value: 52 },
] as const;

const TOKEN_SPLIT = [
  { label: 'Input', value: '15% (1.8M)', color: '#0a7aff' },
  { label: 'Output', value: '20% (2.4M)', color: '#10b981' },
  { label: 'Cache Hit', value: '65% (7.8M)', color: '#dbe2ea' },
] as const;

const RECENT_TASKS = [
  { name: 'x-radar-collect', runs: '60', input: '240k', output: '120k', cache: '1.2M', cost: '$45.20' },
  { name: 'daily-digest-news', runs: '30', input: '180k', output: '80k', cache: '800k', cost: '$28.90' },
  { name: 'github-issue-triage', runs: '120', input: '80k', output: '40k', cache: '300k', cost: '$15.40' },
] as const;

const USAGE_ROWS = [
  { name: 'x-radar-collect', value: '32.48% (924.5k)', color: '#ef4444' },
  { name: 'daily-digest-news', value: '16.58% (471.8k)', color: '#f59e0b' },
  { name: 'github-issue-triage', value: '13.20% (375.6k)', color: '#10b981' },
  { name: 'auth-watchman', value: '8.60% (244.7k)', color: '#3b82f6' },
  { name: 'monkey-discovery', value: '6.40% (182.1k)', color: '#8b5cf6' },
  { name: 'vault-snapshot', value: '5.30% (150.8k)', color: '#ec4899' },
  { name: 'builder-briefing', value: '4.30% (122.3k)', color: '#6366f1' },
  { name: 'outpost-mirror', value: '3.70% (105.2k)', color: '#14b8a6' },
  { name: 'robin-weekly-brief', value: '3.30% (93.9k)', color: '#0ea5e9' },
  { name: '其他 (32 个任务)', value: '6.14% (174.6k)', color: '#64748b' },
] as const;

/* ─── Realtime Tab ─── */

function RealtimeTab({
  entries, loading, totalInput, totalOutput, totalCache, totalCost, modelRows,
}: {
  entries: TokenUsageEntry[];
  loading: boolean;
  totalInput: number;
  totalOutput: number;
  totalCache: number;
  totalCost: number;
  modelRows: [string, { tokens: number; cost: number; count: number }][];
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: <Zap className="h-4 w-4" />, label: '输入 Token', value: formatTokens(totalInput), color: '#007aff' },
          { icon: <TrendingUp className="h-4 w-4" />, label: '输出 Token', value: formatTokens(totalOutput), color: '#10b981' },
          { icon: <BarChart3 className="h-4 w-4" />, label: '缓存 Token', value: formatTokens(totalCache), color: '#f59e0b' },
          { icon: <DollarSign className="h-4 w-4" />, label: '总费用 (USD)', value: formatCost(totalCost), color: '#ff6a00' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-2 mb-2" style={{ color: card.color }}>
              {card.icon}
              <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#8e8e93]">{card.label}</span>
            </div>
            <p className="text-[22px] font-semibold text-[#000000]">{card.value}</p>
          </div>
        ))}
      </div>

      {modelRows.length > 0 && (
        <div className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="border-b border-[#f2f2f7] px-5 py-3">
            <span className="text-[13px] font-semibold text-[#000000]">模型用量分布</span>
          </div>
          <div className="divide-y divide-[#f2f2f7]">
            {modelRows.map(([model, stats]) => {
              const total = modelRows.reduce((s, [, v]) => s + v.tokens, 0);
              const pct = total > 0 ? Math.round((stats.tokens / total) * 100) : 0;
              return (
                <div key={model} className="flex items-center gap-4 px-5 py-3">
                  <span className="w-[180px] truncate text-[13px] font-medium text-[#000000]">{model}</span>
                  <div className="flex-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f2f2f7]">
                      <div className="h-full rounded-full bg-[#007aff]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="w-[60px] text-right text-[12px] text-[#8e8e93]">{pct}%</span>
                  <span className="w-[70px] text-right text-[12px] text-[#3c3c43]">{formatTokens(stats.tokens)}</span>
                  <span className="w-[80px] text-right text-[12px] text-[#8e8e93]">{formatCost(stats.cost)}</span>
                  <span className="w-[50px] text-right text-[11px] text-[#c6c6c8]">{stats.count}次</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="border-b border-[#f2f2f7] px-5 py-3">
          <span className="text-[13px] font-semibold text-[#000000]">最近记录 ({entries.length})</span>
        </div>
        {entries.length === 0 && !loading ? (
          <div className="py-8 text-center text-[13px] text-[#8e8e93]">暂无用量数据</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[#f2f2f7] text-left text-[11px] font-semibold uppercase tracking-[0.5px] text-[#8e8e93]">
                  <th className="px-5 py-2.5">时间</th>
                  <th className="px-3 py-2.5">Agent</th>
                  <th className="px-3 py-2.5">模型</th>
                  <th className="px-3 py-2.5 text-right">输入</th>
                  <th className="px-3 py-2.5 text-right">输出</th>
                  <th className="px-3 py-2.5 text-right">缓存</th>
                  <th className="px-5 py-2.5 text-right">费用</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f2f7]">
                {entries.map((e, i) => (
                  <tr key={`${e.timestamp}-${i}`} className="hover:bg-[#f9f9fb]">
                    <td className="px-5 py-2.5 text-[#8e8e93]">{formatDate(e.timestamp)}</td>
                    <td className="max-w-[120px] truncate px-3 py-2.5 text-[#3c3c43]">{e.agentId}</td>
                    <td className="max-w-[140px] truncate px-3 py-2.5 text-[#3c3c43]">{e.model ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right text-[#000000]">{formatTokens(e.inputTokens)}</td>
                    <td className="px-3 py-2.5 text-right text-[#000000]">{formatTokens(e.outputTokens)}</td>
                    <td className="px-3 py-2.5 text-right text-[#8e8e93]">{formatTokens(e.cacheReadTokens + e.cacheWriteTokens)}</td>
                    <td className="px-5 py-2.5 text-right font-medium text-[#ff6a00]">{formatCost(e.costUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Dashboard Tab ─── */

function DashboardTab() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-4">
        {KPI_CARDS.map((item) => (
          <div key={item.label} className="rounded-[18px] border border-black/[0.06] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <div className="text-[13px] text-[#8e8e93]">{item.label}</div>
            <div className="mt-2 text-[28px] font-bold tracking-[-0.03em] text-[#111827]">{item.value}</div>
            <div className={cn('mt-2 text-[12px] font-medium', item.tone)}>{item.meta}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-3 text-[14px] font-semibold text-[#334155]">消耗最高定时任务 (30 Days)</div>
        <div className="grid gap-4 xl:grid-cols-3">
          {COST_SPIKES.map((item) => (
            <div key={item.name} className={cn('rounded-[18px] border-2 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]', item.borderColor)}>
              <div className="text-[15px] font-semibold text-[#111827]">{item.name}</div>
              <div className="mt-2 text-[24px] font-bold tracking-[-0.03em] text-[#111827]">{item.value}</div>
              <div className="mt-2 text-[12px] text-[#8e8e93]">{item.meta}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="rounded-xl border border-[#c6c6c8] bg-white p-5">
          <p className="mb-4 text-[14px] font-semibold text-[#334155]">每日预估花费 (7 Days)</p>
          <div className="relative flex h-48 items-end gap-4 border-b border-[#eef2f6] pb-4">
            {[32, 72, 112, 152].map((offset) => (
              <div key={offset} className="absolute inset-x-0 border-t border-dashed border-[#eef2f6]" style={{ top: `${offset}px` }} />
            ))}
            {DAILY_COST.map((bar) => (
              <div key={bar.day} className="relative z-[1] flex flex-1 flex-col items-center justify-end gap-2">
                <div className="w-7 rounded-t-[6px] bg-[#0a7aff]/85" style={{ height: `${bar.value}px` }} />
                <span className="text-[10px] text-[#8e8e93]">{bar.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#c6c6c8] bg-white p-5">
          <p className="mb-4 text-[14px] font-semibold text-[#334155]">Token 分布</p>
          <div className="flex flex-col items-center gap-5">
            <div className="relative h-32 w-32 rounded-full" style={{ background: 'conic-gradient(#0a7aff 0% 15%, #10b981 15% 35%, #dbe2ea 35% 100%)' }}>
              <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white">
                <span className="text-[20px] font-bold text-[#111827]">12M</span>
                <span className="text-[10px] text-[#8e8e93]">Tokens</span>
              </div>
            </div>
            <div className="w-full space-y-3">
              {TOKEN_SPLIT.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 text-[12px]">
                  <span className="flex items-center gap-2 text-[#667085]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </span>
                  <span className="font-semibold text-[#111827]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#c6c6c8] bg-white p-5">
        <p className="mb-4 text-[14px] font-semibold text-[#334155]">明细数据 (Recent Tasks)</p>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#eef2f6] text-[#8e8e93]">
                <th className="px-0 py-3 font-medium">任务名称</th>
                <th className="px-0 py-3 font-medium">执行次数</th>
                <th className="px-0 py-3 font-medium">Input</th>
                <th className="px-0 py-3 font-medium">Output</th>
                <th className="px-0 py-3 font-medium">Cache Hit</th>
                <th className="px-0 py-3 text-right font-medium">总消耗 ($)</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_TASKS.map((row) => (
                <tr key={row.name} className="border-b border-[#f7f8fa] last:border-b-0">
                  <td className="px-0 py-3 font-medium text-[#111827]">{row.name}</td>
                  <td className="px-0 py-3 text-[#667085]">{row.runs}</td>
                  <td className="px-0 py-3 text-[#667085]">{row.input}</td>
                  <td className="px-0 py-3 text-[#667085]">{row.output}</td>
                  <td className="px-0 py-3 font-medium text-emerald-600">{row.cache}</td>
                  <td className="px-0 py-3 text-right font-semibold text-[#111827]">{row.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Usage Tab ─── */

function UsageTab() {
  return (
    <div className="rounded-xl border border-[#c6c6c8] bg-white p-6">
      <p className="text-[12px] text-[#8e8e93]">统计范围: 定时任务会话累计 (15 Days)</p>
      <div className="mt-1 text-[28px] font-bold tracking-[-0.04em] text-[#111827]">2,845,910 Total Tokens</div>
      <div className="mt-6 grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="relative mx-auto h-[280px] w-[280px] rounded-full" style={{ background: 'conic-gradient(#ef4444 0% 32.5%, #f59e0b 32.5% 49%, #10b981 49% 62.2%, #3b82f6 62.2% 70.8%, #8b5cf6 70.8% 77.2%, #ec4899 77.2% 82.5%, #6366f1 82.5% 86.8%, #14b8a6 86.8% 90.5%, #0ea5e9 90.5% 93.8%, #64748b 93.8% 100%)' }}>
          <div className="absolute inset-10 flex flex-col items-center justify-center rounded-full bg-white text-center">
            <span className="text-[14px] font-semibold text-[#667085]">定时任务</span>
            <span className="mt-1 text-[20px] font-bold text-[#111827]">2.84M</span>
          </div>
        </div>
        <div className="space-y-1.5">
          {USAGE_ROWS.map((item) => (
            <div key={item.name} className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] transition-colors hover:bg-[#f8fafc]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <span className={cn('flex-1', item.name.startsWith('其他') ? 'text-[#8e8e93]' : 'font-medium text-[#111827]')}>{item.name}</span>
              <span className="text-[#8e8e93]">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Alerts Tab ─── */

function AlertsTab() {
  const [dailyTokenLimit, setDailyTokenLimit] = useState('200,000');
  const [costLimit, setCostLimit] = useState('$1.50 / Day');
  const [retentionPolicy, setRetentionPolicy] = useState('30days');
  const [autoClean, setAutoClean] = useState(true);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#c6c6c8] bg-white px-5 py-4">
        <h3 className="mb-4 text-[15px] font-semibold text-[#000000]">用量告警水位</h3>
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-[#000000]">日均 Token 警戒阈值</p>
            <input
              value={dailyTokenLimit}
              onChange={(e) => setDailyTokenLimit(e.target.value)}
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] text-[#000000] outline-none focus:border-[#007aff]"
            />
            <p className="mt-1.5 text-[12px] text-[#8e8e93]">超过后将拒绝无权 Cron 触发器。</p>
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-[#000000]">预估经费提醒限制</p>
            <input
              value={costLimit}
              onChange={(e) => setCostLimit(e.target.value)}
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] text-[#000000] outline-none focus:border-[#007aff]"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[#c6c6c8] bg-white px-5 py-4">
        <h3 className="mb-4 text-[15px] font-semibold text-[#000000]">数据清洗与下沉</h3>
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-[#000000]">日志及运行时调试包保留策略</p>
            <select
              value={retentionPolicy}
              onChange={(e) => setRetentionPolicy(e.target.value)}
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] text-[#000000] outline-none focus:border-[#007aff]"
            >
              <option value="30days">保留 30 天后转离线档</option>
              <option value="7days">保留 7 天后删除</option>
              <option value="60days">保留 60 天后转离线档</option>
              <option value="forever">永久保留</option>
            </select>
          </div>
          <div className="flex items-center justify-between gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-[#000000]">自动删除孤儿执行物</p>
              <p className="mt-0.5 text-[12px] text-[#8e8e93]">清空 7 天前的缓存截图、Browser Session Profile 等。</p>
            </div>
            <Switch checked={autoClean} onCheckedChange={setAutoClean} />
          </div>
        </div>
      </section>
    </div>
  );
}
