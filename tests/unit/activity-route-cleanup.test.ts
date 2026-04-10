import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('activity route cleanup', () => {
  it('does not keep the standalone activity route or search entry', () => {
    const appSource = readFileSync(join(root, 'src', 'App.tsx'), 'utf8');
    const searchSource = readFileSync(join(root, 'src', 'components', 'search', 'GlobalSearchModal.tsx'), 'utf8');

    expect(appSource).not.toContain("import('./pages/Activity')");
    expect(appSource).not.toContain('path="activity"');
    expect(searchSource).not.toContain("id: 'activity'");
    expect(searchSource).not.toContain("path: '/activity'");
  });

  it('removes the legacy activity page source file', () => {
    expect(existsSync(join(root, 'src', 'pages', 'Activity', 'index.tsx'))).toBe(false);
  });
});
