import type { IncomingMessage, ServerResponse } from 'http';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sendJson: vi.fn(),
  parseJsonBody: vi.fn(async (req: IncomingMessage & { __body?: unknown }) => req.__body ?? {}),
  appendTaskExecutionEvent: vi.fn(),
  listTaskSnapshots: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  startTaskExecution: vi.fn(),
  checkPermission: vi.fn(async () => 'allow'),
}));

vi.mock('@electron/api/route-utils', () => ({
  sendJson: mocks.sendJson,
  parseJsonBody: mocks.parseJsonBody,
}));

vi.mock('@electron/utils/task-config', () => ({
  listTaskSnapshots: mocks.listTaskSnapshots,
  createTask: mocks.createTask,
  updateTask: mocks.updateTask,
  deleteTask: mocks.deleteTask,
  startTaskExecution: mocks.startTaskExecution,
  appendTaskExecutionEvent: mocks.appendTaskExecutionEvent,
}));

vi.mock('@electron/utils/permissions-enforcer', () => ({
  checkPermission: mocks.checkPermission,
}));

function createRequest(method: string, body?: unknown): IncomingMessage & { __body?: unknown } {
  return { method, __body: body } as IncomingMessage & { __body?: unknown };
}

describe('task route notifications', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('emits task-completed for done execution events', async () => {
    mocks.appendTaskExecutionEvent.mockResolvedValueOnce({ id: 'task-1' });
    const emit = vi.fn();
    const { handleTaskRoutes } = await import('@electron/api/routes/tasks');

    await handleTaskRoutes(
      createRequest('POST', { type: 'assistant_excerpt', status: 'done', content: 'done' }),
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/tasks/task-1/execution/events'),
      { eventBus: { emit } } as never,
    );

    expect(emit).toHaveBeenCalledWith(
      'task:completed',
      expect.objectContaining({ taskId: 'task-1' }),
    );
  });

  it('emits human-intervention-required for waiting_approval execution events', async () => {
    mocks.appendTaskExecutionEvent.mockResolvedValueOnce({ id: 'task-1' });
    const emit = vi.fn();
    const { handleTaskRoutes } = await import('@electron/api/routes/tasks');

    await handleTaskRoutes(
      createRequest('POST', { type: 'assistant_excerpt', status: 'waiting_approval', content: 'need approval' }),
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/tasks/task-1/execution/events'),
      { eventBus: { emit } } as never,
    );

    expect(emit).toHaveBeenCalledWith(
      'human-intervention-required',
      expect.objectContaining({ taskId: 'task-1', status: 'waiting_approval' }),
    );
  });
});
