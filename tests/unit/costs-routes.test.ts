import type { IncomingMessage, ServerResponse } from 'http';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sendJson: vi.fn(),
  getRecentTokenUsageHistory: vi.fn(),
}));

vi.mock('@electron/api/route-utils', () => ({
  sendJson: mocks.sendJson,
}));

vi.mock('@electron/utils/token-usage', () => ({
  getRecentTokenUsageHistory: mocks.getRecentTokenUsageHistory,
}));

function createRequest(method: string): IncomingMessage {
  return { method } as IncomingMessage;
}

describe('costs routes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('aggregates Top Crons with cron names from cron.list', async () => {
    mocks.getRecentTokenUsageHistory.mockResolvedValue([
      {
        timestamp: '2026-03-25T01:00:00.000Z',
        sessionId: 'cron-run-1',
        agentId: 'main',
        cronJobId: 'job-nightly-digest',
        inputTokens: 500,
        outputTokens: 250,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalTokens: 750,
        costUsd: 0.12,
      },
      {
        timestamp: '2026-03-25T02:00:00.000Z',
        sessionId: 'cron-run-2',
        agentId: 'main',
        cronJobId: 'job-nightly-digest',
        inputTokens: 300,
        outputTokens: 100,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalTokens: 400,
        costUsd: 0.05,
      },
      {
        timestamp: '2026-03-25T03:00:00.000Z',
        sessionId: 'adhoc-session',
        agentId: 'main',
        inputTokens: 200,
        outputTokens: 100,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalTokens: 300,
        costUsd: 0.02,
      },
    ]);

    const { handleCostsRoutes } = await import('@electron/api/routes/costs');
    const ctx = {
      gatewayManager: {
        rpc: vi.fn(async (method: string) => {
          if (method === 'cron.list') {
            return {
              jobs: [
                { id: 'job-nightly-digest', name: 'Nightly Digest' },
              ],
            };
          }
          throw new Error(`Unexpected RPC method: ${method}`);
        }),
      },
    } as never;

    const handled = await handleCostsRoutes(
      createRequest('GET'),
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/costs/by-cron'),
      ctx,
    );

    expect(handled).toBe(true);
    expect(mocks.sendJson).toHaveBeenLastCalledWith(expect.anything(), 200, [
      expect.objectContaining({
        cronJobId: 'job-nightly-digest',
        cronName: 'Nightly Digest',
        totalTokens: 1150,
        inputTokens: 800,
        outputTokens: 350,
        costUsd: 0.17,
        sessions: 2,
      }),
    ]);
  });
});
