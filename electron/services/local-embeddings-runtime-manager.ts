import { app } from 'electron';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { mkdir, mkdtemp, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path, { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as tar from 'tar';
import { getResourcesDir } from '../utils/paths';
import { logger } from '../utils/logger';

type SupportedTargetId =
  | 'win32-x64'
  | 'win32-arm64'
  | 'linux-x64'
  | 'linux-arm64'
  | 'darwin-x64'
  | 'darwin-arm64';

type RuntimeState =
  | 'unsupported'
  | 'not_installed'
  | 'installing'
  | 'installed'
  | 'error';

type ManifestTarget = {
  specifier: string;
  packageName: string;
  entry: string;
  url: string;
  integrity: string;
};

type RuntimeManifest = {
  version: string;
  targets: Record<SupportedTargetId, ManifestTarget>;
};

export type LocalEmbeddingsRuntimeStatus = {
  state: RuntimeState;
  version: string;
  targetId: SupportedTargetId | null;
  specifier: string | null;
  installDir: string | null;
  entryPath: string | null;
  requiredByConfig?: boolean;
  error?: string;
};

type RuntimeLaunchConfig = {
  preloadImportPath: string | null;
  env: Record<string, string>;
};

type ManagerDeps = {
  fetchImpl?: typeof fetch;
  getUserDataDir?: () => string;
  getResourcesDir?: () => string;
  writeFileSync?: typeof writeFileSync;
};

const LOADER_DIR_NAME = 'local-embeddings-runtime';
const RUNTIME_ROOT_NAME = 'runtimes';
const MANIFEST_RELATIVE_PATH = join('runtime-manifests', 'local-embeddings.json');
const ENV_REDIRECTS = 'KTCLAW_LOCAL_EMBEDDINGS_REDIRECTS';

const LOADER_SOURCE = `import { pathToFileURL } from 'node:url';

const redirects = (() => {
  try {
    const raw = process.env.${ENV_REDIRECTS} ?? '{}';
    return JSON.parse(raw);
  } catch {
    return {};
  }
})();

export async function resolve(specifier, context, nextResolve) {
  const target = redirects?.[specifier];
  if (typeof target === 'string' && target.length > 0) {
    return { url: pathToFileURL(target).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
`;

const PRELOAD_SOURCE = `import { register } from 'node:module';

register(new URL('./local-embeddings-loader.mjs', import.meta.url), import.meta.url);
`;

function normalizeIntegrity(integrity: string): { algorithm: string; digest: string } {
  const [algorithm, digest] = integrity.split('-', 2);
  if (!algorithm || !digest) {
    throw new Error(`Invalid integrity string: ${integrity}`);
  }
  return { algorithm, digest };
}

function getCurrentTargetId(): SupportedTargetId | null {
  const candidate = `${process.platform}-${process.arch}`;
  switch (candidate) {
    case 'win32-x64':
    case 'win32-arm64':
    case 'linux-x64':
    case 'linux-arm64':
    case 'darwin-x64':
    case 'darwin-arm64':
      return candidate;
    default:
      return null;
  }
}

export class LocalEmbeddingsRuntimeManager {
  private readonly fetchImpl: typeof fetch;
  private readonly getUserDataDirImpl: () => string;
  private readonly getResourcesDirImpl: () => string;
  private readonly writeFileSyncImpl: typeof writeFileSync;
  private installPromise: Promise<LocalEmbeddingsRuntimeStatus> | null = null;

  constructor(deps: ManagerDeps = {}) {
    this.fetchImpl = deps.fetchImpl ?? fetch;
    this.getUserDataDirImpl = deps.getUserDataDir ?? (() => app.getPath('userData'));
    this.getResourcesDirImpl = deps.getResourcesDir ?? getResourcesDir;
    this.writeFileSyncImpl = deps.writeFileSync ?? writeFileSync;
  }

  private getManifestPath(): string {
    return join(this.getResourcesDirImpl(), MANIFEST_RELATIVE_PATH);
  }

  private readManifest(): RuntimeManifest {
    return JSON.parse(readFileSync(this.getManifestPath(), 'utf8')) as RuntimeManifest;
  }

  private getRuntimeRoot(): string {
    return join(this.getUserDataDirImpl(), RUNTIME_ROOT_NAME, 'node-llama-cpp');
  }

  private getLoaderDir(): string {
    return join(this.getUserDataDirImpl(), LOADER_DIR_NAME);
  }

  private getInstallDir(version: string, targetId: SupportedTargetId): string {
    return join(this.getRuntimeRoot(), version, targetId);
  }

  private getEntryPath(version: string, targetId: SupportedTargetId, target: ManifestTarget): string {
    return join(this.getInstallDir(version, targetId), target.entry);
  }

  private ensureLoaderFiles(): { preloadImportPath: string; loaderPath: string } {
    const loaderDir = this.getLoaderDir();
    mkdirSync(loaderDir, { recursive: true });

    const loaderPath = join(loaderDir, 'local-embeddings-loader.mjs');
    const preloadPath = join(loaderDir, 'local-embeddings-preload.mjs');

    this.writeFileSyncImpl(loaderPath, LOADER_SOURCE, 'utf8');
    this.writeFileSyncImpl(preloadPath, PRELOAD_SOURCE, 'utf8');

    return {
      preloadImportPath: preloadPath,
      loaderPath,
    };
  }

  async getStatus(requiredByConfig = false): Promise<LocalEmbeddingsRuntimeStatus> {
    const targetId = getCurrentTargetId();
    const manifest = this.readManifest();

    if (!targetId) {
      return {
        state: 'unsupported',
        version: manifest.version,
        targetId: null,
        specifier: null,
        installDir: null,
        entryPath: null,
        requiredByConfig,
      };
    }

    const target = manifest.targets[targetId];
    const installDir = this.getInstallDir(manifest.version, targetId);
    const entryPath = this.getEntryPath(manifest.version, targetId, target);

    try {
      const metadataPath = join(installDir, 'ktclaw-runtime.json');
      if (!existsSync(entryPath) || !existsSync(metadataPath)) {
        return {
          state: this.installPromise ? 'installing' : 'not_installed',
          version: manifest.version,
          targetId,
          specifier: target.specifier,
          installDir,
          entryPath,
          requiredByConfig,
        };
      }

      await stat(entryPath);
      return {
        state: this.installPromise ? 'installing' : 'installed',
        version: manifest.version,
        targetId,
        specifier: target.specifier,
        installDir,
        entryPath,
        requiredByConfig,
      };
    } catch (error) {
      return {
        state: 'error',
        version: manifest.version,
        targetId,
        specifier: target.specifier,
        installDir,
        entryPath,
        requiredByConfig,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async install(): Promise<LocalEmbeddingsRuntimeStatus> {
    if (this.installPromise) {
      return await this.installPromise;
    }

    this.installPromise = this.installInternal();
    try {
      return await this.installPromise;
    } finally {
      this.installPromise = null;
    }
  }

  private async installInternal(): Promise<LocalEmbeddingsRuntimeStatus> {
    const manifest = this.readManifest();
    const targetId = getCurrentTargetId();
    if (!targetId) {
      throw new Error('Current platform is not supported for local embeddings runtime');
    }

    const target = manifest.targets[targetId];
    const installDir = this.getInstallDir(manifest.version, targetId);
    const entryPath = this.getEntryPath(manifest.version, targetId, target);
    const tempRoot = await mkdtemp(join(tmpdir(), 'ktclaw-local-embeddings-'));
    const archivePath = join(tempRoot, `${target.packageName}-${manifest.version}.tgz`);
    const extractDir = join(tempRoot, 'extract');

    logger.info(`local-embeddings-runtime:download-start target=${targetId} url=${target.url}`);

    try {
      await mkdir(dirname(archivePath), { recursive: true });
      const response = await this.fetchImpl(target.url);
      if (!response.ok) {
        throw new Error(`Failed to download local embeddings runtime: HTTP ${response.status}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      await writeFile(archivePath, buffer);
      this.verifyIntegrity(buffer, target.integrity);

      await mkdir(extractDir, { recursive: true });
      await tar.x({
        file: archivePath,
        cwd: extractDir,
        strip: 1,
      });

      const extractedEntry = join(extractDir, target.entry);
      if (!existsSync(extractedEntry)) {
        throw new Error(`Runtime archive missing expected entry: ${target.entry}`);
      }

      await mkdir(dirname(installDir), { recursive: true });
      await rm(installDir, { recursive: true, force: true });
      await rename(extractDir, installDir);

      await writeFile(
        join(installDir, 'ktclaw-runtime.json'),
        JSON.stringify(
          {
            version: manifest.version,
            targetId,
            specifier: target.specifier,
            installedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
        'utf8',
      );

      logger.info(`local-embeddings-runtime:install-complete target=${targetId} dir=${installDir}`);
      return {
        state: 'installed',
        version: manifest.version,
        targetId,
        specifier: target.specifier,
        installDir,
        entryPath,
      };
    } catch (error) {
      logger.error('local-embeddings-runtime:error', error);
      await rm(installDir, { recursive: true, force: true }).catch(() => undefined);
      throw error;
    } finally {
      await rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  async remove(): Promise<void> {
    const manifest = this.readManifest();
    const targetId = getCurrentTargetId();
    if (!targetId) return;
    await rm(this.getInstallDir(manifest.version, targetId), { recursive: true, force: true });
  }

  async getGatewayLaunchConfig(): Promise<RuntimeLaunchConfig> {
    const status = await this.getStatus();
    if (status.state !== 'installed' || !status.specifier || !status.entryPath) {
      return { preloadImportPath: null, env: {} };
    }

    const { preloadImportPath } = this.ensureLoaderFiles();
    return {
      preloadImportPath,
      env: {
        [ENV_REDIRECTS]: JSON.stringify({
          [status.specifier]: resolve(status.entryPath),
        }),
      },
    };
  }

  private verifyIntegrity(buffer: Buffer, integrity: string): void {
    const { algorithm, digest } = normalizeIntegrity(integrity);
    const normalizedAlgorithm = algorithm.toLowerCase();
    if (normalizedAlgorithm !== 'sha512') {
      throw new Error(`Unsupported integrity algorithm: ${algorithm}`);
    }
    const actual = createHash('sha512').update(buffer).digest('base64');
    if (actual !== digest) {
      throw new Error('Local embeddings runtime integrity verification failed');
    }
  }
}

let runtimeManager: LocalEmbeddingsRuntimeManager | null = null;

export function getLocalEmbeddingsRuntimeManager(): LocalEmbeddingsRuntimeManager {
  runtimeManager ??= new LocalEmbeddingsRuntimeManager();
  return runtimeManager;
}
