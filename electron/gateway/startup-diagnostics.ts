export type GatewayStartupPhaseOutcome = 'running' | 'success' | 'error';
export type GatewayStartupOutcome = 'idle' | 'running' | 'success' | 'error';

export interface GatewayStartupPhaseSnapshot {
  phase: string;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  outcome: GatewayStartupPhaseOutcome;
  error?: string;
}

export interface GatewayStartupDiagnosticsSnapshot {
  outcome: GatewayStartupOutcome;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  phases: GatewayStartupPhaseSnapshot[];
}

function normalizeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class GatewayStartupDiagnostics {
  private snapshot: GatewayStartupDiagnosticsSnapshot = {
    outcome: 'idle',
    phases: [],
  };

  begin(): void {
    this.snapshot = {
      outcome: 'running',
      startedAt: Date.now(),
      phases: [],
    };
  }

  phaseStarted(phase: string): void {
    const existing = this.snapshot.phases.find((entry) => entry.phase === phase && entry.outcome === 'running');
    if (existing) return;
    this.snapshot.phases.push({
      phase,
      startedAt: Date.now(),
      outcome: 'running',
    });
  }

  phaseSucceeded(phase: string): void {
    const entry = this.findPhase(phase);
    if (!entry) return;
    const endedAt = Date.now();
    entry.endedAt = endedAt;
    entry.durationMs = endedAt - entry.startedAt;
    entry.outcome = 'success';
    delete entry.error;
  }

  phaseFailed(phase: string, error: unknown): void {
    const entry = this.findPhase(phase);
    if (!entry) return;
    const endedAt = Date.now();
    entry.endedAt = endedAt;
    entry.durationMs = endedAt - entry.startedAt;
    entry.outcome = 'error';
    entry.error = normalizeError(error);
  }

  finish(outcome: Extract<GatewayStartupOutcome, 'success' | 'error'>, error?: unknown): void {
    this.snapshot.outcome = outcome;
    this.snapshot.completedAt = Date.now();
    if (outcome === 'error' && error !== undefined) {
      this.snapshot.error = normalizeError(error);
      return;
    }
    delete this.snapshot.error;
  }

  getSnapshot(): GatewayStartupDiagnosticsSnapshot {
    return {
      ...this.snapshot,
      phases: this.snapshot.phases.map((phase) => ({ ...phase })),
    };
  }

  private findPhase(phase: string): GatewayStartupPhaseSnapshot | undefined {
    for (let index = this.snapshot.phases.length - 1; index >= 0; index -= 1) {
      const entry = this.snapshot.phases[index];
      if (entry?.phase === phase) {
        return entry;
      }
    }
    return undefined;
  }
}
