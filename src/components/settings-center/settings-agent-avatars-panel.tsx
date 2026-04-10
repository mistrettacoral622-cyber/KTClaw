import { type ChangeEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { SettingsSectionCard } from '@/components/settings-center/settings-section-card';
import { hostApiFetch } from '@/lib/host-api';
import { cn } from '@/lib/utils';

type AgentAvatarRecord = {
  id: string;
  name: string;
  avatar?: string;
};

type AgentStatus = 'uploading' | 'removing' | 'success' | 'error';

export function SettingsAgentAvatarsPanel() {
  const { t } = useTranslation(['settings']);
  const [agents, setAgents] = useState<AgentAvatarRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentStatus, setAgentStatus] = useState<Record<string, AgentStatus>>({});

  useEffect(() => {
    hostApiFetch<{ agents: AgentAvatarRecord[] }>('/api/agents')
      .then((data) => setAgents(data.agents ?? []))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }, []);

  const clearAgentStatusLater = (agentId: string) => {
    setTimeout(() => {
      setAgentStatus((current) => {
        const next = { ...current };
        delete next[agentId];
        return next;
      });
    }, 2000);
  };

  const handleUpload = (agentId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('settings:avatarImageRequired'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAgentStatus((current) => ({ ...current, [agentId]: 'uploading' }));
      hostApiFetch(`/api/agents/${encodeURIComponent(agentId)}`, {
        method: 'PUT',
        body: JSON.stringify({ avatar: dataUrl }),
      })
        .then(() => {
          setAgents((current) => current.map((agent) => (
            agent.id === agentId ? { ...agent, avatar: dataUrl } : agent
          )));
          setAgentStatus((current) => ({ ...current, [agentId]: 'success' }));
          toast.success(t('settings:avatarUpdated'));
          clearAgentStatusLater(agentId);
        })
        .catch(() => {
          setAgentStatus((current) => ({ ...current, [agentId]: 'error' }));
          toast.error(t('settings:avatarUploadFailed'));
          clearAgentStatusLater(agentId);
        });
    };
    reader.onerror = () => toast.error(t('settings:avatarReadFailed'));
    reader.readAsDataURL(file);
  };

  const handleRemove = (agentId: string) => {
    setAgentStatus((current) => ({ ...current, [agentId]: 'removing' }));
    hostApiFetch(`/api/agents/${encodeURIComponent(agentId)}`, {
      method: 'PUT',
      body: JSON.stringify({ avatar: null }),
    })
      .then(() => {
        setAgents((current) => current.map((agent) => (
          agent.id === agentId ? { ...agent, avatar: undefined } : agent
        )));
        setAgentStatus((current) => ({ ...current, [agentId]: 'success' }));
        toast.success(t('settings:avatarRemoved'));
        clearAgentStatusLater(agentId);
      })
      .catch(() => {
        setAgentStatus((current) => ({ ...current, [agentId]: 'error' }));
        toast.error(t('settings:avatarRemoveFailed'));
        clearAgentStatusLater(agentId);
      });
  };

  return (
    <SettingsSectionCard title={t('settings:agentAvatars')}>
      {loading ? (
        <p className="py-4 text-center text-[13px] text-[#8e8e93]">{t('settings:agentAvatarsLoading')}</p>
      ) : agents.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-[#8e8e93]">{t('settings:agentAvatarsEmpty')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {agents.map((agent) => {
            const inputId = `agent-avatar-${agent.id}`;
            const status = agentStatus[agent.id];
            const busy = status === 'uploading' || status === 'removing';

            return (
              <div key={agent.id} className="flex items-center gap-3 py-1">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-[#f2f2f7]">
                  {agent.avatar ? (
                    <img src={agent.avatar} alt={agent.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[16px]">?</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[#000000]">{agent.name}</p>
                  <p className="text-[11px] text-[#8e8e93]">{agent.id}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <label
                    htmlFor={inputId}
                    className={cn(
                      'cursor-pointer rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[12px] text-[#3c3c43] hover:bg-[#f2f2f7]',
                      busy && 'pointer-events-none opacity-50',
                    )}
                  >
                    {status === 'uploading' ? '...' : t('settings:uploadAvatar')}
                  </label>
                  <input
                    id={inputId}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={busy}
                    onChange={(event) => handleUpload(agent.id, event)}
                  />
                  {agent.avatar ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleRemove(agent.id)}
                      className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[12px] text-[#3c3c43] hover:bg-[#f2f2f7] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {status === 'removing' ? '...' : t('settings:removeAvatar')}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SettingsSectionCard>
  );
}
