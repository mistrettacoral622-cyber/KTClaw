// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GatewayStartupDiagnostics } from '@electron/gateway/startup-diagnostics';

describe('gateway startup diagnostics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-22T00:00:00.000Z'));
  });

  it('records phase timings and success outcome', () => {
    const diagnostics = new GatewayStartupDiagnostics();

    diagnostics.begin();
    diagnostics.phaseStarted('start-process');
    vi.advanceTimersByTime(125);
    diagnostics.phaseSucceeded('start-process');
    diagnostics.finish('success');

    const snapshot = diagnostics.getSnapshot();
    expect(snapshot.outcome).toBe('success');
    expect(snapshot.phases).toEqual([
      expect.objectContaining({
        phase: 'start-process',
        outcome: 'success',
        durationMs: 125,
      }),
    ]);
  });

  it('records phase failure and startup error outcome', () => {
    const diagnostics = new GatewayStartupDiagnostics();

    diagnostics.begin();
    diagnostics.phaseStarted('connect');
    vi.advanceTimersByTime(40);
    diagnostics.phaseFailed('connect', new Error('token mismatch'));
    diagnostics.finish('error', new Error('startup failed'));

    const snapshot = diagnostics.getSnapshot();
    expect(snapshot.outcome).toBe('error');
    expect(snapshot.error).toBe('startup failed');
    expect(snapshot.phases).toEqual([
      expect.objectContaining({
        phase: 'connect',
        outcome: 'error',
        durationMs: 40,
        error: 'token mismatch',
      }),
    ]);
  });
});
