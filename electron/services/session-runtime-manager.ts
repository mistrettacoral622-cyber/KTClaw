import { randomUUID } from 'node:crypto';

export type RuntimeSessionStatus =
  | 'running'
  | 'blocked'
  | 'waiting_approval'
  | 'error'
  | 'completed'
  | 'killed';
export type RuntimeSessionMode = 'session' | 'thread';

export interface RuntimeSessionRecord {
  id: string;
  parentSessionKey: string;
  sessionKey: string;
  mode: RuntimeSessionMode;
  prompt: string;
  agentName?: string;
  attachments: string[];
  sandbox?: string;
  timeoutMs?: number;
  status: RuntimeSessionStatus;
  runId?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  transcript: string[];
  toolSnapshot: Array<{ server: string; name: string }>;
  skillSnapshot: string[];
}

export interface SpawnRuntimeSessionInput {
  parentSessionKey: string;
  prompt: string;
  mode?: RuntimeSessionMode;
  agentName?: string;
  attachments?: string[];
  sandbox?: string;
  timeoutMs?: number;
}

interface GatewayRpcClient {
  rpc<T>(method: string, params?: unknown, timeoutMs?: number): Promise<T>;
}

interface RuntimeSessionSnapshot {
  sessionKey: string;
  status?: string;
  runId?: string;
  lastError?: string;
  updatedAt?: string;
}

interface RuntimeHistorySnapshot {
  transcript: string[];
  status?: string;
  runId?: string;
  lastError?: string;
  updatedAt?: string;
}

interface RuntimeCapabilityProvider {
  listMcpTools?: () => Array<{ server: string; name: string }>;
  listEnabledSkills?: () => Promise<string[]> | string[];
}

export class SessionRuntimeManager {
  private readonly sessions = new Map<string, RuntimeSessionRecord>();

  constructor(
    private readonly gatewayClient?: GatewayRpcClient,
    private readonly capabilityProvider: RuntimeCapabilityProvider = {},
  ) { }

  async spawn(input: SpawnRuntimeSessionInput): Promise<RuntimeSessionRecord> {
    const now = new Date().toISOString();
    const id = randomUUID();
    const sessionKey = this.buildRuntimeSessionKey(input.parentSessionKey, id);
    const capabilitySnapshot = await this.buildCapabilitySnapshot();
    const record: RuntimeSessionRecord = {
      id,
      parentSessionKey: input.parentSessionKey,
      sessionKey,
      mode: input.mode ?? 'session',
      prompt: input.prompt,
      agentName: input.agentName,
      attachments: input.attachments ?? [],
      sandbox: input.sandbox,
      timeoutMs: input.timeoutMs,
      status: 'running',
      createdAt: now,
      updatedAt: now,
      transcript: [input.prompt],
      toolSnapshot: capabilitySnapshot.toolSnapshot,
      skillSnapshot: capabilitySnapshot.skillSnapshot,
    };
    this.sessions.set(record.id, record);
    const sendResult = await this.gatewayRpc<Record<string, unknown>>('chat.send', {
      sessionKey,
      message: input.prompt,
      deliver: false,
      mode: record.mode,
      ...(record.agentName ? { agentName: record.agentName } : {}),
      ...(record.attachments.length > 0 ? { attachments: record.attachments } : {}),
      ...(record.sandbox ? { sandbox: record.sandbox } : {}),
      ...(typeof record.timeoutMs === 'number' ? { timeoutMs: record.timeoutMs } : {}),
    });
    const withRun = this.patchRecord(record.id, {
      runId: this.extractFirstString(sendResult, ['runId', 'run_id']) ?? record.runId,
      updatedAt: new Date().toISOString(),
    });
    return await this.refreshRecord(withRun.id, {
      fallbackStatus: 'running',
      fallbackTranscript: withRun.transcript,
      fallbackRunId: withRun.runId,
    });
  }

