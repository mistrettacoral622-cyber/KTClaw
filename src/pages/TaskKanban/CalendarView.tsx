/**
 * CalendarView component for Task Kanban
 * Phase 02 Plan 02 Task 2 - Deeply customized calendar with modern styling
 */
import { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useApprovalsStore } from '@/stores/approvals';
import { useAgentsStore } from '@/stores/agents';
import type { EventInput, EventContentArg } from '@fullcalendar/core';
import type { WorkState } from '@/types/task';
import { cn } from '@/lib/utils';
import './calendar-custom.css';

interface CalendarViewProps {
  onTaskClick?: (taskId: string) => void;
}

function getWorkStateDot(workState: WorkState) {
  const colors: Record<WorkState, string> = {
    idle: 'bg-gray-400',
    starting: 'bg-blue-400',
    working: 'bg-blue-500',
    blocked: 'bg-red-500',
    waiting_approval: 'bg-yellow-500',
    scheduled: 'bg-purple-500',
    done: 'bg-green-500',
    failed: 'bg-red-600',
  };
  return colors[workState] || 'bg-gray-400';
}

function renderEventContent(eventInfo: EventContentArg) {
  const { event } = eventInfo;
  const isTeamTask = event.title.startsWith('团队');
  const workState = event.extendedProps.workState as WorkState || 'idle';

  return (
    <div
      className={cn(
        'px-2 py-1 rounded-md text-xs font-medium truncate cursor-pointer transition-all hover:brightness-95',
        isTeamTask
          ? 'bg-purple-100 border border-purple-300 text-purple-800'
          : 'bg-cyan-100 border border-cyan-300 text-cyan-800'
      )}
    >
      <div className="flex items-center gap-1">
        {workState !== 'idle' && (
          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', getWorkStateDot(workState))} />
        )}
        <span className="truncate">{event.title}</span>
      </div>
    </div>
  );
}

export function CalendarView({ onTaskClick }: CalendarViewProps) {
  const tasks = useApprovalsStore((s) => s.tasks);
  const agents = useAgentsStore((s) => s.agents);

  // Filter tasks with deadlines and convert to calendar events
  const events = useMemo<EventInput[]>(() => {
    return tasks
      .filter((task) => task.deadline)
      .map((task) => {
        const agent = agents.find((a) => a.id === task.assigneeId);
        return {
          id: task.id,
          title: task.isTeamTask ? `团队${task.teamName}：${task.title}` : task.title,
          start: task.deadline,
          allDay: true,
          extendedProps: {
            taskId: task.id,
            assigneeName: agent?.name ?? '未分配',
            priority: task.priority,
            status: task.status,
            workState: task.workState,
            isTeamTask: task.isTeamTask,
          },
        };
      });
  }, [tasks, agents]);

  // Empty state
  if (events.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-500">暂无排期任务</p>
          <p className="text-sm text-gray-400 mt-2">
            为任务设置截止日期后,将在日程视图中显示
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-6 calendar-container">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'timeGridWeek,dayGridMonth,dayGridYear',
        }}
        events={events}
        eventContent={renderEventContent}
        eventClick={(info) => {
          if (onTaskClick) {
            onTaskClick(info.event.id);
          }
        }}
        height="100%"
        locale="zh-cn"
        buttonText={{
          today: '今天',
          month: '月视图',
          week: '周视图',
          year: '年视图',
        }}
        dayMaxEvents={3}
        moreLinkText="更多"
      />
    </div>
  );
}
