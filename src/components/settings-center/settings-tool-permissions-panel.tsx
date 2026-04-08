import { useSettingsStore } from '@/stores/settings';
import { SettingsSectionCard } from '@/components/settings-center/settings-section-card';

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
    <SettingsSectionCard title="Tool Permissions">
      <div className="space-y-4 text-[13px]">
        <div>
          <label className="block font-medium text-[#0f172a] mb-1">Risk Level</label>
          <select
            data-testid="global-risk-level-select"
            value={globalRiskLevel}
            onChange={(e) => setGlobalRiskLevel(e.target.value as 'standard' | 'strict' | 'permissive')}
            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] text-[#0f172a]"
          >
            <option value="permissive">Permissive — allow and audit all actions</option>
            <option value="standard">Standard — allow reads, confirm writes</option>
            <option value="strict">Strict — block all writes, exec, and network</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block font-medium text-[#0f172a]">Allowed Action Types</label>
          {[
            { label: 'File writes', value: fileAcl, set: setFileAcl, testId: 'file-acl-toggle' },
            { label: 'Terminal execution', value: terminalAcl, set: setTerminalAcl, testId: 'terminal-acl-toggle' },
            { label: 'Network / package manager', value: networkAcl, set: setNetworkAcl, testId: 'network-acl-toggle' },
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
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </div>

        <p className="text-[#94a3b8] text-[12px]">
          Enforcement is active. All actions are recorded in the audit log regardless of outcome.
        </p>
      </div>
    </SettingsSectionCard>
  );
}
