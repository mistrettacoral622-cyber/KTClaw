import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { AgentSummary } from '@/types/agent';
import { MemberMemoryTab } from './MemberMemoryTab';
import { MemberSkillsTab } from './MemberSkillsTab';
import { MemberActivityTab } from './MemberActivityTab';

interface MemberDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: AgentSummary | null;
  teamId: string;
  isLeader: boolean;
  ownedEntryPoints: string[];
  activity?: {
    statusLabel?: string;
    currentWorkTitles?: string[];
    blockingReason?: string | null;
    nextStep?: string;
  };
  onRemoveMember: (agentId: string) => Promise<void>;
  onOpenChat: (agent: AgentSummary) => void;
}

export function MemberDetailSheet({
  open,
  onOpenChange,
  agent,
  teamId,
  isLeader,
  ownedEntryPoints,
  activity,
  onRemoveMember,
  onOpenChat,
}: MemberDetailSheetProps) {
  const { t } = useTranslation('common');
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!agent) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-[520px]">
          <SheetHeader>
            <SheetTitle>{agent.name}</SheetTitle>
            <SheetDescription>
              {t('teamMap.memberDetail.description', {
                defaultValue: 'Manage this team member from the current team map.',
              })}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            <Tabs defaultValue="overview">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">
                  {t('teamMap.memberDetail.tabs.overview', { defaultValue: 'Overview' })}
                </TabsTrigger>
                <TabsTrigger value="memory">
                  {t('teamMap.memberDetail.tabs.memory', { defaultValue: 'Memory' })}
                </TabsTrigger>
                <TabsTrigger value="skills">
                  {t('teamMap.memberDetail.tabs.skills', { defaultValue: 'Skills' })}
                </TabsTrigger>
                <TabsTrigger value="activity">
                  {t('teamMap.memberDetail.tabs.activity', { defaultValue: 'Activity' })}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 pt-4">
                <div className="flex flex-wrap gap-3">
                  <Button type="button" onClick={() => onOpenChat(agent)}>
                    {t('teamMap.memberDetail.openChat', { defaultValue: 'Open Chat' })}
                  </Button>
                  {!isLeader ? (
                    <Button type="button" variant="destructive" onClick={() => setConfirmOpen(true)}>
                      {t('teamMap.memberDetail.removeFromTeam', { defaultValue: 'Remove from Team' })}
                    </Button>
                  ) : null}
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">
                      {t('teamMap.memberDetail.fields.role', { defaultValue: 'Role' })}
                    </span>
                    <span className="font-medium text-slate-900">
                      {t(`teamMap.role.${agent.teamRole}`, { defaultValue: agent.teamRole })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">
                      {t('teamMap.memberDetail.fields.chatAccess', { defaultValue: 'Chat Access' })}
                    </span>
                    <span className="font-medium text-slate-900">
                      {t(`teamMap.access.${agent.chatAccess}`, { defaultValue: agent.chatAccess })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">
                      {t('teamMap.memberDetail.fields.responsibility', { defaultValue: 'Responsibility' })}
                    </span>
                    <span className="font-medium text-slate-900">
                      {agent.responsibility || t('teamMap.memberDetail.notSet', { defaultValue: 'Not set' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">
                      {t('teamMap.memberDetail.fields.team', { defaultValue: 'Team' })}
                    </span>
                    <span className="font-medium text-slate-900">{teamId}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">
                      {t('teamMap.memberDetail.fields.ownedEntryPoints', { defaultValue: 'Owned Entry Points' })}
                    </span>
                    <span className="font-medium text-slate-900">
                      {ownedEntryPoints.length > 0
                        ? ownedEntryPoints.join(', ')
                        : t('teamMap.memberDetail.notSet', { defaultValue: 'Not set' })}
                    </span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="memory" className="pt-4">
                <MemberMemoryTab agent={agent} />
              </TabsContent>

              <TabsContent value="skills" className="pt-4">
                <MemberSkillsTab agent={agent} />
              </TabsContent>

              <TabsContent value="activity" className="pt-4">
                <MemberActivityTab
                  agent={agent}
                  statusLabel={activity?.statusLabel}
                  currentWorkTitles={activity?.currentWorkTitles}
                  blockingReason={activity?.blockingReason}
                  nextStep={activity?.nextStep}
                />
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmOpen}
        title={t('teamMap.memberDetail.removeFromTeam', { defaultValue: 'Remove from Team' })}
        message={t('teamMap.memberDetail.removeConfirm', {
          agentName: agent.name,
          defaultValue: 'Are you sure you want to remove {{agentName}} from this team? This does not delete the agent.',
        })}
        confirmLabel={t('teamMap.memberDetail.removeFromTeam', { defaultValue: 'Remove from Team' })}
        cancelLabel={t('actions.cancel', { defaultValue: 'Cancel' })}
        variant="destructive"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          await onRemoveMember(agent.id);
          setConfirmOpen(false);
        }}
      />
    </>
  );
}
