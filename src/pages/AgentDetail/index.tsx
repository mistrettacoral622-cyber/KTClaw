import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAgentsStore } from '@/stores/agents';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-black/[0.04] py-3 text-[13px]">
      <span className="text-[#8e8e93]">{label}</span>
      <span className="max-w-[360px] text-right text-[#111827]">{value || '—'}</span>
    </div>
  );
}

export function AgentDetail() {
  const { t } = useTranslation('agents');
  const { agentId = '' } = useParams();
  const { agents, fetchAgents, loading } = useAgentsStore();

  useEffect(() => {
    void fetchAgents();
  }, [fetchAgents]);

  const agent = useMemo(
    () => agents.find((entry) => entry.id === agentId) ?? null,
    [agentId, agents],
  );
  const directReports = useMemo(
    () => (agent?.isDefault ? agents.filter((entry) => !entry.isDefault) : []),
    [agent?.isDefault, agents],
  );
  const reportsTo = agent && !agent.isDefault ? agents.find((entry) => entry.isDefault) ?? null : null;
  const hierarchySummary = agent?.isDefault
    ? t('detail.rootSummary', { defaultValue: 'This is the root KTClaw agent.' })
    : `${agent?.name ?? ''} reports to ${reportsTo?.name ?? 'main'}`;

  if (!loading && !agent) {
    return (
      <div className="mx-auto flex h-full max-w-4xl flex-col gap-6 px-8 py-10">
        <Link to="/agents" className="text-[13px] text-[#8e8e93] hover:text-[#111827]">
          {t('detail.backToAgents', { defaultValue: 'Back to agents' })}
        </Link>
        <div className="rounded-3xl border border-black/[0.06] bg-white p-8">
          <h1 className="text-[28px] font-semibold text-[#111827]">
            {t('detail.notFoundTitle', { defaultValue: 'Agent not found' })}
          </h1>
          <p className="mt-3 text-[14px] text-[#6b7280]">
            {t('detail.notFoundDescription', {
              defaultValue: 'The requested agent does not exist in the current KTClaw snapshot.',
            })}
          </p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[#8e8e93]">
        {t('detail.loading', { defaultValue: 'Loading agent details...' })}
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-6 px-8 py-10">
      <Link to="/agents" className="text-[13px] text-[#8e8e93] hover:text-[#111827]">
        {t('detail.backToAgents', { defaultValue: 'Back to agents' })}
      </Link>

      <section className="rounded-[28px] border border-black/[0.06] bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="text-[12px] font-medium uppercase tracking-[0.18em] text-[#8e8e93]">
              {t('detail.kicker', { defaultValue: 'Agent detail' })}
            </div>
            <h1 className="mt-2 text-[34px] font-semibold text-[#111827]">{agent.name}</h1>
            <p className="mt-3 max-w-[720px] text-[14px] leading-7 text-[#4b5563]">
              {agent.persona || t('detail.noPersona', { defaultValue: 'No persona configured.' })}
            </p>
          </div>
          <div className="rounded-2xl bg-[#f8fafc] px-4 py-3 text-right">
            <div className="text-[12px] text-[#8e8e93]">{t('detail.channels', { defaultValue: 'Channels' })}</div>
            <div className="mt-1 text-[24px] font-semibold text-[#111827]">{agent.channelTypes.length}</div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <section className="rounded-3xl border border-black/[0.06] bg-white p-6">
          <h2 className="text-[18px] font-semibold text-[#111827]">
            {t('detail.metadata', { defaultValue: 'Metadata' })}
          </h2>
          <div className="mt-4">
            <DetailRow label={t('detail.agentId', { defaultValue: 'Agent ID' })} value={agent.id} />
            <DetailRow label={t('detail.model', { defaultValue: 'Model' })} value={agent.modelDisplay} />
            <DetailRow label={t('detail.workspace', { defaultValue: 'Workspace' })} value={agent.workspace} />
            <DetailRow label={t('detail.agentDir', { defaultValue: 'Agent directory' })} value={agent.agentDir} />
            <DetailRow label={t('detail.mainSessionKey', { defaultValue: 'Main session key' })} value={agent.mainSessionKey} />
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-black/[0.06] bg-white p-6">
            <h2 className="text-[18px] font-semibold text-[#111827]">
              {t('detail.hierarchy', { defaultValue: 'Hierarchy' })}
            </h2>
            <p className="mt-3 text-[14px] text-[#4b5563]">
              {hierarchySummary}
            </p>
            <div className="mt-4 space-y-3 text-[13px]">
              <DetailRow
                label={t('detail.reportsTo', { defaultValue: 'Reports to' })}
                value={reportsTo?.id ?? t('detail.none', { defaultValue: 'none' })}
              />
              <DetailRow
                label={t('detail.directReports', { defaultValue: 'Direct reports' })}
                value={directReports.length > 0 ? directReports.map((entry) => entry.id).join(', ') : t('detail.none', { defaultValue: 'none' })}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-black/[0.06] bg-white p-6">
            <h2 className="text-[18px] font-semibold text-[#111827]">
              {t('detail.channels', { defaultValue: 'Channels' })}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {agent.channelTypes.length > 0 ? (
                agent.channelTypes.map((channelType) => (
                  <span
                    key={channelType}
                    className="rounded-full border border-black/10 bg-[#f8fafc] px-3 py-1 text-[12px] text-[#374151]"
                  >
                    {channelType}
                  </span>
                ))
              ) : (
                <span className="text-[13px] text-[#8e8e93]">
                  {t('detail.noChannels', { defaultValue: 'No channels assigned.' })}
                </span>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AgentDetail;
