/**
 * Backup Manager
 * Handles .ktclaw archive creation, export, import, and retention.
 */
import { mkdir, readdir, stat, readFile, writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { app } from 'electron';
import { getAllSettings, type AppSettings } from './store';

const MAX_BACKUPS = 10;
const SENSITIVE_KEYS = /key|secret|token|password/i;

function getBackupDir(): string {
  return join(app.getPath('userData'), 'backups');
}

function sanitizeSettings(settings: AppSettings): Partial<AppSettings> {
  return Object.fromEntries(
    Object.entries(settings).filter(([k]) => !SENSITIVE_KEYS.test(k))
  ) as Partial<AppSettings>;
}

function timestampedFilename(): string {
  return `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.ktclaw`;
}

/**
 * A .ktclaw archive is a JSON bundle with base64-encoded sections.
 * Format: { version, createdAt, settings, memory, channelMetadata }
 */
interface KtclawArchive {
  version: string;
  createdAt: string;
  settings: Partial<AppSettings>;
  memory: Record<string, unknown>;
  channelMetadata: Record<string, unknown>;
}

async function readMemorySnapshot(): Promise<Record<string, unknown>> {
  // Read memory files directly from the workspace to avoid circular dependency
  try {
    const { homedir } = await import('os');
    const workspaceDir = join(homedir(), '.openclaw', 'agents', 'main', 'workspace');
    if (!existsSync(workspaceDir)) return {};
    const files = await readdir(workspaceDir);
    const snapshot: Record<string, unknown> = {};
    for (const file of files.filter(f => f.endsWith('.md') || f.endsWith('.json'))) {
      try {
        snapshot[file] = await readFile(join(workspaceDir, file), 'utf8');
      } catch {
        // skip unreadable files
      }
    }
    return snapshot;
  } catch {
    return {};
  }
}

async function restoreMemorySnapshot(memory: Record<string, unknown>): Promise<void> {
  const { homedir } = await import('os');
  const workspaceDir = join(homedir(), '.openclaw', 'agents', 'main', 'workspace');
  await mkdir(workspaceDir, { recursive: true });

  for (const [relativePath, content] of Object.entries(memory)) {
    if (typeof content !== 'string') continue;
    const targetPath = join(workspaceDir, relativePath);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, content, 'utf8');
  }
}

async function readChannelMetadata(): Promise<Record<string, unknown>> {
  // Read channel/provider metadata (no API keys) from openclaw config
  try {
    const { homedir } = await import('os');
    const configPath = join(homedir(), '.openclaw', 'openclaw.json');
    if (!existsSync(configPath)) return {};
    const raw = await readFile(configPath, 'utf8');
    const config = JSON.parse(raw) as Record<string, unknown>;
    // Extract only channel IDs and provider names, not secrets
    const channels = (config.channels as Array<Record<string, unknown>> | undefined) ?? [];
    const providers = (config.providers as Array<Record<string, unknown>> | undefined) ?? [];
    return {
      channels: channels.map(c => ({ id: c.id, name: c.name, type: c.type })),
      providers: providers.map(p => ({ id: p.id, name: p.name, type: p.type })),
    };
  } catch {
    return {};
  }
}

async function restoreChannelMetadata(channelMetadata: Record<string, unknown>): Promise<void> {
  const { homedir } = await import('os');
  const configPath = join(homedir(), '.openclaw', 'openclaw.json');
  let currentConfig: Record<string, unknown> = {};

  if (existsSync(configPath)) {
    try {
      currentConfig = JSON.parse(await readFile(configPath, 'utf8')) as Record<string, unknown>;
    } catch {
      currentConfig = {};
    }
  }

  const nextConfig = {
    ...currentConfig,
    ...(Array.isArray(channelMetadata.channels) ? { channels: channelMetadata.channels } : {}),
    ...(Array.isArray(channelMetadata.providers) ? { providers: channelMetadata.providers } : {}),
  };

  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(nextConfig, null, 2), 'utf8');
}

async function ensureBackupDir(): Promise<void> {
  await mkdir(getBackupDir(), { recursive: true });
}

/**
 * Create a timestamped backup of current settings.
 */
export async function createBackup(): Promise<string> {
  await ensureBackupDir();
  const settings = await getAllSettings();
  const archive: KtclawArchive = {
    version: '1',
    createdAt: new Date().toISOString(),
    settings: sanitizeSettings(settings),
    memory: await readMemorySnapshot(),
    channelMetadata: await readChannelMetadata(),
  };
  const filename = timestampedFilename();
  const filePath = join(getBackupDir(), filename);
  await writeFile(filePath, JSON.stringify(archive, null, 2), 'utf8');
  await pruneBackups();
  return filePath;
}

