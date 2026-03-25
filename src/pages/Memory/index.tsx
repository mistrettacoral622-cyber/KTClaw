import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, BookOpen, FolderOpen, Info, RefreshCw, RotateCw, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hostApiFetch } from '@/lib/host-api';

type MemoryFileCategory = 'evergreen' | 'daily' | 'other';
type HealthSeverity = 'critical' | 'warning' | 'info' | 'ok';
type Tab = 'overview' | 'browser' | 'guide';
type SortKey = 'date' | 'name' | 'size';

interface MemoryFileHighlight {
  start: number;
  end: number;
  snippet: string;
}

interface MemoryFileSearch {
  hitCount: number;
  highlights: MemoryFileHighlight[];
}

interface MemoryFileInfo {
  label: string;
  path: string;
  relativePath: string;
  content: string;
  lastModified: string;
  sizeBytes: number;
  category: MemoryFileCategory;
  writable?: boolean;
  search?: MemoryFileSearch;
}

interface MemoryScopeInfo {
  id: string;
  label: string;
  workspaceDir: string;
}

interface MemoryConfig {
  memorySearch: {
    enabled: boolean;
    provider: string | null;
    model: string | null;
    hybrid: {
      enabled: boolean;
      vectorWeight: number;
      textWeight: number;
      temporalDecay: { enabled: boolean; halfLifeDays: number };
      mmr: { enabled: boolean; lambda: number };
    };
    cache: { enabled: boolean; maxEntries: number };
    extraPaths: string[];
  };
  memoryFlush: { enabled: boolean; softThresholdTokens: number };
  configFound: boolean;
}

interface MemoryStatus {
  indexed: boolean;
  lastIndexed: string | null;
  totalEntries: number | null;
  vectorAvailable: boolean | null;
  embeddingProvider: string | null;
  raw: string;
}

interface MemoryStats {
  totalFiles: number;
  totalSizeBytes: number;
  dailyLogCount: number;
  evergreenCount: number;
  oldestDaily: string | null;
  newestDaily: string | null;
  dailyTimeline: Array<{ date: string; sizeBytes: number } | null>;
}

interface MemoryHealthCheck {
  id: string;
  severity: HealthSeverity;
  title: string;
  description: string;
  affectedFiles: string[] | null;
  action: string | null;
}

interface StaleDailyLogInfo {
  relativePath: string;
  label: string;
  date: string;
  ageDays: number;
  sizeBytes: number;
}

interface MemoryHealthSummary {
  score: number;
  checks: MemoryHealthCheck[];
  staleDailyLogs: StaleDailyLogInfo[];
}

interface MemorySearchSummary {
  query: string;
  totalHits: number;
  resultCount?: number;
  totalFiles?: number;
}

