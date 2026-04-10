import { SettingsSectionCard } from '@/components/settings-center/settings-section-card';
import { useSettingsStore } from '@/stores/settings';

export function SettingsToolPermissionsPanel() {
  const globalRiskLevel = useSettingsStore((s) => s.globalRiskLevel);
  const fileAcl = useSettingsStore((s) => s.fileAcl);
  const terminalAcl = useSettingsStore((s) => s.terminalAcl);
  const networkAcl = useSettingsStore((s) => s.networkAcl);
  const setGlobalRiskLevel = useSettingsStore((s) => s.setGlobalRiskLevel);
  const setFileAcl = useSettingsStore((s) => s.setFileAcl);
  const setTerminalAcl = useSettingsStore((s) => s.setTerminalAcl);
  const setNetworkAcl = useSettingsStore((s) => s.setNetworkAcl);

  return (
    <SettingsSectionCard title="工具权限">
      <div className="space-y-4 text-[13px]">
        <div>
          <label className="mb-1 block font-medium text-[#0f172a]">风险级别</label>
          <select
            data-testid="global-risk-level-select"
            value={globalRiskLevel}
            onChange={(event) => setGlobalRiskLevel(event.target.value as 'standard' | 'strict' | 'permissive')}
            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] text-[#0f172a]"
          >
            <option value="permissive">宽松（Permissive）- 允许并审计全部操作</option>
            <option value="standard">标准（Standard）- 允许读取，写入需确认</option>
            <option value="strict">严格（Strict）- 阻止写入、执行和网络</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block font-medium text-[#0f172a]">允许的操作类型</label>
          {[
            { label: '文件写入', value: fileAcl, set: setFileAcl, testId: 'file-acl-toggle' },
            { label: '终端执行', value: terminalAcl, set: setTerminalAcl, testId: 'terminal-acl-toggle' },
            { label: '网络 / 包管理器', value: networkAcl, set: setNetworkAcl, testId: 'network-acl-toggle' },
          ].map(({ label, value, set, testId }) => (
            <div key={testId} className="flex items-center justify-between">
              <span className="text-[#475569]">{label}</span>
              <button
                data-testid={testId}
                role="switch"
                aria-checked={value}
                onClick={() => set(!value)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? 'bg-blue-500' : 'bg-gray-200'}`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-1'}`}
                />
              </button>
            </div>
          ))}
        </div>

        <p className="text-[12px] text-[#94a3b8]">
          权限控制已启用，所有操作无论结果如何都会写入审计日志。
        </p>
      </div>
    </SettingsSectionCard>
  );
}
