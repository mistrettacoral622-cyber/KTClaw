import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TeamSummary, TeamStatus } from '@/types/team';
import { Trash2 } from 'lucide-react';

interface TeamCardProps {
  team: TeamSummary;
  onDelete: (teamId: string) => void;
}

function formatLastActive(ts: number | undefined): string {
  if (!ts) return '从未活跃';
  const diff = Date.now() - ts;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return `${Math.floor(diff / 86_400_000)} 天前`;
}

function getStatusConfig(status: TeamStatus): { variant: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive'; text: string; className: string } {
  switch (status) {
    case 'active':
      return {
        variant: 'default',
        text: '活跃',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    case 'idle':
      return {
        variant: 'secondary',
        text: '空闲',
        className: 'bg-slate-100 text-slate-500 border-slate-200',
      };
    case 'blocked':
      return {
        variant: 'warning',
        text: '阻塞',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
      };
  }
}

export function TeamCard({ team, onDelete }: TeamCardProps) {
  const statusConfig = getStatusConfig(team.status);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(team.id);
  };

  // Calculate overflow count for member avatars
  const displayAvatars = team.memberAvatars.slice(0, 3);
  const overflowCount = team.memberCount > 4 ? team.memberCount - 4 : 0;

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}
      className="group relative flex h-full flex-col rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition-all"
    >
      <Link
        to={`/team-map/${team.id}`}
        className="flex flex-1 flex-col"
      >
        {/* Top: Team Name */}
        <h3 className="mb-4 text-xl font-semibold text-slate-900">
          {team.name}
        </h3>

        {/* Middle: Leader + Members */}
        <div className="mb-4 space-y-3">
          {/* Leader Section */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
              {team.leaderName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-slate-700">
              {team.leaderName}
            </span>
            <span className="text-xs text-slate-400">Leader</span>
          </div>

          {/* Members Section */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {displayAvatars.map((member) => (
                <div
                  key={member.id}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-slate-600 text-xs font-medium"
                  title={member.name}
                  role="img"
                  aria-label={member.name}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {overflowCount > 0 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-slate-600 text-xs font-semibold">
                  +{overflowCount}
                </div>
              )}
            </div>
            <span className="text-sm text-slate-500">
              {team.memberCount} 成员
            </span>
          </div>
        </div>

        {/* Bottom: Status + Tasks + Description */}
        <div className="mt-auto space-y-3">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <Badge className={cn('border', statusConfig.className)}>
              {statusConfig.text}
            </Badge>
            <span>{formatLastActive(team.lastActiveTime)}</span>
            <span>{team.activeTaskCount} 个任务</span>
          </div>

          <p className="line-clamp-2 text-sm text-slate-600">
            {team.description || '暂无职责描述'}
          </p>
        </div>
      </Link>

      {/* Delete Button (hover visible) */}
      <button
        onClick={handleDelete}
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-400 opacity-0 shadow-sm transition-all hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
        aria-label="删除"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
