/**
 * Desktop Behavior Settings Panel
 * Real controls for startMinimized, minimizeToTray, and system notifications.
 */
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/stores/settings';

export function DesktopBehaviorPanel() {
  const {
    startMinimized,
    setStartMinimized,
    minimizeToTray,
    setMinimizeToTray,
  } = useSettingsStore();

  return (
    <div className="space-y-3">
      <ToggleRow
        label="开机后最小化启动"
        description="通过系统自启动（--autostart）启动时，窗口保持隐藏，可从托盘图标打开。手动启动时始终显示窗口。"
        checked={startMinimized}
        onCheckedChange={setStartMinimized}
        testId="desktop-start-minimized"
      />

      <ToggleRow
        label="关闭时隐藏到托盘"
        description="点击顶部关闭按钮时不退出进程，维持 Cron 和通道在线。可从托盘图标重新打开窗口。"
        checked={minimizeToTray}
        onCheckedChange={setMinimizeToTray}
        testId="desktop-minimize-to-tray"
      />

      <div className="rounded-xl border border-black/5 bg-[#f8fafc] px-4 py-3">
        <p className="text-[13px] font-medium text-[#0f172a]">系统通知</p>
        <p className="mt-1 text-[12px] text-[#64748b]">
          以下事件会触发桌面系统通知（需系统通知权限）：
        </p>
        <ul className="mt-2 space-y-1 text-[12px] text-[#475569]">
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
            任务完成（task-completed）
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
            同步失败（sync-failed）
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
            需要人工介入（human-intervention-required）
          </li>
        </ul>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  testId,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="flex items-center justify-between gap-4 rounded-xl border border-black/5 bg-[#f8fafc] px-4 py-3"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-[#0f172a]">{label}</p>
        <p className="mt-1 text-[12px] text-[#64748b]">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}
