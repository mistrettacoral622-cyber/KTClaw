import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/stores/settings';

export function DesktopBehaviorPanel() {
  const {
    startMinimized,
    setStartMinimized,
    minimizeToTray,
    setMinimizeToTray,
    notificationsEnabled,
    setNotificationsEnabled,
  } = useSettingsStore();

  return (
    <div className="space-y-3">
      <ToggleRow
        label="自启动时最小化"
        description="通过系统自启动启动 KTClaw 时保持窗口隐藏；手动启动仍会正常显示窗口。"
        checked={startMinimized}
        onCheckedChange={setStartMinimized}
        testId="desktop-start-minimized"
      />

      <ToggleRow
        label="关闭时隐藏到托盘"
        description="点击关闭按钮时不退出进程，保持通道和定时任务继续在后台运行。"
        checked={minimizeToTray}
        onCheckedChange={setMinimizeToTray}
        testId="desktop-minimize-to-tray"
      />

      <ToggleRow
        label="系统通知"
        description="允许为任务完成、同步失败和人工介入请求发送桌面通知。"
        checked={notificationsEnabled}
        onCheckedChange={setNotificationsEnabled}
        testId="desktop-system-notifications"
      />

      <div className="rounded-xl border border-black/5 bg-[#f8fafc] px-4 py-3">
        <p className="text-[13px] font-medium text-[#0f172a]">通知事件</p>
        <p className="mt-1 text-[12px] text-[#64748b]">
          启用后，KTClaw 会在以下场景发送桌面通知：
        </p>
        <ul className="mt-2 space-y-1 text-[12px] text-[#475569]">
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
            任务完成
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
            同步失败
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
            需要人工介入
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
