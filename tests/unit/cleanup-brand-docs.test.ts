import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function readRepoFile(...segments: string[]) {
  return readFileSync(join(root, ...segments), 'utf8');
}

describe('phase 09 cleanup docs and brand leftovers', () => {
  it('removes stale Activity page references from docs and accessibility scripts', () => {
    const readme = readRepoFile('README.md');
    const readmeZh = readRepoFile('README.zh-CN.md');
    const packageJson = readRepoFile('package.json');

    expect(readme).not.toContain('the Activity page upgrades raw logs into filterable structured event cards');
    expect(readme).not.toContain('currently covers the Activity, Cron, Settings, and Workbench empty-state surfaces');
    expect(readmeZh).not.toContain('Activity 页面也已从原始日志文本升级为可过滤');
    expect(readmeZh).not.toContain('当前覆盖 Activity、Cron、Settings 和 Workbench 空状态页面');
    expect(packageJson).not.toContain('src/pages/Activity/index.tsx');
    expect(packageJson).not.toContain('tests/unit/activity-page.test.tsx');
  });

  it('keeps active gateway and request surfaces branded as KTClaw', () => {
    const supervisorSource = readRepoFile('electron', 'gateway', 'supervisor.ts');
    const appRequestSecurityTest = readRepoFile('tests', 'unit', 'app-request-security.test.ts');

    expect(supervisorSource).not.toContain('ClawX manages its own gateway process');
    expect(appRequestSecurityTest).not.toContain("getName: vi.fn(() => 'ClawX')");
    expect(appRequestSecurityTest).toContain("getName: vi.fn(() => 'KTClaw')");
  });
});
