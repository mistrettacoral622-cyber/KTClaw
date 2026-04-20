import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConnectionHealthMonitor } from '../../electron/channels/shared/health';

describe('ConnectionHealthMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('getStatus returns connected initially', () => {
    const monitor = new ConnectionHealthMonitor({
      onReconnect: vi.fn(),
    });
    expect(monitor.getStatus()).toBe('connected');
  });

  it('start() begins watchdog interval', () => {
    const onReconnect = vi.fn();
    const monitor = new ConnectionHealthMonitor({
      checkIntervalMs: 1000,
      graceMs: 2000,
      onReconnect,
    });
    monitor.start();
    vi.advanceTimersByTime(3000);
    expect(onReconnect).toHaveBeenCalled();
    monitor.stop();
  });

  it('reportAlive() resets the grace timer', () => {
    const onReconnect = vi.fn();
    const monitor = new ConnectionHealthMonitor({
      checkIntervalMs: 1000,
      graceMs: 2000,
      onReconnect,
    });
    monitor.start();
    vi.advanceTimersByTime(1500);
    monitor.reportAlive();
    vi.advanceTimersByTime(1500);
    // grace period reset, should not have triggered reconnect yet
    expect(onReconnect).not.toHaveBeenCalled();
    monitor.stop();
  });

  it('status changes to disconnected after grace period without reportAlive', () => {
    const onStatusChange = vi.fn();
    const monitor = new ConnectionHealthMonitor({
      checkIntervalMs: 1000,
      graceMs: 2000,
      onReconnect: vi.fn(),
      onStatusChange,
    });
    monitor.start();
    vi.advanceTimersByTime(3000);
    expect(monitor.getStatus()).toBe('disconnected');
    expect(onStatusChange).toHaveBeenCalledWith('disconnected');
    monitor.stop();
  });

  it('onReconnect is called after grace period without reportAlive', () => {
    const onReconnect = vi.fn();
    const monitor = new ConnectionHealthMonitor({
      checkIntervalMs: 1000,
      graceMs: 2000,
      minReconnectIntervalMs: 500,
      onReconnect,
    });
    monitor.start();
    vi.advanceTimersByTime(3000);
    expect(onReconnect).toHaveBeenCalledWith(expect.stringContaining('no heartbeat'));
    monitor.stop();
  });

  it('onReconnect is NOT called again within minReconnectIntervalMs', () => {
    const onReconnect = vi.fn();
    const monitor = new ConnectionHealthMonitor({
      checkIntervalMs: 500,
      graceMs: 1000,
      minReconnectIntervalMs: 5000,
      onReconnect,
    });
    monitor.start();
    vi.advanceTimersByTime(2000);
    const callCount = onReconnect.mock.calls.length;
    vi.advanceTimersByTime(2000);
    // Should not have been called again within minReconnectIntervalMs
    expect(onReconnect.mock.calls.length).toBe(callCount);
    monitor.stop();
  });

  it('stop() cancels the watchdog — no more callbacks after stop', () => {
    const onReconnect = vi.fn();
    const monitor = new ConnectionHealthMonitor({
      checkIntervalMs: 1000,
      graceMs: 2000,
      onReconnect,
    });
    monitor.start();
    vi.advanceTimersByTime(1000);
    monitor.stop();
    vi.advanceTimersByTime(5000);
    expect(onReconnect).not.toHaveBeenCalled();
  });

  it('reportAlive() transitions status back to connected', () => {
    const onStatusChange = vi.fn();
    const monitor = new ConnectionHealthMonitor({
      checkIntervalMs: 1000,
      graceMs: 2000,
      onReconnect: vi.fn(),
      onStatusChange,
    });
    monitor.start();
    vi.advanceTimersByTime(3000);
    expect(monitor.getStatus()).toBe('disconnected');
    monitor.reportAlive();
    expect(monitor.getStatus()).toBe('connected');
    expect(onStatusChange).toHaveBeenCalledWith('connected');
    monitor.stop();
  });

  it('multiple start() calls are idempotent', () => {
    const onReconnect = vi.fn();
    const monitor = new ConnectionHealthMonitor({
      checkIntervalMs: 1000,
      graceMs: 2000,
      minReconnectIntervalMs: 500,
      onReconnect,
    });
    monitor.start();
    monitor.start();
    monitor.start();
    vi.advanceTimersByTime(3000);
    // Should only fire once, not 3 times
    expect(onReconnect.mock.calls.length).toBe(1);
    monitor.stop();
  });

  it('AbortSignal abort stops the monitor', () => {
    const onReconnect = vi.fn();
    const controller = new AbortController();
    const monitor = new ConnectionHealthMonitor({
      checkIntervalMs: 1000,
      graceMs: 2000,
      onReconnect,
    });
    monitor.start(controller.signal);
    vi.advanceTimersByTime(1000);
    controller.abort();
    vi.advanceTimersByTime(5000);
    expect(onReconnect).not.toHaveBeenCalled();
  });
});
