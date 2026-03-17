import { useEffect, useState } from 'react';
import { Monitor, Moon, RefreshCw, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ProvidersSettings } from '@/components/settings/ProvidersSettings';
import { UpdateSettings } from '@/components/settings/UpdateSettings';
import { SettingsNav, type SettingsGroupId } from '@/components/settings-center/settings-nav';
import { SettingsSectionCard } from '@/components/settings-center/settings-section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { invokeIpc, toUserMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useGatewayStore } from '@/stores/gateway';
import { useSettingsStore } from '@/stores/settings';
import { useUpdateStore } from '@/stores/update';

const GROUP_ITEMS: Array<{ id: SettingsGroupId; label: string; description: string }> = [
  { id: 'basic', label: '基础', description: '外观与通用偏好' },
  { id: 'workflow', label: '工作流', description: '网关与运行流程' },
  { id: 'capability', label: '能力', description: '模型与工具能力' },
  { id: 'governance', label: '治理', description: '更新与治理策略' },
];

export function Settings() {
  const { t } = useTranslation('settings');
  const {
    theme,
    setTheme,
    language,
    setLanguage,
    launchAtStartup,
    setLaunchAtStartup,
    gatewayAutoStart,
    setGatewayAutoStart,
    proxyEnabled,
    proxyServer,
    proxyHttpServer,
    proxyHttpsServer,
    proxyAllServer,
    proxyBypassRules,
    setProxyEnabled,
    setProxyServer,
    setProxyHttpServer,
    setProxyHttpsServer,
    setProxyAllServer,
    setProxyBypassRules,
    autoCheckUpdate,
    setAutoCheckUpdate,
    autoDownloadUpdate,
    setAutoDownloadUpdate,
    devModeUnlocked,
    setDevModeUnlocked,
    telemetryEnabled,
    setTelemetryEnabled,
  } = useSettingsStore();

  const { status: gatewayStatus, restart: restartGateway } = useGatewayStore();
  const currentVersion = useUpdateStore((state) => state.currentVersion);
  const updateSetAutoDownload = useUpdateStore((state) => state.setAutoDownload);

  const [activeGroup, setActiveGroup] = useState<SettingsGroupId>('basic');
  const [proxyEnabledDraft, setProxyEnabledDraft] = useState(proxyEnabled);
  const [proxyServerDraft, setProxyServerDraft] = useState(proxyServer);
  const [proxyHttpServerDraft, setProxyHttpServerDraft] = useState(proxyHttpServer);
  const [proxyHttpsServerDraft, setProxyHttpsServerDraft] = useState(proxyHttpsServer);
  const [proxyAllServerDraft, setProxyAllServerDraft] = useState(proxyAllServer);
  const [proxyBypassRulesDraft, setProxyBypassRulesDraft] = useState(proxyBypassRules);
  const [savingProxy, setSavingProxy] = useState(false);
  const [doctorRunning, setDoctorRunning] = useState<'diagnose' | 'fix' | null>(null);
  const [doctorSummary, setDoctorSummary] = useState('');

  useEffect(() => setProxyEnabledDraft(proxyEnabled), [proxyEnabled]);
  useEffect(() => setProxyServerDraft(proxyServer), [proxyServer]);
  useEffect(() => setProxyHttpServerDraft(proxyHttpServer), [proxyHttpServer]);
  useEffect(() => setProxyHttpsServerDraft(proxyHttpsServer), [proxyHttpsServer]);
  useEffect(() => setProxyAllServerDraft(proxyAllServer), [proxyAllServer]);
  useEffect(() => setProxyBypassRulesDraft(proxyBypassRules), [proxyBypassRules]);

  const saveProxySettings = async () => {
    setSavingProxy(true);
    try {
      const normalizedProxyServer = proxyServerDraft.trim();
      const normalizedHttpServer = proxyHttpServerDraft.trim();
      const normalizedHttpsServer = proxyHttpsServerDraft.trim();
      const normalizedAllServer = proxyAllServerDraft.trim();
      const normalizedBypassRules = proxyBypassRulesDraft.trim();
      await invokeIpc('settings:setMany', {
        proxyEnabled: proxyEnabledDraft,
        proxyServer: normalizedProxyServer,
        proxyHttpServer: normalizedHttpServer,
        proxyHttpsServer: normalizedHttpsServer,
        proxyAllServer: normalizedAllServer,
        proxyBypassRules: normalizedBypassRules,
      });
      setProxyEnabled(proxyEnabledDraft);
      setProxyServer(normalizedProxyServer);
      setProxyHttpServer(normalizedHttpServer);
      setProxyHttpsServer(normalizedHttpsServer);
      setProxyAllServer(normalizedAllServer);
      setProxyBypassRules(normalizedBypassRules);
      toast.success(t('gateway.proxySaved'));
    } catch (error) {
      toast.error(`${t('gateway.proxySaveFailed')}: ${toUserMessage(error)}`);
    } finally {
      setSavingProxy(false);
    }
  };

  const runDoctor = async (mode: 'diagnose' | 'fix') => {
    setDoctorRunning(mode);
    try {
      const result = await invokeIpc<{ success: boolean; exitCode?: number; stderr?: string; stdout?: string }>('hostapi:fetch', {
        route: '/api/app/openclaw-doctor',
        init: {
          method: 'POST',
          body: JSON.stringify({ mode }),
        },
      });
      const summary = result?.success
        ? `${mode}: success (exit=${result.exitCode ?? 0})`
        : `${mode}: failed (exit=${result?.exitCode ?? 'n/a'}) ${result?.stderr ?? ''}`;
      setDoctorSummary(summary);
      if (result?.success) {
        toast.success(mode === 'fix' ? t('developer.doctorFixSucceeded') : t('developer.doctorSucceeded'));
      } else {
        toast.error(mode === 'fix' ? t('developer.doctorFixFailed') : t('developer.doctorFailed'));
      }
    } catch (error) {
      setDoctorSummary(`${mode}: ${toUserMessage(error)}`);
      toast.error(toUserMessage(error));
    } finally {
      setDoctorRunning(null);
    }
  };

  return (
    <div className="flex flex-col -m-6 dark:bg-background h-[calc(100vh-2.5rem)] overflow-hidden">
      <div className="w-full max-w-6xl mx-auto flex flex-col h-full p-8 pt-12">
        <div className="mb-8 shrink-0">
          <h1 className="text-4xl md:text-5xl font-serif text-foreground mb-2 font-normal tracking-tight" style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif' }}>
            {t('title')}
          </h1>
          <p className="text-[16px] text-foreground/70">{t('subtitle')}</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 min-h-0 flex-1">
          <SettingsNav items={GROUP_ITEMS} activeId={activeGroup} onChange={setActiveGroup} />

          <div className="flex-1 min-h-0 overflow-y-auto pr-2 -mr-2 pb-8 space-y-5">
            {activeGroup === 'basic' && (
              <>
                <SettingsSectionCard title="基础设置" description="界面外观与客户端偏好。">
                  <div className="space-y-3">
                    <Label className="text-[15px] font-medium text-foreground/80">{t('appearance.theme')}</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button variant={theme === 'light' ? 'secondary' : 'outline'} className={cn('rounded-full px-5 h-10 border-black/10 dark:border-white/10', theme === 'light' ? 'bg-black/5 dark:bg-white/10 text-foreground' : 'bg-transparent text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5')} onClick={() => setTheme('light')}>
                        <Sun className="h-4 w-4 mr-2" />
                        {t('appearance.light')}
                      </Button>
                      <Button variant={theme === 'dark' ? 'secondary' : 'outline'} className={cn('rounded-full px-5 h-10 border-black/10 dark:border-white/10', theme === 'dark' ? 'bg-black/5 dark:bg-white/10 text-foreground' : 'bg-transparent text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5')} onClick={() => setTheme('dark')}>
                        <Moon className="h-4 w-4 mr-2" />
                        {t('appearance.dark')}
                      </Button>
                      <Button variant={theme === 'system' ? 'secondary' : 'outline'} className={cn('rounded-full px-5 h-10 border-black/10 dark:border-white/10', theme === 'system' ? 'bg-black/5 dark:bg-white/10 text-foreground' : 'bg-transparent text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5')} onClick={() => setTheme('system')}>
                        <Monitor className="h-4 w-4 mr-2" />
                        {t('appearance.system')}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[15px] font-medium text-foreground/80">{t('appearance.language')}</Label>
                    <div className="flex flex-wrap gap-2">
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <Button key={lang.code} variant={language === lang.code ? 'secondary' : 'outline'} onClick={() => setLanguage(lang.code)}>
                          {lang.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-[15px] font-medium text-foreground/80">{t('appearance.launchAtStartup')}</Label>
                      <p className="text-[13px] text-muted-foreground mt-1">{t('appearance.launchAtStartupDesc')}</p>
                    </div>
                    <Switch checked={launchAtStartup} onCheckedChange={setLaunchAtStartup} />
                  </div>
                </SettingsSectionCard>
                <SettingsSectionCard title="关于 ClawX">
                  <p className="text-[14px] text-muted-foreground">{t('about.version', { version: currentVersion })}</p>
                </SettingsSectionCard>
              </>
            )}

            {activeGroup === 'workflow' && (
              <>
                <SettingsSectionCard title="网关与运行流程" description="复用当前网关状态与自动启动设置。">
                  <p className="text-sm text-muted-foreground">{t('gateway.status')}: {gatewayStatus.state} ({t('gateway.port')}: {gatewayStatus.port})</p>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={restartGateway}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t('common:actions.restart')}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-[15px] font-medium text-foreground">{t('gateway.autoStart')}</Label>
                      <p className="text-[13px] text-muted-foreground mt-1">{t('gateway.autoStartDesc')}</p>
                    </div>
                    <Switch checked={gatewayAutoStart} onCheckedChange={setGatewayAutoStart} />
                  </div>
                </SettingsSectionCard>
                <SettingsSectionCard title="会话模板与自动化" description="静态占位：后续用于工作流模板与编排策略。">
                  <p className="text-sm text-muted-foreground">即将支持模板化任务流程。</p>
                </SettingsSectionCard>
              </>
            )}

            {activeGroup === 'capability' && (
              <>
                <SettingsSectionCard title="模型与服务提供商" description="复用现有 Provider 配置区域。">
                  <ProvidersSettings />
                </SettingsSectionCard>
                <SettingsSectionCard title="能力编排" description="静态占位：后续用于技能组合、多Agent策略。">
                  <p className="text-sm text-muted-foreground">即将支持能力包与策略模板。</p>
                </SettingsSectionCard>
              </>
            )}

            {activeGroup === 'governance' && (
              <>
                <SettingsSectionCard title={t('updates.title')} description="版本更新策略与下载行为。">
                  <UpdateSettings />
                  <div className="flex items-center justify-between">
                    <Label>{t('updates.autoCheck')}</Label>
                    <Switch checked={autoCheckUpdate} onCheckedChange={setAutoCheckUpdate} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>{t('updates.autoDownload')}</Label>
                    <Switch checked={autoDownloadUpdate} onCheckedChange={(value) => {
                      setAutoDownloadUpdate(value);
                      updateSetAutoDownload(value);
                    }} />
                  </div>
                </SettingsSectionCard>

                <SettingsSectionCard title={t('developer.title')} description="复用开发者、代理网络和代理配置。">
                  <div className="flex items-center justify-between">
                    <Label>{t('advanced.devMode')}</Label>
                    <Switch checked={devModeUnlocked} onCheckedChange={setDevModeUnlocked} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>{t('advanced.telemetry')}</Label>
                    <Switch checked={telemetryEnabled} onCheckedChange={setTelemetryEnabled} />
                  </div>

                  {devModeUnlocked && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Gateway Proxy</Label>
                        <Switch checked={proxyEnabledDraft} onCheckedChange={setProxyEnabledDraft} />
                      </div>
                      {proxyEnabledDraft && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input value={proxyServerDraft} onChange={(event) => setProxyServerDraft(event.target.value)} placeholder="proxyServer" />
                          <Input value={proxyHttpServerDraft} onChange={(event) => setProxyHttpServerDraft(event.target.value)} placeholder="proxyHttpServer" />
                          <Input value={proxyHttpsServerDraft} onChange={(event) => setProxyHttpsServerDraft(event.target.value)} placeholder="proxyHttpsServer" />
                          <Input value={proxyAllServerDraft} onChange={(event) => setProxyAllServerDraft(event.target.value)} placeholder="proxyAllServer" />
                          <Input value={proxyBypassRulesDraft} onChange={(event) => setProxyBypassRulesDraft(event.target.value)} placeholder="proxyBypassRules" className="sm:col-span-2" />
                          <Button variant="outline" onClick={saveProxySettings} disabled={savingProxy} className="sm:col-span-2">
                            {savingProxy ? t('common:status.saving') : t('common:actions.save')}
                          </Button>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => void runDoctor('diagnose')} disabled={doctorRunning !== null}>
                          {doctorRunning === 'diagnose' ? t('common:status.running') : t('developer.runDoctor')}
                        </Button>
                        <Button variant="outline" onClick={() => void runDoctor('fix')} disabled={doctorRunning !== null}>
                          {doctorRunning === 'fix' ? t('common:status.running') : t('developer.runDoctorFix')}
                        </Button>
                      </div>
                      {doctorSummary ? <p className="text-xs text-muted-foreground">{doctorSummary}</p> : null}
                    </div>
                  )}
                </SettingsSectionCard>

                <SettingsSectionCard title="审计与策略" description="静态占位：后续用于策略审批、审计日志和合规控制。">
                  <p className="text-sm text-muted-foreground">即将支持组织级治理能力。</p>
                </SettingsSectionCard>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
