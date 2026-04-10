import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('cleanup-only settings and memory surfaces', () => {
  it('does not keep deprecated settings cards', () => {
    const settingsSource = readFileSync(join(root, 'src', 'pages', 'Settings', 'index.tsx'), 'utf8');

    expect(settingsSource).not.toContain('实验室实验 (Experimental Flags)');
    expect(settingsSource).not.toContain('Brand Assets');
  });

  it('does not keep the extra-sources memory tab', () => {
    const memorySource = readFileSync(join(root, 'src', 'pages', 'Memory', 'index.tsx'), 'utf8');
    const zhCommon = readFileSync(join(root, 'src', 'i18n', 'locales', 'zh', 'common.json'), 'utf8');

    expect(memorySource).not.toContain('tabExtras');
    expect(zhCommon).not.toContain('"tabExtras"');
  });
});
