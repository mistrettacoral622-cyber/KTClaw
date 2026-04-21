import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hostApiFetch } from '@/lib/host-api';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SettingsSectionCard } from './settings-section-card';
import { useSettingsStore } from '@/stores/settings';

type ActionState = 'idle' | 'loading' | 'success' | 'error';
type RuntimeState = 'unsupported' | 'not_installed' | 'installing' | 'installed' | 'error';

type RuntimeStatus = {
  success?: boolean;
  state: RuntimeState;
  version: string;
  targetId: string | null;
  requiredByConfig?: boolean;
  error?: string;
};

function useMemoryAction(endpoint: string): { state: ActionState; run: () => Promise<void> } {
  const [state, setState] = useState<ActionState>('idle');
  const run = async () => {
    setState('loading');
    try {
      await hostApiFetch(endpoint, { method: 'POST' });
      setState('success');
      setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  };
  return { state, run };
}

function ActionButton({
  label,
  state,
  onClick,
}: {
  label: string;
  state: ActionState;
  onClick: () => void;
}) {
  const { t } = useTranslation('settings');
  const disabled = state === 'loading';
  const displayLabel =
    state === 'loading'
      ? t('memoryBrowser.loading')
      : state === 'success'
        ? t('memoryBrowser.saved')
        : state === 'error'
          ? t('memoryBrowser.readFailed', { error: '' }).replace(': ', '')
          : label;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="shrink-0 rounded-lg border border-black/10 px-4 py-2 text-[13px] font-medium text-[#000000] transition hover:bg-[#f2f2f7] disabled:opacity-50"
    >
      {displayLabel}
    </button>
  );
}

function RuntimeActionButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="shrink-0 rounded-lg border border-black/10 px-4 py-2 text-[13px] font-medium text-[#000000] transition hover:bg-[#f2f2f7] disabled:opacity-50"
    >
      {label}
    </button>
  );
}

