import type { IncomingMessage, ServerResponse } from 'http';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sendJson: vi.fn(),
  parseJsonBody: vi.fn(async (req: IncomingMessage & { __body?: unknown }) => req.__body ?? {}),
  checkPermission: vi.fn(async () => 'allow'),
  nativeImageCreateFromPath: vi.fn(() => ({
    isEmpty: () => false,
    getSize: () => ({ width: 20, height: 20 }),
    resize: () => ({ toPNG: () => Buffer.from('resized') }),
  })),
}));

vi.mock('@electron/api/route-utils', () => ({
  parseJsonBody: mocks.parseJsonBody,
  sendJson: mocks.sendJson,
}));

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => 'C:\\tmp'),
  },
  dialog: {
    showSaveDialog: vi.fn(),
  },
  nativeImage: {
    createFromPath: mocks.nativeImageCreateFromPath,
  },
}));

vi.mock('@electron/utils/permissions-enforcer', () => ({
  checkPermission: mocks.checkPermission,
  appendAuditLog: vi.fn(),
}));

function createRequest(
  method: string,
  url: string,
  body?: unknown,
): IncomingMessage & { __body?: unknown } {
  return {
    method,
    __body: body,
  } as IncomingMessage & { __body?: unknown };
}

describe('file route security', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.checkPermission.mockResolvedValue('allow');
  });

  it('allows local image thumbnails through the file read permission gate', async () => {
    const { handleFileRoutes } = await import('@electron/api/routes/files');
    const filePath = join(process.cwd(), 'package.json');

    const handled = await handleFileRoutes(
      createRequest('POST', '/api/files/thumbnails', {
        paths: [{ filePath, mimeType: 'image/png' }],
      }),
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/files/thumbnails'),
      {} as never,
    );

    expect(handled).toBe(true);
    expect(mocks.checkPermission).toHaveBeenCalledWith('file:read', { path: filePath });
    expect(mocks.nativeImageCreateFromPath).toHaveBeenCalledWith(filePath);
    expect(mocks.sendJson).toHaveBeenCalledWith(expect.anything(), 200, {
      [filePath]: {
        preview: expect.stringMatching(/^data:image\/png;base64,/),
        fileSize: expect.any(Number),
      },
    });
  });

  it('falls back to a direct data URL when nativeImage cannot decode the file', async () => {
    mocks.nativeImageCreateFromPath.mockReturnValueOnce({
      isEmpty: () => true,
      getSize: () => ({ width: 0, height: 0 }),
      resize: () => ({ toPNG: () => Buffer.from('') }),
    });
    const { handleFileRoutes } = await import('@electron/api/routes/files');
    const filePath = join(process.cwd(), 'package.json');

    const handled = await handleFileRoutes(
      createRequest('POST', '/api/files/thumbnails', {
        paths: [{ filePath, mimeType: 'image/png' }],
      }),
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/files/thumbnails'),
      {} as never,
    );

    expect(handled).toBe(true);
    expect(mocks.sendJson).toHaveBeenCalledWith(expect.anything(), 200, {
      [filePath]: {
        preview: expect.stringMatching(/^data:image\/png;base64,/),
        fileSize: expect.any(Number),
      },
    });
  });

  it('blocks thumbnail reads when file read permission is denied', async () => {
    mocks.checkPermission.mockResolvedValueOnce('block');
    const { handleFileRoutes } = await import('@electron/api/routes/files');
    const filePath = join(process.cwd(), 'package.json');

    const handled = await handleFileRoutes(
      createRequest('POST', '/api/files/thumbnails', {
        paths: [{ filePath, mimeType: 'image/png' }],
      }),
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/files/thumbnails'),
      {} as never,
    );

    expect(handled).toBe(true);
    expect(mocks.nativeImageCreateFromPath).not.toHaveBeenCalled();
    expect(mocks.sendJson).toHaveBeenCalledWith(expect.anything(), 200, {
      [filePath]: {
        preview: null,
        fileSize: 0,
      },
    });
  });
});
