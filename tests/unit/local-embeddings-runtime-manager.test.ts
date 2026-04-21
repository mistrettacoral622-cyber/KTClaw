// @vitest-environment node

import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as tar from 'tar';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalEmbeddingsRuntimeManager } from '@electron/services/local-embeddings-runtime-manager';

function sha512(buffer: Buffer): string {
  return `sha512-${createHash('sha512').update(buffer).digest('base64')}`;
}

describe('LocalEmbeddingsRuntimeManager', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it('reports not_installed when no runtime exists for the current target', async () => {
    const root = mkdtempSync(join(tmpdir(), 'ktclaw-local-embeddings-status-'));
    tempDirs.push(root);
    const resourcesDir = join(root, 'resources');
    mkdirSync(join(resourcesDir, 'runtime-manifests'), { recursive: true });
    writeFileSync(
      join(resourcesDir, 'runtime-manifests', 'local-embeddings.json'),
      JSON.stringify({
        version: '3.16.2',
        targets: {
          'win32-x64': {
            specifier: '@node-llama-cpp/win-x64',
            packageName: 'win-x64',
            entry: 'dist/index.js',
            url: 'https://example.test/win-x64.tgz',
            integrity: 'sha512-ignored',
          },
        },
      }),
      'utf8',
    );

    const manager = new LocalEmbeddingsRuntimeManager({
      getUserDataDir: () => join(root, 'userData'),
      getResourcesDir: () => resourcesDir,
    });

    const status = await manager.getStatus(true);
    expect(status.state).toBe('not_installed');
    expect(status.requiredByConfig).toBe(true);
    expect(status.specifier).toBe('@node-llama-cpp/win-x64');
  });

  it('installs the runtime package and exposes gateway launch config', async () => {
    const root = mkdtempSync(join(tmpdir(), 'ktclaw-local-embeddings-install-'));
    tempDirs.push(root);
    const resourcesDir = join(root, 'resources');
    mkdirSync(join(resourcesDir, 'runtime-manifests'), { recursive: true });

    const packageDir = join(root, 'package');
    mkdirSync(join(packageDir, 'dist'), { recursive: true });
    writeFileSync(join(packageDir, 'dist', 'index.js'), 'export const ok = true;\n', 'utf8');
    writeFileSync(
      join(packageDir, 'package.json'),
      JSON.stringify({ name: '@node-llama-cpp/win-x64', version: '3.16.2', type: 'module' }),
      'utf8',
    );

    const archivePath = join(root, 'runtime.tgz');
    await tar.c(
      {
        gzip: true,
        file: archivePath,
        cwd: packageDir,
        prefix: 'package/',
      },
      ['dist', 'package.json'],
    );
    const archive = Buffer.from(readFileSync(archivePath));

    writeFileSync(
      join(resourcesDir, 'runtime-manifests', 'local-embeddings.json'),
      JSON.stringify({
        version: '3.16.2',
        targets: {
          'win32-x64': {
            specifier: '@node-llama-cpp/win-x64',
            packageName: 'win-x64',
            entry: 'dist/index.js',
            url: 'https://example.test/win-x64.tgz',
            integrity: sha512(archive),
          },
        },
      }),
      'utf8',
    );

    const manager = new LocalEmbeddingsRuntimeManager({
      getUserDataDir: () => join(root, 'userData'),
      getResourcesDir: () => resourcesDir,
      fetchImpl: async () => new Response(archive, { status: 200 }),
    });

    const installed = await manager.install();
    expect(installed.state).toBe('installed');
    expect(installed.entryPath).toBeTruthy();

    const launchConfig = await manager.getGatewayLaunchConfig();
    expect(launchConfig.preloadImportPath).toContain('local-embeddings-preload.mjs');
    expect(launchConfig.env.KTCLAW_LOCAL_EMBEDDINGS_REDIRECTS).toContain('@node-llama-cpp/win-x64');
  });
});
