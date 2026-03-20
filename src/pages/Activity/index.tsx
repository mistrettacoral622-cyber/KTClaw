/**
 * Activity Page — 运行日志 / 事件流
 * 对接 /api/logs，展示系统运行日志
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { hostApiFetch } from '@/lib/host-api';

/* ─── Types ─── */

type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'all';

interface LogLine {
  id: string;
  raw: string;
  level: LogLevel;
  time?: string;
  message: string;
}

/* ─── Helpers ─── */

const LEVEL_RE = /\[(INFO|WARN|ERROR|DEBUG)\]/i;
const TIME_RE = /(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})/;

function parseLine(raw: string, idx: number): LogLine {
  const levelMatch = LEVEL_RE.exec(raw);
  const level = (levelMatch?.[1]?.toLowerCase() ?? 'info') as LogLevel;
  const timeMatch = TIME_RE.exec(raw);
  const time = timeMatch?.[1];
  const message = raw
    .replace(TIME_RE, '')
    .replace(LEVEL_RE, '')
    .replace(/^\s*[|\-:]+\s*/, '')
    .trim() || raw;
  return { id: `${idx}-${raw.slice(0, 20)}`, raw, level, time, message };
}

const LEVEL_STYLES: Record<LogLevel, { dot: string; badge: string; label: string }> = {
  info:  { dot: 'bg-[#3b82f6]', badge: 'bg-[#eff6ff] text-[#1d4ed8]', label: 'INFO' },
  warn:  { dot: 'bg-[#f59e0b]', badge: 'bg-[#fffbeb] text-[#b45309]', label: 'WARN' },
  error: { dot: 'bg-[#ef4444]', badge: 'bg-[#fef2f2] text-[#b91c1c]', label: 'ERROR' },
  debug: { dot: 'bg-[#8b5cf6]', badge: 'bg-[#f5f3ff] text-[#6d28d9]', label: 'DEBUG' },
  all:   { dot: 'bg-[#8e8e93]', badge: 'bg-[#f2f2f7] text-[#3c3c43]', label: 'ALL' },
};

const FILTER_TABS: { key: LogLevel; label: string }[] = [
  { key: 'all',   label: '全部' },
  { key: 'error', label: '错误' },
  { key: 'warn',  label: '警告' },
  { key: 'info',  label: '信息' },
  { key: 'debug', label: '调试' },
];

/* ─── Main component ─── */

export function Activity() {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<LogLevel>('all');
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [tailLines, setTailLines] = useState(200);
  const bottomRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await hostApiFetch<{ content?: string }>(`/api/logs?tailLines=${tailLines}`);
      const raw = data?.content ?? '';
      const parsed = raw
        .split('\n')
        .filter((l) => l.trim())
        .map((l, i) => parseLine(l, i));
      setLines(parsed);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [tailLines]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => { void fetchLogs(); }, 3000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchLogs]);

  const filtered = lines.filter((l) => {
    if (filter !== 'all' && l.level !== filter) return false;
    if (search && !l.raw.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const errorCount = lines.filter((l) => l.level === 'error').length;
  const warnCount  = lines.filter((l) => l.level === 'warn').length;

  return (
    <div className="flex h-full flex-col bg-[#f2f2f7] p-6">
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">

        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-black/[0.06] px-8 pb-5 pt-8">
          <div>
            <h1 className="text-[26px] font-semibold text-[#000000]">运行日志 Activity</h1>
            <p className="mt-1 text-[13px] text-[#8e8e93]">
              {loading ? '加载中...' : `${lines.length} 条日志`}
              {errorCount > 0 && (
                <span className="ml-2 text-[#ef4444]">· {errorCount} 个错误</span>
              )}
              {warnCount > 0 && (
                <span className="ml-2 text-[#f59e0b]">· {warnCount} 个警告</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoRefresh((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors',
                autoRefresh
                  ? 'border-[#10b981]/30 bg-[#f0fdf4] text-[#059669]'
                  : 'border-black/10 bg-white text-[#3c3c43] hover:bg-[#f2f2f7]',
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', autoRefresh ? 'animate-pulse bg-[#10b981]' : 'bg-[#d1d5db]')} />
              {autoRefresh ? '实时刷新中' : '自动刷新'}
            </button>
            <button
              type="button"
              onClick={() => void fetchLogs()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[12px] font-medium text-[#3c3c43] hover:bg-[#f2f2f7] disabled:opacity-50"
            >
              ↻ 刷新
            </button>
            <select
              value={tailLines}
              onChange={(e) => setTailLines(Number(e.target.value))}
              className="rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[12px] text-[#3c3c43] outline-none"
            >
              <option value={100}>最近 100 行</option>
              <option value={200}>最近 200 行</option>
              <option value={500}>最近 500 行</option>
              <option value={1000}>最近 1000 行</option>
            </select>
          </div>
        </div>

        {/* Filter + Search bar */}
        <div className="flex shrink-0 items-center gap-4 border-b border-black/[0.06] px-8 py-3">
          <div className="flex items-center gap-1">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
                  filter === tab.key
                    ? 'bg-[#000000] text-white'
                    : 'text-[#8e8e93] hover:bg-[#f2f2f7] hover:text-[#3c3c43]',
                )}
              >
                {tab.key !== 'all' && (
                  <span className={cn('h-1.5 w-1.5 rounded-full', LEVEL_STYLES[tab.key].dot)} />
                )}
                {tab.label}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索日志..."
            className="flex-1 rounded-lg border border-black/10 bg-[#f9f9f9] px-3 py-1.5 text-[12px] text-[#000000] outline-none focus:border-[#007aff] focus:bg-white"
          />
          <span className="shrink-0 text-[12px] text-[#8e8e93]">{filtered.length} 条</span>
        </div>

        {/* Log list */}
        <div className="flex-1 overflow-y-auto font-mono">
          {error ? (
            <div className="flex flex-1 items-center justify-center p-8 text-[13px] text-[#ef4444]">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-8 text-[13px] text-[#8e8e93]">
              {loading ? '加载中...' : '暂无日志'}
            </div>
          ) : (
            <div className="divide-y divide-black/[0.04]">
              {filtered.map((line) => {
                const s = LEVEL_STYLES[line.level] ?? LEVEL_STYLES.info;
                return (
                  <div
                    key={line.id}
                    className={cn(
                      'flex items-start gap-3 px-8 py-2 text-[12px] transition-colors hover:bg-[#f9f9f9]',
                      line.level === 'error' && 'bg-[#fef2f2]/50 hover:bg-[#fef2f2]',
                      line.level === 'warn'  && 'bg-[#fffbeb]/50 hover:bg-[#fffbeb]',
                    )}
                  >
                    <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', s.dot)} />
                    {line.time && (
                      <span className="shrink-0 text-[#8e8e93]">{line.time}</span>
                    )}
                    <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold', s.badge)}>
                      {s.label}
                    </span>
                    <span className="min-w-0 flex-1 break-all text-[#1c1c1e]">{line.message}</span>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Activity;
