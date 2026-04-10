// @vitest-environment node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('settings scroll shell', () => {
  it('keeps the settings shell in a constrained flex scroll layout', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/pages/Settings/index.tsx'), 'utf8');
    const layoutSource = readFileSync(resolve(process.cwd(), 'src/components/layout/MainLayout.tsx'), 'utf8');

    expect(layoutSource).toContain("className=\"flex min-h-0 flex-1 flex-col overflow-hidden");
    expect(source).toContain("className=\"flex min-h-0 flex-1 flex-col overflow-hidden");
    expect(source).toContain("className=\"mx-auto flex min-h-full min-h-0 flex-1 w-full");
    expect(source).toContain("className=\"min-w-0 min-h-0 flex-1 overflow-y-auto overscroll-contain");
  });
});