/**
 * List all backups, sorted newest-first.
 */
export async function listBackups(): Promise<Array<{ filename: string; createdAt: string; sizeBytes: number }>> {
  await ensureBackupDir();
  const dir = getBackupDir();
  const files = await readdir(dir);
  const ktclawFiles = files.filter(f => f.endsWith('.ktclaw'));
  const results = await Promise.all(
    ktclawFiles.map(async (filename) => {
      const filePath = join(dir, filename);
      const fileStat = await stat(filePath);
      // Parse createdAt from archive content if possible
      let createdAt = fileStat.mtime.toISOString();
      try {
        const raw = await readFile(filePath, 'utf8');
        const parsed = JSON.parse(raw) as Partial<KtclawArchive>;
        if (parsed.createdAt) createdAt = parsed.createdAt;
      } catch {
        // use mtime fallback
      }
      return { filename, createdAt, sizeBytes: fileStat.size };
    })
  );
  // Sort newest-first
  return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Delete oldest backups beyond MAX_BACKUPS limit.
 */
export async function pruneBackups(): Promise<void> {
  const backups = await listBackups();
  if (backups.length <= MAX_BACKUPS) return;
  const toDelete = backups.slice(MAX_BACKUPS);
  const dir = getBackupDir();
  await Promise.all(toDelete.map(b => unlink(join(dir, b.filename)).catch(() => {})));
}

/**
 * Export a full .ktclaw archive (settings + memory + channel metadata, no secrets).
 * Returns the path to the created archive file.
 */
export async function exportArchive(): Promise<string> {
  await ensureBackupDir();
  const settings = await getAllSettings();
  const archive: KtclawArchive = {
    version: '1',
    createdAt: new Date().toISOString(),
    settings: sanitizeSettings(settings),
    memory: await readMemorySnapshot(),
    channelMetadata: await readChannelMetadata(),
  };
  const filename = `export-${new Date().toISOString().replace(/[:.]/g, '-')}.ktclaw`;
  const filePath = join(getBackupDir(), filename);
  await writeFile(filePath, JSON.stringify(archive, null, 2), 'utf8');
  return filePath;
}

/**
 * Preview an archive without applying anything.
 */
export async function previewImport(archivePath: string): Promise<{
  settings: Partial<AppSettings>;
  memory: Record<string, unknown>;
  channelMetadata: Record<string, unknown>;
}> {
  const raw = await readFile(archivePath, 'utf8');
  const archive = JSON.parse(raw) as KtclawArchive;
  return {
    settings: archive.settings ?? {},
    memory: archive.memory ?? {},
    channelMetadata: archive.channelMetadata ?? {},
  };
}

/**
 * Import selected modules from an archive.
 * Always creates a backup first before applying any changes.
 */
export async function importArchive(
  archivePath: string,
  modules: Array<'settings' | 'memory' | 'channelMetadata'>
): Promise<{ success: boolean; backedUpAs: string }> {
  // Auto-backup before applying
  const backedUpAs = await createBackup();

  const preview = await previewImport(archivePath);
  const { setSetting } = await import('./store');

  if (modules.includes('settings') && preview.settings) {
    const entries = Object.entries(preview.settings) as Array<[keyof AppSettings, AppSettings[keyof AppSettings]]>;
    for (const [key, value] of entries) {
      try {
        await setSetting(key, value);
      } catch {
        // skip invalid keys
      }
    }
  }

  if (modules.includes('memory') && preview.memory) {
    await restoreMemorySnapshot(preview.memory);
  }

  if (modules.includes('channelMetadata') && preview.channelMetadata) {
    await restoreChannelMetadata(preview.channelMetadata);
  }

  return { success: true, backedUpAs };
}

// ── Scheduled backup ─────────────────────────────────────────────

let scheduledBackupInterval: ReturnType<typeof setInterval> | null = null;
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function setupScheduledBackup(): void {
  if (scheduledBackupInterval) return;
  scheduledBackupInterval = setInterval(() => {
    createBackup().catch(() => {});
  }, BACKUP_INTERVAL_MS);
}

export function clearScheduledBackup(): void {
  if (scheduledBackupInterval) {
    clearInterval(scheduledBackupInterval);
    scheduledBackupInterval = null;
  }
}
