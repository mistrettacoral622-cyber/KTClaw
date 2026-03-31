/**
 * TaskCreationBubble Component
 * Phase 02-04: Inline task confirmation bubble for conversational task creation
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApprovalsStore } from '@/stores/approvals';
import { useAgentsStore } from '@/stores/agents';
import { useChatStore } from '@/stores/chat';
import type { TaskPriority } from '@/types/task';

interface TaskCreationBubbleProps {
  title: string;
  description: string;
  assigneeId?: string;
  priority?: TaskPriority;
  teamId?: string;
  teamName?: string;
  deadline?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function TaskCreationBubble({
  title,
  description,
  assigneeId,
  priority = 'medium',
  teamId,
  teamName,
  deadline,
  onConfirm,
  onCancel,
}: TaskCreationBubbleProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const createTask = useApprovalsStore((s) => s.createTask);
  const agents = useAgentsStore((s) => s.agents);
  const currentAgentId = useChatStore((s) => s.currentAgentId);

  // Per D-25: If no assignee specified, default to current agent
  const finalAssigneeId = assigneeId ?? currentAgentId;
  const assignee = agents.find((a) => a.id === finalAssigneeId);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await createTask({
        title,
        description,
        priority,
        assigneeId: finalAssigneeId,
        assigneeRole: assignee?.teamRole,
        teamId,
        teamName,
        deadline,
      });
      setConfirmed(true);
      onConfirm?.();
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
  };

  // After confirmation, show anchor card (per D-24)
  if (confirmed) {
    return (
      <Card className="inline-block max-w-md p-3 bg-accent/10 border-accent">
        <p className="text-sm font-medium text-accent-foreground">✓ 任务已创建</p>
        <p className="text-xs text-muted-foreground mt-1">{title}</p>
      </Card>
    );
  }

  // Confirmation bubble (per D-21, D-22, UI-SPEC)
  return (
    <Card className="inline-block max-w-md p-4 bg-accent/10 border-accent">
      <h4 className="text-sm font-semibold mb-3">创建任务</h4>
      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-muted-foreground">任务标题:</span>
          <span className="font-medium">{title}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">负责人:</span>
          <span className="font-medium">{assignee?.name ?? '未分配'}</span>
        </div>
        {teamName && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">团队:</span>
            <span className="font-medium">{teamName}</span>
          </div>
        )}
        {deadline && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">截止时间:</span>
            <span className="font-medium">{new Date(deadline).toLocaleDateString('zh-CN')}</span>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1"
        >
          {loading ? '创建中...' : '确认'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCancel}
          disabled={loading}
          className="flex-1"
        >
          取消
        </Button>
      </div>
    </Card>
  );
}