interface MemoryApiResponse {
  files: MemoryFileInfo[];
  config: MemoryConfig;
  status: MemoryStatus;
  stats: MemoryStats;
  health: MemoryHealthSummary;
  workspaceDir: string;
  scopes?: MemoryScopeInfo[];
  activeScope?: string;
  search?: MemorySearchSummary;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)}KB`;
  return `${(kb / 1024).toFixed(1)}MB`;
}

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}

const SEVERITY_COLOR: Record<HealthSeverity, string> = {
  critical: '#ef4444',
  warning: '#f59e0b',
  info: '#007aff',
  ok: '#10b981',
};

const CATEGORY_COLOR: Record<MemoryFileCategory, string> = {
  evergreen: '#10b981',
  daily: '#007aff',
  other: '#8e8e93',
};

function HealthCheckItem({ check }: { check: MemoryHealthCheck }) {
  const Icon = check.severity === 'critical' ? AlertCircle : check.severity === 'warning' ? AlertTriangle : Info;
  return (
    <div className="rounded-xl border border-black/[0.06] bg-white p-3">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: SEVERITY_COLOR[check.severity] }} />
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-[#000000]">{check.title}</div>
          <p className="text-[12px] leading-5 text-[#3c3c43]">{check.description}</p>
          {check.action && <p className="mt-1 text-[11px] text-clawx-ac">→ {check.action}</p>}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({
  data,
  onReindex,
  reindexing,
}: {
  data: MemoryApiResponse;
  onReindex: () => void;
  reindexing: boolean;
}) {
  const { stats, status, health } = data;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/[0.06] bg-white p-5">
        <div className="text-[16px] font-semibold text-[#000000]">记忆健康评分: {health.score}</div>
        <div className="mt-2 text-[12px] text-[#8e8e93]">
          文件: {stats.totalFiles} · 大小: {formatBytes(stats.totalSizeBytes)} · 索引: {status.indexed ? '已建立' : '未建立'}
        </div>
        <button
          type="button"
          onClick={onReindex}
          disabled={reindexing}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-clawx-ac px-3 py-1.5 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          <RotateCw className={cn('h-3 w-3', reindexing && 'animate-spin')} />
          {reindexing ? '重建中…' : '重建索引'}
        </button>
      </div>
      {health.checks.length > 0 ? (
        <div className="space-y-2">
          {health.checks.map((check) => (
            <HealthCheckItem key={`${check.id}-${check.title}`} check={check} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-black/[0.06] bg-white px-4 py-6 text-center text-[13px] text-[#10b981]">
          所有检查通过
        </div>
      )}
    </div>
  );
}

function BrowserTab({
  files,
  scopes,
  activeScope,
  searchQuery,
  searchSummary,
  onScopeChange,
  onSearchQueryChange,
  onSave,
  onRefresh,
}: {
  files: MemoryFileInfo[];
  scopes: MemoryScopeInfo[];
  activeScope: string;
  searchQuery: string;
  searchSummary?: MemorySearchSummary;
  onScopeChange: (scope: string) => void;
  onSearchQueryChange: (query: string) => void;
  onSave: (relativePath: string, content: string, expectedMtime?: string) => Promise<void>;
  onRefresh: () => void;
}) {
  const [sort, setSort] = useState<SortKey>('date');
  const [selected, setSelected] = useState<MemoryFileInfo | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      if (sort === 'name') return a.label.localeCompare(b.label);
      if (sort === 'size') return b.sizeBytes - a.sizeBytes;
      return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
    });
  }, [files, sort]);

  useEffect(() => {
    if (!selected) return;
    const latest = files.find((file) => file.relativePath === selected.relativePath);
    if (!latest) {
      setSelected(null);
      setEditing(false);
      setDraft('');
      return;
    }
    setSelected(latest);
    if (!editing) {
      setDraft(latest.content);
    }
  }, [files, selected, editing]);

  const handleSelect = (file: MemoryFileInfo) => {
    setSelected(file);
    setEditing(false);
    setDraft(file.content);
    setSaveError(null);
  };

  const handleEdit = () => {
    setEditing(true);
    setDraft(selected?.content ?? '');
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleCancel = () => {
    setEditing(false);
    setDraft(selected?.content ?? '');
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(selected.relativePath, draft, selected.lastModified);
      setEditing(false);
      onRefresh();
    } catch (error) {
      setSaveError(String(error));
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!selected || !navigator.clipboard?.writeText) return;
    await navigator.clipboard.writeText(editing ? draft : selected.content);
  };

  const handleDownload = () => {
    if (!selected) return;
    const blob = new Blob([editing ? draft : selected.content], { type: 'text/plain;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = selected.relativePath.split('/').pop() || 'memory.txt';
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  };

  const hasUnsavedChanges = editing && selected !== null && draft !== selected.content;

  return (
    <div className="flex h-full min-h-0 gap-3" style={{ height: 'calc(100vh - 200px)' }}>
      <div className="flex w-[220px] shrink-0 flex-col gap-2">
        <select
          aria-label="Agent Scope"
          value={activeScope}
          onChange={(event) => onScopeChange(event.target.value)}
          className="w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[12px] outline-none focus:border-clawx-ac"
        >
          {scopes.map((scope) => (
            <option key={scope.id} value={scope.id}>
              {scope.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          aria-label="Search Memory"
          placeholder="搜索内容…"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          className="w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-[12px] outline-none focus:border-clawx-ac"
        />
        {searchSummary?.query && <div className="text-[11px] text-[#8e8e93]">{searchSummary.totalHits} hits</div>}
        <div className="flex gap-1">
          {(['date', 'name', 'size'] as SortKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              className={cn(
                'flex-1 rounded-md py-1 text-[11px] font-medium transition-colors',
                sort === key ? 'bg-clawx-ac text-white' : 'bg-white text-[#8e8e93] hover:bg-[#f2f2f7]',
              )}
            >
              {key === 'date' ? '时间' : key === 'name' ? '名称' : '大小'}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {sortedFiles.length === 0 && (
            <div className="py-8 text-center text-[12px] text-[#8e8e93]">无文件</div>
          )}
          {sortedFiles.map((file) => (
            <button
              key={file.relativePath}
              type="button"
              onClick={() => handleSelect(file)}
              className={cn(
                'w-full rounded-xl px-3 py-2.5 text-left transition-colors',
                selected?.relativePath === file.relativePath ? 'bg-clawx-ac text-white' : 'bg-white hover:bg-[#f2f2f7]',
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-[13px]"
                  style={{ color: selected?.relativePath === file.relativePath ? 'white' : CATEGORY_COLOR[file.category] }}
                >
                  ●
                </span>
                <span className="flex-1 truncate text-[12px] font-medium">{file.label}</span>
              </div>
              <div
                className={cn(
                  'mt-0.5 flex items-center justify-between text-[10px]',
                  selected?.relativePath === file.relativePath ? 'text-white/70' : 'text-[#8e8e93]',
                )}
              >
                <span>{formatBytes(file.sizeBytes)}</span>
                <span>{(file.search?.hitCount ?? 0) > 0 ? `${file.search?.hitCount} hits` : relativeTime(file.lastModified)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 min-w-0 flex-col rounded-2xl border border-black/[0.06] bg-white overflow-hidden">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-[#8e8e93]">
            <FolderOpen className="h-10 w-10 opacity-30" />
            <span className="text-[13px]">选择左侧文件查看内容</span>
          </div>
        ) : (
          <>
            {hasUnsavedChanges && (
              <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-[12px] text-amber-800">Unsaved changes</div>
            )}
            {saveError && (
              <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-[12px] text-red-700">{saveError}</div>
            )}
            <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-[#000000]">{selected.label}</div>
                <div className="text-[11px] text-[#8e8e93]">{selected.relativePath} · {formatBytes(selected.sizeBytes)}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="flex items-center gap-1 rounded-lg bg-[#f2f2f7] px-3 py-1.5 text-[12px] font-medium text-[#3c3c43] hover:bg-[#e5e5ea]"
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-1 rounded-lg bg-[#f2f2f7] px-3 py-1.5 text-[12px] font-medium text-[#3c3c43] hover:bg-[#e5e5ea]"
                >
                  Download
                </button>
                {!editing ? (
                  <button
                    type="button"
                    onClick={handleEdit}
                    disabled={selected.writable === false}
                    className="flex items-center gap-1 rounded-lg bg-[#f2f2f7] px-3 py-1.5 text-[12px] font-medium text-[#3c3c43] hover:bg-[#e5e5ea] disabled:opacity-50"
                  >
                    编辑
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex items-center gap-1 rounded-lg bg-[#f2f2f7] px-3 py-1.5 text-[12px] font-medium text-[#3c3c43] hover:bg-[#e5e5ea]"
                    >
                      <X className="h-3 w-3" /> 取消
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-1 rounded-lg bg-clawx-ac px-3 py-1.5 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      <Save className="h-3 w-3" /> {saving ? '保存中…' : '保存'}
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto min-h-0">
              {editing ? (
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  className="h-full w-full resize-none p-4 font-mono text-[12px] leading-5 text-[#000000] outline-none"
                  spellCheck={false}
                />
              ) : (
                <pre className="whitespace-pre-wrap break-words p-4 font-mono text-[12px] leading-5 text-[#000000]">
                  {selected.content || <span className="text-[#8e8e93]">（空文件）</span>}
                </pre>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function GuideTab({ config }: { config: MemoryConfig }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/[0.06] bg-white p-5">
        <div className="text-[13px] font-semibold text-[#000000]">使用建议</div>
        <ul className="mt-2 space-y-2 text-[12px] leading-5 text-[#3c3c43]">
          <li>保持 `MEMORY.md` 简洁，核心信息优先。</li>
          <li>每日日志放在 `memory/YYYY-MM-DD.md` 并定期清理。</li>
          <li>保存后可执行重建索引，让检索快速反映最新内容。</li>
        </ul>
      </div>
      <div className="rounded-2xl border border-black/[0.06] bg-white p-5 text-[12px] text-[#3c3c43]">
        向量搜索: {config.memorySearch.enabled ? '已启用' : '未启用'} ·
        Provider: {config.memorySearch.provider ?? 'default'}
      </div>
    </div>
  );
}

export function Memory() {
  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<MemoryApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const [scopeId, setScopeId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async (nextScope = scopeId, nextQuery = searchQuery) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (nextScope) params.set('scope', nextScope);
      if (nextQuery.trim()) params.set('q', nextQuery.trim());
      const path = params.size > 0 ? `/api/memory?${params.toString()}` : '/api/memory';
      const json = await hostApiFetch<MemoryApiResponse>(path);
      setData(json);
      if (!scopeId && json.activeScope) {
        setScopeId(json.activeScope);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [scopeId, searchQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = useCallback(async (relativePath: string, content: string, expectedMtime?: string) => {
    await hostApiFetch<{ ok: boolean }>('/api/memory/file', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        relativePath,
        content,
        expectedMtime,
        scope: scopeId || data?.activeScope || undefined,
      }),
    });
    await hostApiFetch<{ ok: boolean }>('/api/memory/reindex', { method: 'POST' });
    await load(scopeId, searchQuery);
  }, [scopeId, data?.activeScope, load, searchQuery]);

  const handleReindex = useCallback(async () => {
    setReindexing(true);
    try {
      await hostApiFetch<{ ok: boolean }>('/api/memory/reindex', { method: 'POST' });
      await load();
    } finally {
      setReindexing(false);
    }
  }, [load]);

  const tabs: { key: Tab; label: string; Icon: typeof FolderOpen }[] = [
    { key: 'overview', label: '概览', Icon: Info },
    { key: 'browser', label: '文件浏览', Icon: FolderOpen },
    { key: 'guide', label: '使用指南', Icon: BookOpen },
  ];

  return (
    <div className="flex h-full flex-col bg-[#f2f2f7]">
      <div className="flex items-center justify-between border-b border-black/[0.06] bg-white px-6 py-4">
        <div>
          <h1 className="text-[17px] font-semibold text-[#000000]">🧠 记忆知识库</h1>
          <p className="mt-0.5 text-[12px] text-[#8e8e93]">
            {data ? data.workspaceDir : '管理 Agent 的长期记忆文件'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-[#f2f2f7] px-3 py-2 text-[12px] font-medium text-[#3c3c43] hover:bg-[#e5e5ea] disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          刷新
        </button>
      </div>

      <div className="flex gap-1 border-b border-black/[0.06] bg-white px-6">
        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-1.5 border-b-2 px-3 py-3 text-[13px] font-medium transition-colors',
              tab === key ? 'border-clawx-ac text-clawx-ac' : 'border-transparent text-[#8e8e93] hover:text-[#3c3c43]',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading && (
          <div className="flex items-center justify-center py-20 text-[13px] text-[#8e8e93]">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> 加载中…
          </div>
        )}
        {error && !loading && (
          <div className="rounded-xl border border-[#ef4444]/20 bg-[#ef4444]/5 p-4 text-[13px] text-[#ef4444]">
            加载失败：{error}
          </div>
        )}
        {data && !loading && (
          <>
            {tab === 'overview' && <OverviewTab data={data} onReindex={handleReindex} reindexing={reindexing} />}
            {tab === 'browser' && (
              <BrowserTab
                files={data.files}
                scopes={data.scopes ?? [{ id: data.activeScope ?? 'main', label: data.activeScope ?? 'main', workspaceDir: data.workspaceDir }]}
                activeScope={scopeId || data.activeScope || 'main'}
                searchQuery={searchQuery}
                searchSummary={data.search}
                onScopeChange={(nextScope) => {
                  setScopeId(nextScope);
                  void load(nextScope, searchQuery);
                }}
                onSearchQueryChange={(nextQuery) => {
                  setSearchQuery(nextQuery);
                  void load(scopeId || data.activeScope || '', nextQuery);
                }}
                onSave={handleSave}
                onRefresh={() => {
                  void load();
                }}
              />
            )}
            {tab === 'guide' && <GuideTab config={data.config} />}
          </>
        )}
      </div>
    </div>
  );
}
