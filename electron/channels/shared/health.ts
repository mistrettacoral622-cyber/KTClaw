export interface HealthMonitorOptions {
  checkIntervalMs?: number;        // default 10_000
  graceMs?: number;                // default 30_000
  minReconnectIntervalMs?: number; // default 10_000
  onReconnect: (reason: string) => void;
  onStatusChange?: (status: 'connected' | 'disconnected') => void;
}

export class ConnectionHealthMonitor {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private lastAliveAt: number = 0;
  private lastReconnectAt: number = 0;
  private currentStatus: 'connected' | 'disconnected' = 'connected';
  private readonly checkIntervalMs: number;
  private readonly graceMs: number;
  private readonly minReconnectIntervalMs: number;
  private readonly onReconnect: (reason: string) => void;
  private readonly onStatusChange?: (status: 'connected' | 'disconnected') => void;
  private abortHandler?: () => void;

  constructor(opts: HealthMonitorOptions) {
    this.checkIntervalMs = opts.checkIntervalMs ?? 10_000;
    this.graceMs = opts.graceMs ?? 30_000;
    this.minReconnectIntervalMs = opts.minReconnectIntervalMs ?? 10_000;
    this.onReconnect = opts.onReconnect;
    this.onStatusChange = opts.onStatusChange;
  }

  start(abortSignal?: AbortSignal): void {
    // Idempotent — do nothing if already started
    if (this.intervalHandle !== null) return;

    this.lastAliveAt = Date.now();

    if (abortSignal) {
      this.abortHandler = () => this.stop();
      abortSignal.addEventListener('abort', this.abortHandler);
    }

    this.intervalHandle = setInterval(() => {
      const elapsed = Date.now() - this.lastAliveAt;
      if (elapsed > this.graceMs) {
        if (this.currentStatus !== 'disconnected') {
          this.currentStatus = 'disconnected';
          this.onStatusChange?.('disconnected');
        }
        if (Date.now() - this.lastReconnectAt > this.minReconnectIntervalMs) {
          this.onReconnect(`no heartbeat for ${elapsed}ms`);
          this.lastReconnectAt = Date.now();
        }
      }
    }, this.checkIntervalMs);
  }

  stop(): void {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    // abortHandler cleanup is best-effort; AbortSignal doesn't support removeEventListener in all envs
    this.abortHandler = undefined;
  }

  reportAlive(): void {
    this.lastAliveAt = Date.now();
    if (this.currentStatus === 'disconnected') {
      this.currentStatus = 'connected';
      this.onStatusChange?.('connected');
    }
  }

  getStatus(): 'connected' | 'disconnected' {
    return this.currentStatus;
  }
}
