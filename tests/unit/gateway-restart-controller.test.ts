// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GatewayRestartController } from '@electron/gateway/restart-controller';

vi.mock('@electron/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('gateway restart controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('drops deferred reload once lifecycle already recovered to running', () => {
    const controller = new GatewayRestartController();
    const executeRestart = vi.fn();

    controller.markDeferredRestart('reload', { state: 'reconnecting', startLock: false });
    controller.flushDeferredRestart(
      'status:reconnecting->running',
      { state: 'running', startLock: false, shouldReconnect: true },
      executeRestart,
    );

    expect(executeRestart).not.toHaveBeenCalled();
  });

  it('still executes deferred restart requests after lifecycle recovers', () => {
    const controller = new GatewayRestartController();
    const executeRestart = vi.fn();

    controller.markDeferredRestart('restart', { state: 'starting', startLock: true });
    controller.flushDeferredRestart(
      'start:finally',
      { state: 'running', startLock: false, shouldReconnect: true },
      executeRestart,
    );

    expect(executeRestart).toHaveBeenCalledTimes(1);
  });

  it('escalates a deferred reload into restart when a real restart request arrives later', () => {
    const controller = new GatewayRestartController();
    const executeRestart = vi.fn();

    controller.markDeferredRestart('reload', { state: 'reconnecting', startLock: false });
    controller.markDeferredRestart('restart', { state: 'reconnecting', startLock: false });
    controller.flushDeferredRestart(
      'restart:finally',
      { state: 'running', startLock: false, shouldReconnect: true },
      executeRestart,
    );

    expect(executeRestart).toHaveBeenCalledTimes(1);
  });
});
