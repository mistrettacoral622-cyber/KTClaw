/**
 * Backup API Routes
 * REST endpoints for backup CRUD and archive import/export.
 */
import type { IncomingMessage, ServerResponse } from 'http';
import { basename } from 'path';
import { copyFile } from 'fs/promises';
import type { HostApiContext } from '../context';
import { sendJson, parseJsonBody } from '../route-utils';
import {
  createBackup,
  listBackups,
  exportArchive,
  previewImport,
  importArchive,
} from '../../utils/backup-manager';

export async function handleBackupRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  _ctx: HostApiContext,
): Promise<boolean> {
  // GET /api/backup/list
  if (url.pathname === '/api/backup/list' && req.method === 'GET') {
    try {
      const backups = await listBackups();
      sendJson(res, 200, backups);
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  // POST /api/backup/create
  if (url.pathname === '/api/backup/create' && req.method === 'POST') {
    try {
      const filePath = await createBackup();
      const backups = await listBackups();
      const created = backups.find(b => b.filename === basename(filePath));
      sendJson(res, 200, { success: true, filename: basename(filePath), createdAt: created?.createdAt ?? new Date().toISOString() });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  // POST /api/backup/export
  if (url.pathname === '/api/backup/export' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ targetPath?: string }>(req);
      const archivePath = await exportArchive();
      const targetPath = typeof body.targetPath === 'string' && body.targetPath.trim()
        ? body.targetPath.trim()
        : archivePath;
      if (targetPath !== archivePath) {
        await copyFile(archivePath, targetPath);
      }
      sendJson(res, 200, {
        success: true,
        archivePath: targetPath,
        filename: basename(targetPath),
      });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  // POST /api/backup/preview
  if (url.pathname === '/api/backup/preview' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ archivePath: string }>(req);
      const preview = await previewImport(body.archivePath);
      sendJson(res, 200, preview);
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  // POST /api/backup/import
  if (url.pathname === '/api/backup/import' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ archivePath: string; modules: Array<'settings' | 'memory' | 'channelMetadata'> }>(req);
      const result = await importArchive(body.archivePath, body.modules ?? ['settings', 'memory', 'channelMetadata']);
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  return false;
}
