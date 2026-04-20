import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readlinkSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const LOCK_SCHEMA = 'ktclaw-instance-lock';
const LOCK_VERSION = 2;

export interface ProcessInstanceFileLock {
  acquired: boolean;
  lockPath: string;
  ownerPid?: number;
  ownerFormat?: 'legacy' | 'structured' | 'unknown';
  release: () => void;
}

export interface ProcessInstanceFileLockOptions {
  userDataDir: string;
  lockName: string;
  pid?: number;
  isPidAlive?: (pid: number) => boolean;
  readProcessExecutablePath?: (pid: number) => string | undefined;
  currentProcessExecutablePath?: string;
  /**
   * When true, remove any existing lock file before acquiring.
   * Use this when another mechanism (Electron single-instance lock)
   * already guarantees exclusivity.
   */
  force?: boolean;
}

function defaultPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const errno = (error as NodeJS.ErrnoException).code;
    return errno !== 'ESRCH';
  }
}

type ParsedLockOwner =
  | { kind: 'legacy'; pid: number }
  | { kind: 'structured'; pid: number; execPath?: string }
  | { kind: 'unknown' };

interface StructuredLockContent {
  schema: string;
  version: number;
  pid: number;
  execPath?: string;
}

function parsePositivePid(raw: string): number | undefined {
  if (!/^\d+$/.test(raw)) {
    return undefined;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}

function parseStructuredLockContent(raw: string): StructuredLockContent | undefined {
  try {
    const parsed = JSON.parse(raw) as Partial<StructuredLockContent>;
    if (
      parsed?.schema === LOCK_SCHEMA
      && typeof parsed?.version === 'number'
      && parsed.version >= 1
      && parsed.version <= LOCK_VERSION
      && typeof parsed?.pid === 'number'
      && Number.isFinite(parsed.pid)
      && parsed.pid > 0
    ) {
      return {
        schema: parsed.schema,
        version: parsed.version,
        pid: parsed.pid,
        execPath: typeof parsed.execPath === 'string' && parsed.execPath.trim() ? parsed.execPath : undefined,
      };
    }
  } catch {
    // ignore parse errors
  }
  return undefined;
}

function readLockOwner(lockPath: string): ParsedLockOwner {
  try {
    const raw = readFileSync(lockPath, 'utf8').trim();
    const legacyPid = parsePositivePid(raw);
    if (legacyPid !== undefined) {
      return { kind: 'legacy', pid: legacyPid };
    }

    const structured = parseStructuredLockContent(raw);
    if (structured) {
      return { kind: 'structured', pid: structured.pid, execPath: structured.execPath };
    }
  } catch {
    // ignore read errors
  }
  return { kind: 'unknown' };
}

function normalizeExecutablePath(execPath: string | undefined): string | undefined {
  if (!execPath) {
    return undefined;
  }

  const normalized = execPath.trim();
  if (!normalized) {
    return undefined;
  }

  return process.platform === 'win32'
    ? normalized.replace(/\//g, '\\').toLowerCase()
    : normalized;
}

function defaultReadProcessExecutablePath(pid: number): string | undefined {
  try {
    if (process.platform === 'win32') {
      const command = `(Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" | Select-Object -ExpandProperty ExecutablePath)`;
      return execFileSync(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', command],
        { stdio: ['ignore', 'pipe', 'ignore'] },
      ).toString('utf8').trim() || undefined;
    }

    if (process.platform === 'linux') {
      return readlinkSync(`/proc/${pid}/exe`);
    }

    if (process.platform === 'darwin') {
      return execFileSync(
        'ps',
        ['-p', String(pid), '-o', 'comm='],
        { stdio: ['ignore', 'pipe', 'ignore'] },
      ).toString('utf8').trim() || undefined;
    }
  } catch {
    // ignore best-effort identity probing failures
  }

  return undefined;
}

export function acquireProcessInstanceFileLock(
  options: ProcessInstanceFileLockOptions,
): ProcessInstanceFileLock {
  const pid = options.pid ?? process.pid;
  const isPidAlive = options.isPidAlive ?? defaultPidAlive;
  const readProcessExecutablePath = options.readProcessExecutablePath ?? defaultReadProcessExecutablePath;
  const currentProcessExecutablePath = normalizeExecutablePath(options.currentProcessExecutablePath ?? process.execPath);

  mkdirSync(options.userDataDir, { recursive: true });
  const lockPath = join(options.userDataDir, `${options.lockName}.instance.lock`);

  if (options.force && existsSync(lockPath)) {
    const staleOwner = readLockOwner(lockPath);
    try {
      rmSync(lockPath, { force: true });
    } catch {
      // best-effort
    }
    if (staleOwner.kind !== 'unknown') {
      try {
        console.info(
          `[KTClaw] Force-cleaned stale instance lock (pid=${staleOwner.pid}, format=${staleOwner.kind})`,
        );
      } catch {
        // Dev stdout may already be closed; lock cleanup should still proceed.
      }
    }
  }

  let ownerPid: number | undefined;
  let ownerFormat: ProcessInstanceFileLock['ownerFormat'] = 'unknown';

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = openSync(lockPath, 'wx');
      try {
        writeFileSync(
          fd,
          JSON.stringify({
            schema: LOCK_SCHEMA,
            version: LOCK_VERSION,
            pid,
            execPath: options.currentProcessExecutablePath ?? process.execPath,
          }),
          'utf8',
        );
      } finally {
        closeSync(fd);
      }

      let released = false;
      return {
        acquired: true,
        lockPath,
        release: () => {
          if (released) return;
          released = true;
          try {
            const currentOwner = readLockOwner(lockPath);
            if (
              (currentOwner.kind === 'legacy' || currentOwner.kind === 'structured')
              && currentOwner.pid !== pid
            ) {
              return;
            }
            if (currentOwner.kind === 'unknown') {
              return;
            }
            rmSync(lockPath, { force: true });
          } catch {
            // best-effort
          }
        },
      };
    } catch (error) {
      const errno = (error as NodeJS.ErrnoException).code;
      if (errno !== 'EEXIST') {
        break;
      }

      const owner = readLockOwner(lockPath);
      if (owner.kind === 'legacy' || owner.kind === 'structured') {
        ownerPid = owner.pid;
        ownerFormat = owner.kind;
      } else {
        ownerPid = undefined;
        ownerFormat = 'unknown';
      }

      const shouldTreatAsStale =
        (owner.kind === 'legacy' || owner.kind === 'structured')
        && !isPidAlive(owner.pid);
      const ownerExecutablePath =
        owner.kind === 'legacy' || owner.kind === 'structured'
          ? normalizeExecutablePath(readProcessExecutablePath(owner.pid))
          : undefined;
      const shouldTreatAsReusedPid =
        (owner.kind === 'legacy' || owner.kind === 'structured')
        && currentProcessExecutablePath !== undefined
        && ownerExecutablePath !== undefined
        && ownerExecutablePath !== currentProcessExecutablePath;
      if (shouldTreatAsStale && existsSync(lockPath)) {
        try {
          rmSync(lockPath, { force: true });
          continue;
        } catch {
          // treat as held lock
        }
      }

      if (shouldTreatAsReusedPid && existsSync(lockPath)) {
        try {
          rmSync(lockPath, { force: true });
          continue;
        } catch {
          // treat as held lock
        }
      }

      break;
    }
  }

  return {
    acquired: false,
    lockPath,
    ownerPid,
    ownerFormat,
    release: () => {
      // no-op
    },
  };
}
