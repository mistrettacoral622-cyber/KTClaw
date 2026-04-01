/**
 * SessionItem Component
 * Displays a rich session item with avatar, name, preview, time, unread badge, and agent status.
 */

import { Pin, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { ChatSession } from '@/stores/chat';
import { formatRelativeTime } from '@/lib/session-search';

interface SessionItemProps {
  session: ChatSession;
  label: string;
  isPinned: boolean;
  isActive: boolean;
  messagePreview?: string;
  onClick: () => void;
  onPinToggle: () => void;
  onDelete: () => void;
}

export function SessionItem({
  session,
  label,
  isPinned,
  isActive,
  messagePreview,
  onClick,
  onPinToggle,
  onDelete,
}: SessionItemProps) {
  const initials = label.slice(0, 1).toUpperCase();
  const displayName = session.isTeamSession && session.teamName
    ? `团队${session.teamName}：${label}`
    : label;
  const relativeTime = formatRelativeTime(session.updatedAt);

  // Agent status color
  const statusColor = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    busy: 'bg-yellow-500',
  }[session.agentStatus || 'offline'];

  return (
    <div className="group relative">
      <button
        type="button"
        className={cn(
          'flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors',
          isActive
            ? 'bg-accent text-accent-foreground font-medium border-l-4 border-primary'
            : 'text-[#000000] hover:bg-[#e5e5ea]',
        )}
        onClick={onClick}
      >
        {/* Avatar with status indicator */}
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-muted text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          {/* Agent status dot */}
          <div
            className={cn(
              'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white',
              statusColor,
            )}
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Name row */}
          <div className="flex items-center gap-2 mb-1">
            <span className="truncate font-medium">{displayName}</span>
            {isPinned && (
              <Pin
                className="h-3.5 w-3.5 shrink-0 text-primary"
                aria-label="Pinned session"
              />
            )}
          </div>

          {/* Message preview and time row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {messagePreview && (
                <p className="truncate text-xs text-muted-foreground">
                  {messagePreview}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {session.unreadCount && session.unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="h-5 min-w-[20px] px-1.5 text-xs"
                >
                  {session.unreadCount > 99 ? '99+' : session.unreadCount}
                </Badge>
              )}
              {relativeTime && (
                <span className="text-xs text-muted-foreground">
                  {relativeTime}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>

      {/* Action buttons (visible on hover) */}
      <div className="absolute right-2 top-2 flex items-center gap-1">
        <button
          type="button"
          aria-label={isPinned ? 'Unpin' : 'Pin'}
          className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-accent-foreground group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onPinToggle();
          }}
        >
          <Pin className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Delete"
          className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-accent-foreground group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
