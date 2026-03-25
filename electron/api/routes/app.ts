import type { IncomingMessage, ServerResponse } from 'http';
import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { HostApiContext } from '../context';
import { parseJsonBody } from '../route-utils';
import { setCorsHeaders, sendJson, sendNoContent } from '../route-utils';
import { runOpenClawDoctor, runOpenClawDoctorFix } from '../../utils/openclaw-doctor';
import { getLogsDir, getOpenClawConfigDir } from '../../utils/paths';

async function clearServerData(_ctx: HostApiContext): Promise<void> {
  const openClawDir = getOpenClawConfigDir();
  await rm(join(openClawDir, 'approvals'), { recursive: true, force: true });
  await rm(join(openClawDir, 'cron', 'runs'), { recursive: true, force: true });
  await rm(getLogsDir(), { recursive: true, force: true });

  const agentIds = await readdir(join(openClawDir, 'agents'))
    .then((entries) => entries.filter((entry) => typeof entry === 'string'))
    .catch(() => [] as string[]);

  await Promise.all(
    agentIds.map(async (agentId) => {
      await rm(join(openClawDir, 'agents', agentId, 'sessions'), { recursive: true, force: true });
    }),
  );
}

export async function handleAppRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {
  if (url.pathname === '/api/events' && req.method === 'GET') {
    setCorsHeaders(res);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    res.write(': connected\n\n');
    ctx.eventBus.addSseClient(res);
    // Send a current-state snapshot immediately so renderer subscribers do not
    // miss lifecycle transitions that happened before the SSE connection opened.
    res.write(`event: gateway:status\ndata: ${JSON.stringify(ctx.gatewayManager.getStatus())}\n\n`);
    return true;
  }

  if (url.pathname === '/api/app/openclaw-doctor' && req.method === 'POST') {
    const body = await parseJsonBody<{ mode?: 'diagnose' | 'fix' }>(req);
    const mode = body.mode === 'fix' ? 'fix' : 'diagnose';
    sendJson(res, 200, mode === 'fix' ? await runOpenClawDoctorFix() : await runOpenClawDoctor());
    return true;
  }

  if (url.pathname === '/api/app/clear-server-data' && req.method === 'POST') {
    try {
      await clearServerData(ctx);
      sendJson(res, 200, { success: true });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (req.method === 'OPTIONS') {
    sendNoContent(res);
    return true;
  }

  return false;
}
