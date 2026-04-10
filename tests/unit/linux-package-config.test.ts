import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('linux packaging config', () => {
  it('ships desktop-entry metadata and post-install hooks for Linux packages', () => {
    const builderConfig = readFileSync(resolve(process.cwd(), 'electron-builder.yml'), 'utf8');

    expect(builderConfig).toContain('target: AppImage');
    expect(builderConfig).toContain('target: deb');
    expect(builderConfig).toContain('icon: resources/icons');
    expect(builderConfig).toContain('Name: KTClaw');
    expect(builderConfig).toContain('StartupWMClass: ktclaw');
    expect(builderConfig).toContain('afterInstall: scripts/linux/after-install.sh');
    expect(builderConfig).toContain('afterRemove: scripts/linux/after-remove.sh');
  });
});
