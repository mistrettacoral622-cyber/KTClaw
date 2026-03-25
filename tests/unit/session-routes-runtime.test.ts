import type { IncomingMessage, ServerResponse } from 'http';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sendJson: vi.fn(),
  parseJsonBody: vi.fn(async (req: IncomingMessage & { __body?: unknown }) => req.__body ?? {}),
}));

vi.mock('@electron/api/route-utils', () => ({
  sendJson: mocks.sendJson,
  parseJsonBody: mocks.parseJsonBody,
}));

function createRequest(
  method: string,
  body?: unknown,
): IncomingMessage & { __body?: unknown } {
  return {
    method,
    __body: body,
  } as IncomingMessage & { __body?: unknown };
}

describe('session runtime routes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('spawns and lists subagent runtime sessions through async runtime manager', async () => {
    const { SessionRuntimeManager } = await import('@electron/services/session-runtime-manager');
    const { handleSessionRoutes } = await import('@electron/api/routes/sessions');
    let runtimeSessionKey = '';
    const gatewayRpcMock = vi.fn(async (method: string, params?: Record<string, unknown>) => {
      if (method === 'chat.send') {
        runtimeSessionKey = String(params?.sessionKey ?? '');
        return { runId: 'run-spawn-route' };
      }
      if (method === 'sessions.list') {
        return {
          sessions: [{ key: runtimeSessionKey, state: 'running' }],
        };
      }
      if (method === 'chat.history') {
        return { history: [{ role: 'assistant', content: 'history-from-gateway' }] };
      }
      throw new Error(`Unexpected gateway RPC: ${method}`);
    });
    const manager = new SessionRuntimeManager({ rpc: gatewayRpcMock } as never);
    const ctx = { sessionRuntimeManager: manager } as never;

    const spawnHandled = await handleSessionRoutes(
      createRequest('POST', {
        parentSessionKey: 'agent:main:main',
        prompt: 'Investigate costs anomaly',
      }),
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/sessions/spawn'),
      ctx,
    );

    expect(spawnHandled).toBe(true);
    expect(mocks.sendJson).toHaveBeenLastCalledWith(expect.anything(), 200, {
      success: true,
      session: expect.objectContaining({
        parentSessionKey: 'agent:main:main',
        status: 'running',
        transcript: ['history-from-gateway'],
      }),
    });

    const listHandled = await handleSessionRoutes(
      createRequest('GET'),
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/sessions/subagents'),
      ctx,
    );

    expect(listHandled).toBe(true);
    expect(mocks.sendJson).toHaveBeenLastCalledWith(expect.anything(), 200, {
      success: true,
      sessions: [expect.objectContaining({ parentSessionKey: 'agent:main:main' })],
    });
  });

  it('supports steer, wait, and kill routes for a spawned runtime session', async () => {
    const { SessionRuntimeManager } = await import('@electron/services/session-runtime-manager');
    const { handleSessionRoutes } = await import('@electron/api/routes/sessions');
    let runtimeSessionKey = '';
    let runtimeStateField: 'state' | 'status' = 'state';
    let runtimeState = 'running';
    const gatewayRpcMock = vi.fn(async (method: string, params?: Record<string, unknown>) => {
      if (method === 'chat.send') {
        runtimeSessionKey = String(params?.sessionKey ?? runtimeSessionKey);
        return { runId: 'run-steer-route' };
      }
      if (method === 'chat.abort') {
        return { ok: true };
      }
      if (method === 'sessions.list') {
        return {
          sessions: [{ sessionKey: runtimeSessionKey, [runtimeStateField]: runtimeState }],
        };
      }
      if (method === 'chat.history') {
        return { messages: [{ role: 'assistant', content: `history-${runtimeState}` }] };
      }
      throw new Error(`Unexpected gateway RPC: ${method}`);
    });
    const manager = new SessionRuntimeManager({ rpc: gatewayRpcMock } as never);
    const record = await manager.spawn({
      parentSessionKey: 'agent:main:main',
      prompt: 'Initial task',
    });
    const ctx = { sessionRuntimeManager: manager } as never;

    await handleSessionRoutes(
      createRequest('POST', { input: 'Follow-up' }),
      {} as ServerResponse,
      new URL(`http://127.0.0.1:3210/api/sessions/subagents/${record.id}/steer`),
      ctx,
    );
    expect(mocks.sendJson).toHaveBeenLastCalledWith(expect.anything(), 200, {
      success: true,
      session: expect.objectContaining({
        transcript: ['history-running'],
      }),
    });

    runtimeStateField = 'status';
    runtimeState = 'waiting_approval';
    await handleSessionRoutes(
      createRequest('POST'),
      {} as ServerResponse,
      new URL(`http://127.0.0.1:3210/api/sessions/subagents/${record.id}/wait`),
      ctx,
    );
    expect(mocks.sendJson).toHaveBeenLastCalledWith(expect.anything(), 200, {
      success: true,
      session: expect.objectContaining({ id: record.id, status: 'waiting_approval' }),
    });

    await handleSessionRoutes(
      createRequest('POST'),
      {} as ServerResponse,
      new URL(`http://127.0.0.1:3210/api/sessions/subagents/${record.id}/kill`),
      ctx,
    );
    expect(mocks.sendJson).toHaveBeenLastCalledWith(expect.anything(), 200, {
      success: true,
      session: expect.objectContaining({ status: 'killed' }),
    });
    expect(gatewayRpcMock).toHaveBeenCalledWith('chat.abort', { sessionKey: record.sessionKey });
  });
});