  async list(): Promise<RuntimeSessionRecord[]> {
    const snapshots = await this.loadSessionSnapshots();
    const records = [...this.sessions.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return await Promise.all(
      records.map(async (record) => await this.refreshRecord(record.id, {
        snapshots,
        fallbackStatus: record.status,
        fallbackTranscript: record.transcript,
        fallbackRunId: record.runId,
        fallbackLastError: record.lastError,
      })),
    );
  }

  async kill(id: string): Promise<RuntimeSessionRecord | null> {
    const existing = this.sessions.get(id);
    if (!existing) return null;
    await this.gatewayRpc('chat.abort', { sessionKey: existing.sessionKey });
    return await this.refreshRecord(id, {
      fallbackStatus: 'killed',
      forcedStatus: 'killed',
      fallbackTranscript: existing.transcript,
      fallbackRunId: existing.runId,
      fallbackLastError: existing.lastError,
    });
  }

  async steer(id: string, input: string): Promise<RuntimeSessionRecord | null> {
    const existing = this.sessions.get(id);
    if (!existing) return null;
    const sendResult = await this.gatewayRpc<Record<string, unknown>>('chat.send', {
      sessionKey: existing.sessionKey,
      message: input,
      deliver: false,
    });
    const patched = this.patchRecord(id, {
      runId: this.extractFirstString(sendResult, ['runId', 'run_id']) ?? existing.runId,
      updatedAt: new Date().toISOString(),
    });
    return await this.refreshRecord(id, {
      fallbackStatus: 'running',
      fallbackTranscript: [...existing.transcript, input],
      fallbackRunId: patched.runId,
      fallbackLastError: existing.lastError,
    });
  }

  async wait(id: string): Promise<RuntimeSessionRecord | null> {
    const existing = this.sessions.get(id);
    if (!existing) return null;
    return await this.refreshRecord(id, {
      fallbackStatus: existing.status,
      fallbackTranscript: existing.transcript,
      fallbackRunId: existing.runId,
      fallbackLastError: existing.lastError,
    });
  }

  private buildRuntimeSessionKey(parentSessionKey: string, localRuntimeId: string): string {
    return `${parentSessionKey.replace(/:+$/, '')}:subagent:${localRuntimeId}`;
  }

  private async buildCapabilitySnapshot(): Promise<{
    toolSnapshot: Array<{ server: string; name: string }>;
    skillSnapshot: string[];
  }> {
    const toolSnapshot = (this.capabilityProvider.listMcpTools?.() ?? [])
      .filter((tool): tool is { server: string; name: string } => Boolean(tool?.server && tool?.name));

    let skillSnapshot = await this.resolveEnabledSkills();
    skillSnapshot = [...new Set(skillSnapshot.filter((skill) => skill.trim().length > 0))].sort((a, b) => a.localeCompare(b));

    return { toolSnapshot, skillSnapshot };
  }

  private async resolveEnabledSkills(): Promise<string[]> {
    if (this.capabilityProvider.listEnabledSkills) {
      return await Promise.resolve(this.capabilityProvider.listEnabledSkills());
    }

    if (!this.gatewayClient) {
      return [];
    }

    try {
      const payload = await this.gatewayClient.rpc<{
        skills?: Array<{ skillKey?: string; slug?: string; disabled?: boolean }>;
      }>('skills.status');
      return (payload.skills ?? [])
        .filter((skill) => skill.disabled !== true)
        .map((skill) => {
          if (typeof skill.skillKey === 'string' && skill.skillKey.trim()) return skill.skillKey.trim();
          if (typeof skill.slug === 'string' && skill.slug.trim()) return skill.slug.trim();
          return '';
        })
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  private async refreshRecord(
    id: string,
    options: {
      snapshots?: RuntimeSessionSnapshot[];
      fallbackStatus: RuntimeSessionStatus;
      forcedStatus?: RuntimeSessionStatus;
      fallbackTranscript: string[];
      fallbackRunId?: string;
      fallbackLastError?: string;
    },
  ): Promise<RuntimeSessionRecord> {
    const existing = this.sessions.get(id);
    if (!existing) {
      throw new Error(`Runtime session not found: ${id}`);
    }
    const snapshots = options.snapshots ?? await this.loadSessionSnapshots();
    const sessionSnapshot = snapshots.find((item) => item.sessionKey === existing.sessionKey);
    const history = await this.loadHistorySnapshot(existing.sessionKey);

    const next: RuntimeSessionRecord = {
      ...existing,
      status: options.forcedStatus ?? this.mapRuntimeStatus(
        sessionSnapshot?.status ?? history.status,
        options.fallbackStatus,
      ),
      runId: sessionSnapshot?.runId
        ?? history.runId
        ?? options.fallbackRunId
        ?? existing.runId,
      lastError: sessionSnapshot?.lastError
        ?? history.lastError
        ?? options.fallbackLastError
        ?? existing.lastError,
      transcript: history.transcript.length > 0 ? history.transcript : options.fallbackTranscript,
      updatedAt: this.resolveUpdatedAt([
        sessionSnapshot?.updatedAt,
        history.updatedAt,
        existing.updatedAt,
      ]),
    };
    this.sessions.set(id, next);
    return next;
  }

  private async loadSessionSnapshots(): Promise<RuntimeSessionSnapshot[]> {
    const payload = await this.gatewayRpc<unknown>('sessions.list', {});
    const sessionItems = this.extractArray(payload, ['sessions'])
      ?? (Array.isArray(payload) ? payload : []);
    return sessionItems
      .map((item) => this.normalizeSessionSnapshot(item))
      .filter((item): item is RuntimeSessionSnapshot => item != null);
  }

  private normalizeSessionSnapshot(item: unknown): RuntimeSessionSnapshot | null {
    if (typeof item !== 'object' || item == null) {
      return null;
    }
    const row = item as Record<string, unknown>;
    const sessionKey = this.extractFirstString(row, ['sessionKey', 'key']);
    if (!sessionKey) {
      return null;
    }
    return {
      sessionKey,
      status: this.extractFirstString(row, ['status', 'state']),
      runId: this.extractFirstString(row, ['runId', 'run_id']),
      lastError: this.extractFirstString(row, ['lastError', 'error', 'errorMessage']),
      updatedAt: this.coerceIsoDate(row.updatedAt),
    };
  }

  private async loadHistorySnapshot(sessionKey: string): Promise<RuntimeHistorySnapshot> {
    const payload = await this.gatewayRpc<unknown>('chat.history', { sessionKey, limit: 200 });
    const messageItems = this.extractArray(payload, ['messages', 'history'])
      ?? (Array.isArray(payload) ? payload : []);
    return {
      transcript: messageItems
        .map((message) => this.extractTranscriptLine(message))
        .filter((line): line is string => Boolean(line)),
      status: this.extractFirstString(payload, ['status', 'state']),
      runId: this.extractFirstString(payload, ['runId', 'run_id']),
      lastError: this.extractFirstString(payload, ['lastError', 'error', 'errorMessage']),
      updatedAt: this.coerceIsoDate(this.extractFirstValue(payload, ['updatedAt', 'updated_at'])),
    };
  }

  private extractTranscriptLine(message: unknown): string | null {
    if (typeof message === 'string') {
      const value = message.trim();
      return value.length > 0 ? value : null;
    }
    if (typeof message !== 'object' || message == null) {
      return null;
    }
    const row = message as Record<string, unknown>;
    const fromContent = this.extractText(row.content);
    if (fromContent) {
      return fromContent;
    }
    const fromMessage = this.extractText(row.message);
    if (fromMessage) {
      return fromMessage;
    }
    const fromText = this.extractText(row.text);
    if (fromText) {
      return fromText;
    }
    return null;
  }

  private extractText(value: unknown): string | null {
    if (typeof value === 'string') {
      const text = value.trim();
      return text.length > 0 ? text : null;
    }
    if (Array.isArray(value)) {
      const joined = value
        .map((item) => this.extractText(item))
        .filter((entry): entry is string => Boolean(entry))
        .join('\n')
        .trim();
      return joined.length > 0 ? joined : null;
    }
    if (typeof value !== 'object' || value == null) {
      return null;
    }
    const row = value as Record<string, unknown>;
    const blockText = this.extractFirstString(row, ['text', 'thinking']);
    if (blockText) {
      return blockText;
    }
    return this.extractText(this.extractFirstValue(row, ['content', 'message']));
  }

  private mapRuntimeStatus(rawStatus: unknown, fallback: RuntimeSessionStatus): RuntimeSessionStatus {
    const normalized = typeof rawStatus === 'string'
      ? rawStatus.trim().toLowerCase().replace(/[\s-]+/g, '_')
      : '';
    if (!normalized) {
      return fallback;
    }
    if (normalized === 'running' || normalized === 'in_progress' || normalized === 'active' || normalized === 'started') {
      return 'running';
    }
    if (normalized === 'blocked') {
      return 'blocked';
    }
    if (normalized === 'waiting_approval' || normalized === 'awaiting_approval' || normalized === 'pending_approval') {
      return 'waiting_approval';
    }
    if (normalized === 'error' || normalized === 'failed' || normalized === 'failure') {
      return 'error';
    }
    if (normalized === 'completed' || normalized === 'done' || normalized === 'finished' || normalized === 'success') {
      return 'completed';
    }
    if (
      normalized === 'killed'
      || normalized === 'aborted'
      || normalized === 'cancelled'
      || normalized === 'canceled'
      || normalized === 'terminated'
      || normalized === 'stopped'
    ) {
      return 'killed';
    }
    return fallback;
  }

  private patchRecord(id: string, patch: Partial<RuntimeSessionRecord>): RuntimeSessionRecord {
    const current = this.sessions.get(id);
    if (!current) {
      throw new Error(`Runtime session not found: ${id}`);
    }
    const next = { ...current, ...patch };
    this.sessions.set(id, next);
    return next;
  }

  private resolveUpdatedAt(candidates: Array<string | undefined>): string {
    for (const candidate of candidates) {
      if (candidate && !Number.isNaN(Date.parse(candidate))) {
        return candidate;
      }
    }
    return new Date().toISOString();
  }

  private coerceIsoDate(value: unknown): string | undefined {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        return undefined;
      }
      if (!Number.isNaN(Date.parse(trimmed))) {
        return new Date(trimmed).toISOString();
      }
      return undefined;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      const millis = value < 1_000_000_000_000 ? value * 1000 : value;
      return new Date(millis).toISOString();
    }
    return undefined;
  }

  private extractFirstString(source: unknown, keys: string[]): string | undefined {
    const value = this.extractFirstValue(source, keys);
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
  }

  private extractFirstValue(source: unknown, keys: string[]): unknown {
    if (typeof source !== 'object' || source == null) {
      return undefined;
    }
    const row = source as Record<string, unknown>;
    for (const key of keys) {
      if (row[key] !== undefined) {
        return row[key];
      }
    }
    return undefined;
  }

  private extractArray(source: unknown, keys: string[]): unknown[] | null {
    const value = this.extractFirstValue(source, keys);
    return Array.isArray(value) ? value : null;
  }

  private async gatewayRpc<T>(method: string, params?: unknown): Promise<T> {
    if (!this.gatewayClient) {
      throw new Error(`SessionRuntimeManager requires Gateway RPC client for method ${method}`);
    }
    return await this.gatewayClient.rpc<T>(method, params);
  }
}
