import type { IncomingMessage, ServerResponse } from 'http';
import { getRecentTokenUsageHistory } from '../../utils/token-usage';
import type { HostApiContext } from '../context';
import { sendJson } from '../route-utils';

interface DaySummary {
  date: string; // YYYY-MM-DD
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  totalTokens: number;
  costUsd: number;
  sessions: number;
}

interface AgentSummary {
  agentId: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  sessions: number;
}

interface ModelSummary {
  model: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  count: number;
}

interface CronSummary {
  cronJobId: string;
  cronName: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  sessions: number;
}

export async function handleCostsRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {
  if (!url.pathname.startsWith('/api/costs/')) return false;

  const entries = await getRecentTokenUsageHistory(2000);

  if (url.pathname === '/api/costs/summary' && req.method === 'GET') {
    const days = Number(url.searchParams.get('days') ?? '30');
    const cutoff = Date.now() - days * 86_400_000;

    const dayMap = new Map<string, DaySummary>();
    const sessionSet = new Set<string>();

    for (const e of entries) {
      const ts = new Date(e.timestamp).getTime();
      if (ts < cutoff) continue;
      const date = e.timestamp.slice(0, 10);
      const prev = dayMap.get(date) ?? {
        date,
        inputTokens: 0,
        outputTokens: 0,
        cacheTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        sessions: 0,
      };
      const sessionKey = `${date}:${e.sessionId}`;
      if (!sessionSet.has(sessionKey)) {
        sessionSet.add(sessionKey);
        prev.sessions += 1;
      }
      prev.inputTokens += e.inputTokens;
      prev.outputTokens += e.outputTokens;
      prev.cacheTokens += e.cacheReadTokens + e.cacheWriteTokens;
      prev.totalTokens += e.totalTokens;
      prev.costUsd += e.costUsd ?? 0;
      dayMap.set(date, prev);
    }

    const timeline = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));
    const totals = timeline.reduce(
      (acc, d) => ({
        inputTokens: acc.inputTokens + d.inputTokens,
        outputTokens: acc.outputTokens + d.outputTokens,
        cacheTokens: acc.cacheTokens + d.cacheTokens,
        totalTokens: acc.totalTokens + d.totalTokens,
        costUsd: acc.costUsd + d.costUsd,
        sessions: acc.sessions + d.sessions,
      }),
      { inputTokens: 0, outputTokens: 0, cacheTokens: 0, totalTokens: 0, costUsd: 0, sessions: 0 },
    );

    sendJson(res, 200, { timeline, totals });
    return true;
  }

  if (url.pathname === '/api/costs/by-agent' && req.method === 'GET') {
    const agentMap = new Map<string, AgentSummary>();
    const sessionSet = new Set<string>();

    for (const e of entries) {
      const key = e.agentId || 'unknown';
      const prev = agentMap.get(key) ?? {
        agentId: key,
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        sessions: 0,
      };
      const sessionKey = `${key}:${e.sessionId}`;
      if (!sessionSet.has(sessionKey)) {
        sessionSet.add(sessionKey);
        prev.sessions += 1;
      }
      prev.totalTokens += e.totalTokens;
      prev.inputTokens += e.inputTokens;
      prev.outputTokens += e.outputTokens;
      prev.costUsd += e.costUsd ?? 0;
      agentMap.set(key, prev);
    }

    const rows = [...agentMap.values()].sort((a, b) => b.totalTokens - a.totalTokens);
    sendJson(res, 200, rows);
    return true;
  }

  if (url.pathname === '/api/costs/by-model' && req.method === 'GET') {
    const modelMap = new Map<string, ModelSummary>();

    for (const e of entries) {
      const key = e.model ?? 'unknown';
      const prev = modelMap.get(key) ?? {
        model: key,
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        count: 0,
      };
      prev.totalTokens += e.totalTokens;
      prev.inputTokens += e.inputTokens;
      prev.outputTokens += e.outputTokens;
      prev.costUsd += e.costUsd ?? 0;
      prev.count += 1;
      modelMap.set(key, prev);
    }

    const rows = [...modelMap.values()].sort((a, b) => b.totalTokens - a.totalTokens);
    sendJson(res, 200, rows);
    return true;
  }

  if (url.pathname === '/api/costs/by-cron' && req.method === 'GET') {
    const cronMap = new Map<string, CronSummary>();
    const sessionSet = new Set<string>();

    let cronNameById = new Map<string, string>();
    try {
      const result = await ctx.gatewayManager.rpc<{ jobs?: Array<{ id?: string; name?: string }> }>(
        'cron.list',
        { includeDisabled: true },
      );
      cronNameById = new Map(
        (result.jobs ?? [])
          .filter((job): job is { id: string; name?: string } => typeof job?.id === 'string' && job.id.trim().length > 0)
          .map((job) => [job.id, job.name?.trim() || job.id]),
      );
    } catch {
      // Fall back to raw job ids when cron metadata is unavailable.
    }

    for (const entry of entries) {
      if (!entry.cronJobId) continue;
      const key = entry.cronJobId;
      const prev = cronMap.get(key) ?? {
        cronJobId: key,
        cronName: cronNameById.get(key) ?? key,
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        sessions: 0,
      };
      const sessionKey = `${key}:${entry.sessionId}`;
      if (!sessionSet.has(sessionKey)) {
        sessionSet.add(sessionKey);
        prev.sessions += 1;
      }
      prev.totalTokens += entry.totalTokens;
      prev.inputTokens += entry.inputTokens;
      prev.outputTokens += entry.outputTokens;
      prev.costUsd += entry.costUsd ?? 0;
      cronMap.set(key, prev);
    }

    const rows = [...cronMap.values()]
      .map((row) => ({
        ...row,
        costUsd: Number(row.costUsd.toFixed(6)),
      }))
      .sort((a, b) => b.totalTokens - a.totalTokens);
    sendJson(res, 200, rows);
    return true;
  }

  return false;
}
