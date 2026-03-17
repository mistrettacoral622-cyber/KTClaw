import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bot,
  Clock,
  Network,
  PanelLeft,
  PanelLeftClose,
  Settings as SettingsIcon,
  Terminal,
  Trash2,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settings';
import { useChatStore } from '@/stores/chat';
import { useGatewayStore } from '@/stores/gateway';
import { useAgentsStore } from '@/stores/agents';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { hostApiFetch } from '@/lib/host-api';
import { useTranslation } from 'react-i18next';
import { AccordionGroup } from '@/components/workbench/accordion-group';
import logoSvg from '@/assets/logo.svg';

function getAgentIdFromSessionKey(sessionKey: string): string {
  if (!sessionKey.startsWith('agent:')) return 'main';
  const [, agentId] = sessionKey.split(':');
  return agentId || 'main';
}

export function Sidebar() {
  const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useSettingsStore((state) => state.setSidebarCollapsed);

  const sessions = useChatStore((s) => s.sessions);
  const currentSessionKey = useChatStore((s) => s.currentSessionKey);
  const sessionLabels = useChatStore((s) => s.sessionLabels);
  const sessionLastActivity = useChatStore((s) => s.sessionLastActivity);
  const switchSession = useChatStore((s) => s.switchSession);
  const deleteSession = useChatStore((s) => s.deleteSession);
  const loadSessions = useChatStore((s) => s.loadSessions);
  const loadHistory = useChatStore((s) => s.loadHistory);

  const gatewayStatus = useGatewayStore((s) => s.status);
  const isGatewayRunning = gatewayStatus.state === 'running';

  useEffect(() => {
    if (!isGatewayRunning) return;
    let cancelled = false;
    const hasExistingMessages = useChatStore.getState().messages.length > 0;
    (async () => {
      await loadSessions();
      if (cancelled) return;
      await loadHistory(hasExistingMessages);
    })();
    return () => {
      cancelled = true;
    };
  }, [isGatewayRunning, loadHistory, loadSessions]);

  const agents = useAgentsStore((s) => s.agents);
  const fetchAgents = useAgentsStore((s) => s.fetchAgents);

  useEffect(() => {
    void fetchAgents();
  }, [fetchAgents]);

  const navigate = useNavigate();
  const isOnChat = useLocation().pathname === '/';
  const { t } = useTranslation(['common', 'chat']);
  const [sessionToDelete, setSessionToDelete] = useState<{ key: string; label: string } | null>(null);

  const getLocalizedLabel = (key: string, fallback: string) => {
    const translated = t(key);
    return translated === key ? fallback : translated;
  };

  const groupLabels = {
    avatars: getLocalizedLabel('sidebar.workObjects.clones', '分身'),
    teams: getLocalizedLabel('sidebar.workObjects.teams', '团队'),
    channels: getLocalizedLabel('sidebar.workObjects.imChannels', 'IM 频道'),
    tasks: getLocalizedLabel('sidebar.workObjects.cronTasks', '定时任务'),
    settings: getLocalizedLabel('sidebar.settings', '设置'),
  };

  const openDevConsole = async () => {
    try {
      const result = await hostApiFetch<{
        success: boolean;
        url?: string;
        error?: string;
      }>('/api/gateway/control-ui');
      if (result.success && result.url) {
        window.electron.openExternal(result.url);
      } else {
        console.error('Failed to get Dev Console URL:', result.error);
      }
    } catch (err) {
      console.error('Error opening Dev Console:', err);
    }
  };

  const getSessionLabel = (key: string, displayName?: string, label?: string) =>
    sessionLabels[key] ?? label ?? displayName ?? key;

  const agentNameById = useMemo(
    () => Object.fromEntries(agents.map((agent) => [agent.id, agent.name])),
    [agents],
  );

  const orderedSessions = useMemo(
    () => [...sessions].sort((a, b) => (sessionLastActivity[b.key] ?? 0) - (sessionLastActivity[a.key] ?? 0)),
    [sessions, sessionLastActivity],
  );

  const staticTeams = ['核心团队', '交付团队'];
  const staticChannels = ['Slack #clawx', '飞书 #openclaw'];
  const staticCronTasks = ['每日巡检', '周报汇总'];

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-r bg-[#eae8e1]/60 transition-all duration-300 dark:bg-background',
        sidebarCollapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className={cn('flex h-12 items-center p-2', sidebarCollapsed ? 'justify-center' : 'justify-between')}>
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2 overflow-hidden px-2">
            <img src={logoSvg} alt="ClawX" className="h-5 w-auto shrink-0" />
            <span className="truncate whitespace-nowrap text-sm font-semibold text-foreground/90">ClawX</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? <PanelLeft className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
        </Button>
      </div>

      <div className={cn('flex flex-1 flex-col px-2', sidebarCollapsed ? 'gap-1' : 'gap-2')}>
        <AccordionGroup
          title={groupLabels.avatars}
          icon={<Bot className="h-[18px] w-[18px]" strokeWidth={2} />}
          collapsed={sidebarCollapsed}
          defaultOpen
        >
          {orderedSessions.length > 0 ? (
            orderedSessions.map((session) => {
              const agentId = getAgentIdFromSessionKey(session.key);
              const agentName = agentNameById[agentId] || agentId;
              return (
                <div key={session.key} className="group relative flex items-center">
                  <button
                    onClick={() => {
                      switchSession(session.key);
                      navigate('/');
                    }}
                    className={cn(
                      'w-full rounded-lg px-2.5 py-1.5 pr-7 text-left text-[13px] transition-colors',
                      'hover:bg-black/5 dark:hover:bg-white/5',
                      isOnChat && currentSessionKey === session.key
                        ? 'bg-black/5 font-medium text-foreground dark:bg-white/10'
                        : 'text-foreground/75',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-medium text-foreground/70 dark:bg-white/[0.08]">
                        {agentName}
                      </span>
                      <span className="truncate">{getSessionLabel(session.key, session.displayName, session.label)}</span>
                    </div>
                  </button>
                  <button
                    aria-label="Delete session"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSessionToDelete({
                        key: session.key,
                        label: getSessionLabel(session.key, session.displayName, session.label),
                      });
                    }}
                    className={cn(
                      'absolute right-1 flex items-center justify-center rounded p-0.5 transition-opacity',
                      'opacity-0 group-hover:opacity-100',
                      'text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
                    )}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="rounded-lg px-2.5 py-1.5 text-[12px] text-muted-foreground">{t('chat:noSessions')}</div>
          )}
        </AccordionGroup>

        <AccordionGroup
          title={groupLabels.teams}
          icon={<Users className="h-[18px] w-[18px]" strokeWidth={2} />}
          collapsed={sidebarCollapsed}
          defaultOpen
        >
          {staticTeams.map((team) => (
            <div key={team} className="rounded-lg px-2.5 py-1.5 text-[13px] text-foreground/75">
              {team}
            </div>
          ))}
        </AccordionGroup>

        <AccordionGroup
          title={groupLabels.channels}
          icon={<Network className="h-[18px] w-[18px]" strokeWidth={2} />}
          collapsed={sidebarCollapsed}
          defaultOpen
        >
          {staticChannels.map((channel) => (
            <div key={channel} className="rounded-lg px-2.5 py-1.5 text-[13px] text-foreground/75">
              {channel}
            </div>
          ))}
        </AccordionGroup>

        <AccordionGroup
          title={groupLabels.tasks}
          icon={<Clock className="h-[18px] w-[18px]" strokeWidth={2} />}
          collapsed={sidebarCollapsed}
          defaultOpen
        >
          {staticCronTasks.map((task) => (
            <div key={task} className="rounded-lg px-2.5 py-1.5 text-[13px] text-foreground/75">
              {task}
            </div>
          ))}
        </AccordionGroup>
      </div>

      <div className="mt-auto p-2">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] font-medium transition-colors',
              'text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5',
              isActive && 'bg-black/5 text-foreground dark:bg-white/10',
              sidebarCollapsed && 'justify-center px-0',
            )
          }
        >
          {({ isActive }) => (
            <>
              <div className={cn('flex shrink-0 items-center justify-center', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                <SettingsIcon className="h-[18px] w-[18px]" strokeWidth={2} />
              </div>
              {!sidebarCollapsed && <span className="flex-1 truncate whitespace-nowrap">{groupLabels.settings}</span>}
            </>
          )}
        </NavLink>

        <Button
          variant="ghost"
          className={cn(
            'mt-1 h-auto w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] font-medium transition-colors',
            'text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5',
            sidebarCollapsed ? 'justify-center px-0' : 'justify-start',
          )}
          onClick={openDevConsole}
        >
          <div className="flex shrink-0 items-center justify-center text-muted-foreground">
            <Terminal className="h-[18px] w-[18px]" strokeWidth={2} />
          </div>
          {!sidebarCollapsed && (
            <span className="flex-1 overflow-hidden text-left text-ellipsis whitespace-nowrap">
              {t('common:sidebar.openClawPage')}
            </span>
          )}
        </Button>
      </div>

      <ConfirmDialog
        open={!!sessionToDelete}
        title={t('common:actions.confirm')}
        message={t('common:sidebar.deleteSessionConfirm', { label: sessionToDelete?.label })}
        confirmLabel={t('common:actions.delete')}
        cancelLabel={t('common:actions.cancel')}
        variant="destructive"
        onConfirm={async () => {
          if (!sessionToDelete) return;
          await deleteSession(sessionToDelete.key);
          if (currentSessionKey === sessionToDelete.key) navigate('/');
          setSessionToDelete(null);
        }}
        onCancel={() => setSessionToDelete(null)}
      />
    </aside>
  );
}
