import type { IncomingMessage, ServerResponse } from 'http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';
import { getOpenClawConfigDir } from '../../utils/paths';
import { getLocalEmbeddingsRuntimeManager } from '../../services/local-embeddings-runtime-manager';

function isLocalEmbeddingsRequiredByConfig(): boolean {
  try {
    const raw = readFileSync(join(getOpenClawConfigDir(), 'openclaw.json'), 'utf8');
    const parsed = JSON.parse(raw) as {
      memorySearch?: { provider?: unknown };
      memory?: { search?: { provider?: unknown } };
    };
    return parsed.memorySearch?.provider === 'local'
      || parsed.memory?.search?.provider === 'local';
  } catch {
    return false;
  }
}

export async function handleLocalEmbeddingsRuntimeRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {
  const manager = getLocalEmbeddingsRuntimeManager();
  const requiredByConfig = isLocalEmbeddingsRequiredByConfig();

  if (url.pathname === '/api/local-embeddings-runtime/status' && req.method === 'GET') {
    sendJson(res, 200, {
      success: true,
      ...(await manager.getStatus(requiredByConfig)),
    });
    return true;
  }

  if (url.pathname === '/api/local-embeddings-runtime/install' && req.method === 'POST') {
    try {
      const status = await manager.install();
      if (ctx.gatewayManager.getStatus().state !== 'stopped') {
        await ctx.gatewayManager.restart();
      }
      sendJson(res, 200, { success: true, ...status, requiredByConfig });
    } catch (error) {
      sendJson(res, 500, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  if (url.pathname === '/api/local-embeddings-runtime/remove' && req.method === 'POST') {
    try {
      await parseJsonBody<Record<string, never>>(req).catch(() => ({}));
      await manager.remove();
      if (ctx.gatewayManager.getStatus().state !== 'stopped') {
        await ctx.gatewayManager.restart();
      }
      sendJson(res, 200, {
        success: true,
        ...(await manager.getStatus(requiredByConfig)),
      });
    } catch (error) {
      sendJson(res, 500, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  return false;
}
