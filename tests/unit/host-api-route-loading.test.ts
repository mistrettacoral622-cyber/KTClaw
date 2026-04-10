// @vitest-environment node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('host api route loading', () => {
  it('lazy-loads heavy route modules instead of eagerly importing them at module scope', () => {
    const source = readFileSync(resolve(process.cwd(), 'electron/api/server.ts'), 'utf8');

    expect(source).not.toContain("import { handleChannelRoutes } from './routes/channels';");
    expect(source).not.toContain("import { handleMemoryRoutes } from './routes/memory';");
    expect(source).not.toContain('import(modulePath)');
    expect(source).toContain("() => import('./routes/channels').then((mod) => mod.handleChannelRoutes)");
    expect(source).toContain("() => import('./routes/memory').then((mod) => mod.handleMemoryRoutes)");
  });
});
