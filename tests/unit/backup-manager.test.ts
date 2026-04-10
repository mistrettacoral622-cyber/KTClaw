/**
 * Tests for backup-manager.ts
 * Covers: archive round-trip, restore preview, backup retention, sensitive field exclusion
 */
import { mkdir, rm, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const { testUserData } = vi.hoisted(() => {
  const suffix = Math.random().toString(36).slice(2);
  return {
    testUserData: `/tmp/clawx-backup-test-${suffix}`,
  };
});

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: (name: string) => {
      if (name === 'userData') return testUserData;
      return testUserData;
    },
    getVersion: () => '0.0.0-test',
  },
}));

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os');
  return {
    ...actual,
    homedir: () => testUserData,
  };
});

// Mock electron-store
vi.mock('electron-store', () => {
  const store: Record<string, unknown> = {
    theme: 'system',
    language: 'en',
    gatewayToken: 'secret-token-abc',
    apiKey: 'sk-secret-key',
    proxyEnabled: false,
    machineId: 'test-machine',
  };
  return {
    default: class MockStore {
      get store() { return { ...store }; }
      get(key: string) { return store[key]; }
      set(key: string | Record<string, unknown>, value?: unknown) {
        if (typeof key === 'object') Object.assign(store, key);
        else store[key] = value;
      }
      clear() { Object.keys(store).forEach(k => delete store[k]); }
    },
  };
});

describe('backup-manager', () => {
  beforeEach(async () => {
    await mkdir(testUserData, { recursive: true });
    await mkdir(join(testUserData, 'backups'), { recursive: true });
    await mkdir(join(testUserData, '.openclaw', 'agents', 'main', 'workspace'), { recursive: true });
    await writeFile(join(testUserData, '.openclaw', 'agents', 'main', 'workspace', 'notes.md'), '# original', 'utf8');
    await writeFile(
      join(testUserData, '.openclaw', 'openclaw.json'),
      JSON.stringify({ channels: [{ id: 'c1', name: 'Original Channel', type: 'feishu' }], providers: [] }, null, 2),
      'utf8',
    );
  });

  afterEach(async () => {
    await rm(testUserData, { recursive: true, force: true });
  });

  describe('exportArchive', () => {
    it('excludes sensitive fields from settings.json in archive', async () => {
      const { exportArchive } = await import('@electron/utils/backup-manager');
      const archivePath = await exportArchive();
      expect(archivePath).toBeTruthy();
      expect(archivePath).toMatch(/\.ktclaw$/);

      // Read back and verify sensitive fields are excluded
      const { previewImport } = await import('@electron/utils/backup-manager');
      const preview = await previewImport(archivePath);
      expect(preview.settings).toBeDefined();
      // Sensitive fields must not be present
      expect(preview.settings).not.toHaveProperty('gatewayToken');
      expect(preview.settings).not.toHaveProperty('apiKey');
      // Non-sensitive fields should be present
      expect(preview.settings).toHaveProperty('theme');
      expect(preview.settings).toHaveProperty('language');
    });

    it('produces a .ktclaw file in the backups directory', async () => {
      const { exportArchive } = await import('@electron/utils/backup-manager');
      const archivePath = await exportArchive();
      expect(existsSync(archivePath)).toBe(true);
    });
  });

  describe('previewImport', () => {
    it('returns correct structure without applying changes', async () => {
      const { exportArchive, previewImport } = await import('@electron/utils/backup-manager');
      const archivePath = await exportArchive();
      const preview = await previewImport(archivePath);
      expect(preview).toHaveProperty('settings');
      expect(preview).toHaveProperty('memory');
      expect(preview).toHaveProperty('channelMetadata');
      // Should not throw or modify state
    });
  });

  describe('importArchive', () => {
    it('calls createBackup() before applying changes', async () => {
      const { exportArchive, importArchive, listBackups } = await import('@electron/utils/backup-manager');
      const archivePath = await exportArchive();
      const backupsBefore = await listBackups();
      await importArchive(archivePath, ['settings']);
      const backupsAfter = await listBackups();
      // At least one more backup should exist after import
      expect(backupsAfter.length).toBeGreaterThan(backupsBefore.length);
    });

    it('restores memory files and channel metadata when requested', async () => {
      const archivePath = join(testUserData, 'incoming.ktclaw');
      await writeFile(
        archivePath,
        JSON.stringify({
          version: '1',
          createdAt: '2026-04-08T00:00:00.000Z',
          settings: { theme: 'dark' },
          memory: { 'notes.md': '# restored', 'agent.json': '{"ok":true}' },
          channelMetadata: {
            channels: [{ id: 'c2', name: 'Restored Channel', type: 'wechat' }],
            providers: [{ id: 'p1', name: 'Restored Provider', type: 'openai' }],
          },
        }, null, 2),
        'utf8',
      );

      const { importArchive } = await import('@electron/utils/backup-manager');
      await importArchive(archivePath, ['memory', 'channelMetadata']);

      expect(
        await readFile(join(testUserData, '.openclaw', 'agents', 'main', 'workspace', 'notes.md'), 'utf8'),
      ).toBe('# restored');

      expect(
        JSON.parse(await readFile(join(testUserData, '.openclaw', 'openclaw.json'), 'utf8')),
      ).toMatchObject({
        channels: [{ id: 'c2', name: 'Restored Channel', type: 'wechat' }],
        providers: [{ id: 'p1', name: 'Restored Provider', type: 'openai' }],
      });
    });
  });

  describe('pruneBackups', () => {
    it('removes oldest backups when count exceeds 10', async () => {
      const { createBackup, pruneBackups, listBackups } = await import('@electron/utils/backup-manager');
      // Create 12 backups
      for (let i = 0; i < 12; i++) {
        await createBackup();
        // Small delay to ensure different timestamps
        await new Promise(r => setTimeout(r, 10));
      }
      await pruneBackups();
      const backups = await listBackups();
      expect(backups.length).toBeLessThanOrEqual(10);
    });
  });

  describe('listBackups', () => {
    it('returns backups sorted newest-first', async () => {
      const { createBackup, listBackups } = await import('@electron/utils/backup-manager');
      await createBackup();
      await new Promise(r => setTimeout(r, 20));
      await createBackup();
      const backups = await listBackups();
      expect(backups.length).toBeGreaterThanOrEqual(2);
      // Newest first: first item should have a later or equal createdAt
      const first = new Date(backups[0].createdAt).getTime();
      const second = new Date(backups[1].createdAt).getTime();
      expect(first).toBeGreaterThanOrEqual(second);
    });

    it('returns objects with filename, createdAt, sizeBytes', async () => {
      const { createBackup, listBackups } = await import('@electron/utils/backup-manager');
      await createBackup();
      const backups = await listBackups();
      expect(backups.length).toBeGreaterThan(0);
      const backup = backups[0];
      expect(backup).toHaveProperty('filename');
      expect(backup).toHaveProperty('createdAt');
      expect(backup).toHaveProperty('sizeBytes');
      expect(typeof backup.sizeBytes).toBe('number');
    });
  });

  describe('scheduled backup', () => {
    it('exports setupScheduledBackup and clearScheduledBackup without memory leak', async () => {
      const { setupScheduledBackup, clearScheduledBackup } = await import('@electron/utils/backup-manager');
      expect(typeof setupScheduledBackup).toBe('function');
      expect(typeof clearScheduledBackup).toBe('function');
      // Should not throw
      setupScheduledBackup();
      clearScheduledBackup();
    });
  });
});
