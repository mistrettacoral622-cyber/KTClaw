import { describe, expect, it, vi } from 'vitest';
import { HostEventBus } from '@electron/api/event-bus';

describe('HostEventBus', () => {
  it('emits to in-process listeners and SSE clients', () => {
    const bus = new HostEventBus();
    const listener = vi.fn();
    const end = vi.fn();
    const closeHandler = vi.fn();
    const write = vi.fn();
    const res = {
      write,
      end,
      on: vi.fn((event: string, handler: () => void) => {
        if (event === 'close') {
          closeHandler.mockImplementation(handler);
        }
      }),
    };

    bus.addSseClient(res as never);
    bus.on('task:completed', listener);

    bus.emit('task:completed', { taskId: 't1' });

    expect(listener).toHaveBeenCalledWith({ taskId: 't1' });
    expect(write).toHaveBeenCalledWith('event: task:completed\ndata: {"taskId":"t1"}\n\n');
  });
});
