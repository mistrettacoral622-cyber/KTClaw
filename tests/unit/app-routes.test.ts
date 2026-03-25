// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'http';

const {
  runOpenClawDoctorMock,
  runOpenClawDoctorFixMock,
  sendJsonMock,
  sendNoContentMock,
  rmMock,
  readdirMock,
} = vi.hoisted(() => ({
  runOpenClawDoctorMock: vi.fn(),
  runOpenClawDoctorFixMock: vi.fn(),
  sendJsonMock: vi.fn(),
  sendNoContentMock: vi.fn(),
  rmMock: vi.fn(),
  readdirMock: vi.fn(),
}));

vi.mock('@electron/utils/openclaw-doctor', () => ({
  runOpenClawDoctor: (...args: unknown[]) => runOpenClawDoctorMock(...args),
  runOpenClawDoctorFix: (...args: unknown[]) => runOpenClawDoctorFixMock(...args),
}));

vi.mock('@electron/utils/paths', () => ({
  getOpenClawConfigDir: () => 'C:/openclaw',
  getLogsDir: () => 'C:/ktclaw/logs',
}));

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    rm: (...args: unknown[]) => rmMock(...args),
    readdir: (...args: unknown[]) => readdirMock(...args),
  };
});

vi.mock('@electron/api/route-utils', () => ({
  setCorsHeaders: vi.fn(),
  parseJsonBody: vi.fn().mockResolvedValue({}),
  sendJson: (...args: unknown[]) => sendJsonMock(...args),
  sendNoContent: (...args: unknown[]) => sendNoContentMock(...args),
}));

describe('handleAppRoutes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    rmMock.mockResolvedValue(undefined);
    readdirMock.mockResolvedValue(['main', 'agent-a']);
  });

  it('runs openclaw doctor through the host api', async () => {
    runOpenClawDoctorMock.mockResolvedValueOnce({ success: true, exitCode: 0 });
    const { handleAppRoutes } = await import('@electron/api/routes/app');

    const handled = await handleAppRoutes(
      { method: 'POST' } as IncomingMessage,
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/app/openclaw-doctor'),
      {} as never,
    );

    expect(handled).toBe(true);
    expect(runOpenClawDoctorMock).toHaveBeenCalledTimes(1);
    expect(sendJsonMock).toHaveBeenCalledWith(expect.anything(), 200, { success: true, exitCode: 0 });
  });

  it('runs openclaw doctor fix when requested', async () => {
    const { parseJsonBody } = await import('@electron/api/route-utils');
    vi.mocked(parseJsonBody).mockResolvedValueOnce({ mode: 'fix' });
    runOpenClawDoctorFixMock.mockResolvedValueOnce({ success: false, exitCode: 1 });
    const { handleAppRoutes } = await import('@electron/api/routes/app');

    const handled = await handleAppRoutes(
      { method: 'POST' } as IncomingMessage,
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/app/openclaw-doctor'),
      {} as never,
    );

    expect(handled).toBe(true);
    expect(runOpenClawDoctorFixMock).toHaveBeenCalledTimes(1);
    expect(sendJsonMock).toHaveBeenCalledWith(expect.anything(), 200, { success: false, exitCode: 1 });
  });

  it('clears local server data through the host api', async () => {
    const { handleAppRoutes } = await import('@electron/api/routes/app');

    const handled = await handleAppRoutes(
      { method: 'POST' } as IncomingMessage,
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/app/clear-server-data'),
      {
        gatewayManager: {
          getStatus: () => ({ state: 'stopped' }),
          stop: vi.fn().mockResolvedValue(undefined),
          start: vi.fn().mockResolvedValue(undefined),
        },
      } as never,
    );

    expect(handled).toBe(true);
    expect(sendJsonMock).toHaveBeenCalledWith(expect.anything(), 200, { success: true });
  });
});
