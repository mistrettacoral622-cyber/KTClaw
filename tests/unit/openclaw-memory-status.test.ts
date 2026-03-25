import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { IncomingMessage, ServerResponse } from 'http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSendJson, mockHomedir, mockExecFile, mockExecSync } = vi.hoisted(() => ({
  mockSendJson: vi.fn(),
  mockHomedir: vi.fn(),
  mockExecFile: vi.fn(),
  mockExecSync: vi.fn(),
}));

vi.mock('@electron/api/route-utils', () => ({
  sendJson: (...args: unknown[]) => mockSendJson(...args),
  parseJsonBody: vi.fn(),
}));

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os');
  return {
    ...actual,
    homedir: () => mockHomedir(),
  };
});

vi.mock('child_process', () => ({
  execFile: (...args: unknown[]) => mockExecFile(...args),
  execSync: (...args: unknown[]) => mockExecSync(...args),
}));

describe('GET /api/memory and POST /api/memory/reindex', () => {
  let homeDir: string;
  let workspaceDir: string;

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.resetModules();

    homeDir = mkdtempSync(join(tmpdir(), 'clawx-memory-status-'));
    workspaceDir = join(homeDir, '.openclaw', 'agents', 'main', 'workspace');
    await mkdir(workspaceDir, { recursive: true });
    mockHomedir.mockReturnValue(homeDir);
    mockExecFile.mockImplementation((file, args, options, callback) => {
      callback(null, JSON.stringify({ indexed: true, totalEntries: 3 }), '');
      return {} as never;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (homeDir && existsSync(homeDir)) {
      rmSync(homeDir, { recursive: true, force: true });
    }
  });

  it('uses async execFile for memory status and returns parsed JSON', async () => {
    mockExecFile.mockImplementation((file, args, options, callback) => {
      const payload = JSON.stringify({
        indexed: true,
        lastIndexed: '2026-03-22T00:00:00Z',
        totalEntries: 12,
        vectorAvailable: true,
        embeddingProvider: 'openai',
      });
      callback(null, payload, '');
      return {} as never;
    });

    const { handleMemoryRoutes } = await import('@electron/api/routes/memory');
    const handled = await handleMemoryRoutes(
      { method: 'GET' } as IncomingMessage,
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/memory'),
      {} as never,
    );

    expect(handled).toBe(true);
    expect(mockSendJson).toHaveBeenCalledTimes(1);
    expect(mockExecFile).toHaveBeenCalledTimes(1);
    const [file, args, options] = mockExecFile.mock.calls[0] as [string, string[], { timeout?: number }];
    expect(file).toBe('openclaw');
    expect(args).toEqual(['memory', 'status', '--deep']);
    expect(options.timeout).toBe(8000);

    const [, statusCode, payload] = mockSendJson.mock.calls[0] as [unknown, number, { status: { indexed: boolean } }];
    expect(statusCode).toBe(200);
    expect(payload.status.indexed).toBe(true);
  });

  it('enumerates agent scopes plus companion and extraPath files for a selected scope', async () => {
    const analystWorkspace = join(homeDir, '.openclaw', 'agents', 'analyst', 'workspace');
    await mkdir(join(analystWorkspace, 'memory'), { recursive: true });
    await mkdir(join(analystWorkspace, 'knowledge'), { recursive: true });
    writeFileSync(join(analystWorkspace, 'memory', 'notes.md'), 'analyst notes', 'utf-8');
    writeFileSync(join(analystWorkspace, 'AGENTS.md'), 'agent profile', 'utf-8');
    writeFileSync(join(analystWorkspace, 'HEARTBEAT.md'), 'heartbeat', 'utf-8');
    writeFileSync(join(analystWorkspace, 'IDENTITY.md'), 'identity', 'utf-8');
    writeFileSync(join(analystWorkspace, 'SOUL.md'), 'soul', 'utf-8');
    writeFileSync(join(analystWorkspace, 'TOOLS.md'), 'tools', 'utf-8');
    writeFileSync(join(analystWorkspace, 'USER.md'), 'user', 'utf-8');
    writeFileSync(join(analystWorkspace, 'knowledge', 'brief.md'), 'extra scope notes', 'utf-8');
    writeFileSync(
      join(homeDir, '.openclaw', 'agents', 'analyst', 'openclaw.json'),
      JSON.stringify({
        agents: {
          defaults: {
            memorySearch: {
              enabled: true,
              extraPaths: ['knowledge/brief.md'],
            },
          },
        },
      }),
      'utf-8',
    );

    const { handleMemoryRoutes } = await import('@electron/api/routes/memory');
    const handled = await handleMemoryRoutes(
      { method: 'GET' } as IncomingMessage,
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/memory?scope=analyst'),
      {} as never,
    );

    expect(handled).toBe(true);
    expect(mockSendJson).toHaveBeenCalledTimes(1);
    const [, statusCode, payload] = mockSendJson.mock.calls[0] as [
      unknown,
      number,
      {
        activeScope?: string;
        scopes?: Array<{ id: string }>;
        files?: Array<{ relativePath: string }>;
      },
    ];

    expect(statusCode).toBe(200);
    expect(payload.activeScope).toBe('analyst');
    expect(payload.scopes?.map((scope) => scope.id)).toEqual(expect.arrayContaining(['main', 'analyst']));
    expect(payload.files?.map((file) => file.relativePath)).toEqual(
      expect.arrayContaining([
        'AGENTS.md',
        'HEARTBEAT.md',
        'IDENTITY.md',
        'SOUL.md',
        'TOOLS.md',
        'USER.md',
        'knowledge/brief.md',
      ]),
    );
  });

  it('supports query filtering with hit counts and lightweight highlights', async () => {
    const analystWorkspace = join(homeDir, '.openclaw', 'agents', 'analyst', 'workspace');
    await mkdir(join(analystWorkspace, 'memory'), { recursive: true });
    writeFileSync(join(analystWorkspace, 'memory', 'daily.md'), 'alpha item alpha done', 'utf-8');
    writeFileSync(join(analystWorkspace, 'AGENTS.md'), 'owns alpha workflows', 'utf-8');
    writeFileSync(join(analystWorkspace, 'TOOLS.md'), 'tools only', 'utf-8');

    const { handleMemoryRoutes } = await import('@electron/api/routes/memory');
    const handled = await handleMemoryRoutes(
      { method: 'GET' } as IncomingMessage,
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/memory?scope=analyst&q=alpha'),
      {} as never,
    );

    expect(handled).toBe(true);
    expect(mockSendJson).toHaveBeenCalledTimes(1);
    const [, statusCode, payload] = mockSendJson.mock.calls[0] as [
      unknown,
      number,
      {
        search?: { query?: string; totalHits?: number };
        files?: Array<{
          relativePath: string;
          search?: {
            hitCount?: number;
            highlights?: Array<{
              start: number;
              end: number;
              snippet: string;
            }>;
          };
        }>;
      },
    ];

    expect(statusCode).toBe(200);
    expect(payload.search?.query).toBe('alpha');
    expect(payload.search?.totalHits).toBeGreaterThan(0);
    expect(payload.files?.every((file) => (file.search?.hitCount ?? 0) > 0)).toBe(true);
    const highlighted = payload.files?.find((file) => (file.search?.highlights?.length ?? 0) > 0);
    expect(highlighted).toBeDefined();
    expect(highlighted?.search?.highlights?.[0]).toMatchObject({
      start: expect.any(Number),
      end: expect.any(Number),
      snippet: expect.stringContaining('alpha'),
    });
  });

  it('uses async execFile for reindex and returns ok on success', async () => {
    mockExecFile.mockImplementation((file, args, options, callback) => {
      callback(null, 'done', '');
      return {} as never;
    });

    const { handleMemoryRoutes } = await import('@electron/api/routes/memory');
    const handled = await handleMemoryRoutes(
      { method: 'POST' } as IncomingMessage,
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/memory/reindex'),
      {} as never,
    );

    expect(handled).toBe(true);
    expect(mockSendJson).toHaveBeenCalledTimes(1);
    expect(mockExecFile).toHaveBeenCalledTimes(1);
    const [file, args, options] = mockExecFile.mock.calls[0] as [string, string[], { timeout?: number }];
    expect(file).toBe('openclaw');
    expect(args).toEqual(['memory', 'reindex']);
    expect(options.timeout).toBe(30000);

    const [, statusCode, payload] = mockSendJson.mock.calls[0] as [unknown, number, { ok?: boolean }];
    expect(statusCode).toBe(200);
    expect(payload.ok).toBe(true);
  });
});
