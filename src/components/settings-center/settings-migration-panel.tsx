import { useEffect, useState } from 'react';
import { invokeIpc } from '@/lib/api-client';
import { hostApiFetch } from '@/lib/host-api';

interface BackupEntry {
  filename: string;
  createdAt: string;
  sizeBytes: number;
}

interface PreviewData {
  settings: Record<string, unknown>;
  memory: Record<string, unknown>;
  channelMetadata: Record<string, unknown>;
}

type ActionState = 'idle' | 'loading' | 'success' | 'error';
type RestoreModule = 'settings' | 'memory' | 'channelMetadata';

const RESTORE_MODULE_LABELS: Record<RestoreModule, string> = {
  settings: '设置',
  memory: '记忆',
  channelMetadata: '通道元数据',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

type SettingsMigrationPanelProps = {
  onLaunchWizard: () => void;
};

export function SettingsMigrationPanel({ onLaunchWizard }: SettingsMigrationPanelProps) {
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [createState, setCreateState] = useState<ActionState>('idle');
  const [exportState, setExportState] = useState<ActionState>('idle');
  const [importState, setImportState] = useState<ActionState>('idle');
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewArchivePath, setPreviewArchivePath] = useState<string | null>(null);
  const [selectedModules, setSelectedModules] = useState<RestoreModule[]>(['settings', 'memory', 'channelMetadata']);

  async function loadBackups() {
    setLoadingBackups(true);
    try {
      const list = await hostApiFetch<BackupEntry[]>('/api/backup/list');
      setBackups(Array.isArray(list) ? list : []);
    } catch {
      setBackups([]);
    } finally {
      setLoadingBackups(false);
    }
  }

  useEffect(() => {
    void loadBackups();
  }, []);

  async function handleCreateBackup() {
    setCreateState('loading');
    try {
      await hostApiFetch('/api/backup/create', { method: 'POST' });
      setCreateState('success');
      await loadBackups();
      setTimeout(() => setCreateState('idle'), 2000);
    } catch {
      setCreateState('error');
      setTimeout(() => setCreateState('idle'), 3000);
    }
  }

  async function handleExport() {
    setExportState('loading');
    try {
      const result = await invokeIpc<{ canceled: boolean; filePath?: string }>('dialog:save', {
        title: '保存 KTClaw 备份',
        defaultPath: `ktclaw-backup-${new Date().toISOString().slice(0, 10)}.ktclaw`,
        filters: [{ name: 'KTClaw Archive', extensions: ['ktclaw'] }],
      });
      if (result.canceled || !result.filePath) {
        setExportState('idle');
        return;
      }

      await hostApiFetch<{ archivePath?: string; success?: boolean }>('/api/backup/export', {
        method: 'POST',
        body: JSON.stringify({ targetPath: result.filePath }),
      });
      setExportState('success');
      setTimeout(() => setExportState('idle'), 2000);
    } catch {
      setExportState('error');
      setTimeout(() => setExportState('idle'), 3000);
    }
  }

  async function handleImportPick() {
    try {
      const result = await invokeIpc<{ canceled: boolean; filePaths: string[] }>('dialog:open', {
        title: '选择 KTClaw 备份文件',
        filters: [{ name: 'KTClaw Archive', extensions: ['ktclaw'] }],
        properties: ['openFile'],
      });
      if (result.canceled || !result.filePaths[0]) return;

      const archivePath = result.filePaths[0];
      const preview = await hostApiFetch<PreviewData>('/api/backup/preview', {
        method: 'POST',
        body: JSON.stringify({ archivePath }),
      });
      setPreviewData(preview);
      setPreviewArchivePath(archivePath);
    } catch {
      // ignore
    }
  }

  async function handleConfirmImport() {
    if (!previewArchivePath) return;
    setImportState('loading');
    try {
      await hostApiFetch('/api/backup/import', {
        method: 'POST',
        body: JSON.stringify({ archivePath: previewArchivePath, modules: selectedModules }),
      });
      setImportState('success');
      setPreviewData(null);
      setPreviewArchivePath(null);
      await loadBackups();
      setTimeout(() => setImportState('idle'), 2000);
    } catch {
      setImportState('error');
      setTimeout(() => setImportState('idle'), 3000);
    }
  }

  function toggleModule(mod: RestoreModule) {
    setSelectedModules((current) => (
      current.includes(mod) ? current.filter((item) => item !== mod) : [...current, mod]
    ));
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#c6c6c8] bg-white px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-[#000000]">从 OpenClaw 迁移配置</h3>
            <p className="mt-1 text-[12px] text-[#8e8e93]">
              自动检测本地磁盘上的 OpenClaw 旧版工作区，一键迁移 Agent、Skills 及 IM 通道等历史配置。
            </p>
          </div>
          <button
            type="button"
            onClick={onLaunchWizard}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#0a7aff] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#075ac4]"
          >
            启动迁移向导
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-[#c6c6c8] bg-white px-5 py-4">
        <h3 className="mb-4 text-[15px] font-semibold text-[#000000]">冷备与导出</h3>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={createState === 'loading'}
            onClick={() => void handleCreateBackup()}
            className="rounded-lg border border-black/10 px-4 py-2 text-[13px] font-medium text-[#000000] transition hover:bg-[#f2f2f7] disabled:opacity-50"
          >
            {createState === 'loading' ? '创建中...' : createState === 'success' ? '已创建' : '立即创建备份'}
          </button>
          <button
            type="button"
            disabled={exportState === 'loading'}
            onClick={() => void handleExport()}
            className="rounded-lg border border-black/10 px-4 py-2 text-[13px] font-medium text-[#000000] transition hover:bg-[#f2f2f7] disabled:opacity-50"
          >
            {exportState === 'loading' ? '导出中...' : exportState === 'success' ? '已导出' : '导出备份'}
          </button>
          <button
            type="button"
            onClick={() => void handleImportPick()}
            className="rounded-lg border border-black/10 px-4 py-2 text-[13px] font-medium text-[#000000] transition hover:bg-[#f2f2f7]"
          >
            选择 .ktclaw 导入
          </button>
        </div>
      </section>

      {previewData ? (
        <section className="rounded-xl border border-[#0a7aff] bg-white px-5 py-4">
          <h3 className="mb-3 text-[15px] font-semibold text-[#000000]">导入预览</h3>
          <p className="mb-3 text-[13px] text-[#8e8e93]">选择要恢复的模块：</p>
          <div className="mb-4 space-y-2">
            {(Object.keys(RESTORE_MODULE_LABELS) as RestoreModule[]).map((mod) => (
              <label key={mod} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedModules.includes(mod)}
                  onChange={() => toggleModule(mod)}
                  className="rounded"
                />
                <span className="text-[13px] text-[#000000]">{RESTORE_MODULE_LABELS[mod]}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={importState === 'loading' || selectedModules.length === 0}
              onClick={() => void handleConfirmImport()}
              className="rounded-lg bg-[#0a7aff] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#075ac4] disabled:opacity-50"
            >
              {importState === 'loading' ? '恢复中...' : importState === 'success' ? '已恢复' : '恢复所选内容'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPreviewData(null);
                setPreviewArchivePath(null);
              }}
              className="rounded-lg border border-black/10 px-4 py-2 text-[13px] font-medium text-[#000000] transition hover:bg-[#f2f2f7]"
            >
              取消
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-[#c6c6c8] bg-white px-5 py-4">
        <h3 className="mb-4 text-[15px] font-semibold text-[#000000]">备份历史</h3>
        {loadingBackups ? (
          <p className="text-[13px] text-[#8e8e93]">加载中...</p>
        ) : backups.length === 0 ? (
          <p className="text-[13px] text-[#8e8e93]">暂无备份。</p>
        ) : (
          <div className="space-y-2">
            {backups.map((backup) => (
              <div
                key={backup.filename}
                className="flex items-center justify-between rounded-lg border border-black/10 bg-[#f9f9f9] px-4 py-3"
              >
                <div>
                  <p className="text-[13px] font-medium text-[#000000]">{backup.filename}</p>
                  <p className="mt-0.5 text-[12px] text-[#8e8e93]">
                    {formatDate(backup.createdAt)} &middot; {formatBytes(backup.sizeBytes)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[#c6c6c8] bg-white px-5 py-4">
        <h3 className="mb-4 text-[15px] font-semibold text-[#000000]">恢复出厂</h3>
        <div className="flex items-center justify-between gap-4">
          <p className="text-[13px] text-[#ef4444]">
            清除所有设置与关联 Agent 数据。（此操作无法撤销）
          </p>
          <button
            type="button"
            className="shrink-0 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-2 text-[13px] font-semibold text-[#b91c1c] transition hover:bg-[#fee2e2]"
          >
            清空并重启
          </button>
        </div>
      </section>
    </div>
  );
}