export function SettingsMemoryStrategy() {
  const { t } = useTranslation('settings');
  const watchedMemoryDirs = useSettingsStore((s) => s.watchedMemoryDirs);
  const setWatchedMemoryDirs = useSettingsStore((s) => s.setWatchedMemoryDirs);
  const [newDirInput, setNewDirInput] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus | null>(null);
  const [runtimeBusy, setRuntimeBusy] = useState<ActionState>('idle');
  const [installPromptOpen, setInstallPromptOpen] = useState(false);

  const snapshot = useMemoryAction('/api/memory/snapshot');
  const analyze = useMemoryAction('/api/memory/analyze');
  const reindex = useMemoryAction('/api/memory/reindex');

  async function refreshRuntimeStatus(): Promise<RuntimeStatus> {
    const response = await hostApiFetch<RuntimeStatus>('/api/local-embeddings-runtime/status');
    setRuntimeStatus(response);
    return response;
  }

  useEffect(() => {
    void refreshRuntimeStatus().catch(() => setRuntimeStatus(null));
  }, []);

  async function handleInstallRuntime(): Promise<void> {
    setRuntimeBusy('loading');
    try {
      await hostApiFetch('/api/local-embeddings-runtime/install', { method: 'POST' });
      await refreshRuntimeStatus();
      setRuntimeBusy('success');
    } catch {
      setRuntimeBusy('error');
    } finally {
      setTimeout(() => setRuntimeBusy('idle'), 2500);
    }
  }

  async function handleRemoveRuntime(): Promise<void> {
    setRuntimeBusy('loading');
    try {
      await hostApiFetch('/api/local-embeddings-runtime/remove', { method: 'POST' });
      await refreshRuntimeStatus();
      setRuntimeBusy('success');
    } catch {
      setRuntimeBusy('error');
    } finally {
      setTimeout(() => setRuntimeBusy('idle'), 2500);
    }
  }

  async function installRuntimeAndRetry(): Promise<void> {
    setRuntimeBusy('loading');
    try {
      await hostApiFetch('/api/local-embeddings-runtime/install', { method: 'POST' });
      await refreshRuntimeStatus();
      await reindex.run();
      setRuntimeBusy('success');
    } catch {
      setRuntimeBusy('error');
    } finally {
      setInstallPromptOpen(false);
      setTimeout(() => setRuntimeBusy('idle'), 2500);
    }
  }

  async function handleReindex(): Promise<void> {
    try {
      const status = await refreshRuntimeStatus();
      if (status.requiredByConfig && status.state !== 'installed') {
        setInstallPromptOpen(true);
        return;
      }
    } catch {
      // Fall through to the normal request path.
    }
    await reindex.run();
  }

  function handleAddDir() {
    const trimmed = newDirInput.trim();
    if (!trimmed) return;
    if (!watchedMemoryDirs.includes(trimmed)) {
      setWatchedMemoryDirs([...watchedMemoryDirs, trimmed]);
    }
    setNewDirInput('');
    setShowInput(false);
  }

  function handleRemoveDir(dir: string) {
    setWatchedMemoryDirs(watchedMemoryDirs.filter((d) => d !== dir));
  }

  return (
    <div className="space-y-4">
      <SettingsSectionCard title="Local Embeddings Runtime">
        <div className="space-y-3">
          <p className="text-[13px] text-[#3c3c43]">
            Install the local embeddings runtime only if you use the OpenClaw local memory backend. Ollama and cloud providers do not require this runtime.
          </p>
          <div className="rounded-lg border border-black/10 bg-[#f9f9f9] px-4 py-3">
            <div className="text-[13px] font-medium text-[#000000]">
              Status: {runtimeStatus?.state ?? 'unknown'}
            </div>
            <div className="mt-1 text-[12px] text-[#6b7280]">
              Target: {runtimeStatus?.targetId ?? 'unsupported'}
            </div>
            <div className="mt-1 text-[12px] text-[#6b7280]">
              Version: {runtimeStatus?.version ?? 'unknown'}
            </div>
            {runtimeStatus?.requiredByConfig ? (
              <div className="mt-1 text-[12px] text-[#0a7aff]">
                Current memory config requires the local embeddings backend.
              </div>
            ) : null}
            {runtimeStatus?.error ? (
              <div className="mt-1 text-[12px] text-[#ef4444]">{runtimeStatus.error}</div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <RuntimeActionButton
              label={runtimeBusy === 'loading' ? 'Installing...' : 'Install / Reinstall'}
              disabled={runtimeBusy === 'loading' || runtimeStatus?.state === 'unsupported'}
              onClick={() => void handleInstallRuntime()}
            />
            <RuntimeActionButton
              label={runtimeBusy === 'loading' ? 'Working...' : 'Remove'}
              disabled={runtimeBusy === 'loading' || runtimeStatus?.state !== 'installed'}
              onClick={() => void handleRemoveRuntime()}
            />
          </div>
        </div>
      </SettingsSectionCard>

      <section className="rounded-xl border border-[#c6c6c8] bg-white px-5 py-4">
        <h3 className="mb-4 text-[15px] font-semibold text-[#000000]">
          {t('memoryStrategy.global.title')}
        </h3>
        <div className="flex flex-wrap gap-3">
          <ActionButton
            label={t('memoryStrategy.localKnowledge.reindex')}
            state={snapshot.state}
            onClick={() => void snapshot.run()}
          />
          <ActionButton label="Analyze" state={analyze.state} onClick={() => void analyze.run()} />
          <ActionButton label="Reindex" state={reindex.state} onClick={() => void handleReindex()} />
        </div>
      </section>

      <section className="rounded-xl border border-[#c6c6c8] bg-white px-5 py-4">
        <h3 className="mb-4 text-[15px] font-semibold text-[#000000]">
          {t('memoryStrategy.localKnowledge.title')}
        </h3>
        <div className="space-y-3">
          {watchedMemoryDirs.length === 0 ? (
            <p className="text-[13px] text-[#8e8e93]">No watched directories configured yet.</p>
          ) : null}
          {watchedMemoryDirs.map((dir) => (
            <div
              key={dir}
              className="flex items-center justify-between rounded-lg border border-black/10 bg-[#f9f9f9] px-4 py-3"
            >
              <p className="break-all text-[13px] font-medium text-[#000000]">{dir}</p>
              <button
                type="button"
                aria-label={`Remove ${dir}`}
                onClick={() => handleRemoveDir(dir)}
                className="ml-3 shrink-0 rounded-md border border-black/10 px-2.5 py-1 text-[12px] text-[#ef4444] hover:bg-[#fee2e2]"
              >
                Remove
              </button>
            </div>
          ))}

          {showInput ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newDirInput}
                onChange={(e) => setNewDirInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddDir();
                }}
                placeholder="For example: D:\\Docs"
                className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] text-[#000000] outline-none focus:border-clawx-ac"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddDir}
                className="rounded-lg bg-[#0a7aff] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#075ac4]"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowInput(false);
                  setNewDirInput('');
                }}
                className="rounded-lg border border-black/10 px-4 py-2 text-[13px] font-medium text-[#000000] transition hover:bg-[#f2f2f7]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowInput(true)}
              className="w-full rounded-lg border border-dashed border-black/10 py-2.5 text-[13px] text-[#8e8e93] transition-colors hover:bg-[#f2f2f7]"
            >
              {t('memoryStrategy.localKnowledge.addDirectory')}
            </button>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={installPromptOpen}
        title="Install local embeddings runtime?"
        message="This action needs the local embeddings runtime. KTClaw can download and install it now. Ollama and cloud providers are unaffected."
        confirmLabel="Download and install"
        cancelLabel="Cancel"
        onConfirm={installRuntimeAndRetry}
        onCancel={() => setInstallPromptOpen(false)}
      />
    </div>
  );
}
