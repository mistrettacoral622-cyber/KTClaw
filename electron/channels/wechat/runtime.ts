import { resolve } from 'node:path';
import { importWeChatPluginModule } from '../../utils/wechat-plugin-loader';
import { readOpenClawConfig } from '../../utils/channel-config';

export interface WeChatRuntime {
  loadConfig: () => Promise<Record<string, unknown> | null>;
  loadPluginModule: (relativePath?: string) => Promise<Record<string, unknown>>;
  mediaLocalRoots: string[];
}

export interface BuildWeChatRuntimeOptions {
  loadConfig: () => Promise<Record<string, unknown> | null>;
  loadPluginModule: (relativePath?: string) => Promise<Record<string, unknown>>;
  mediaLocalRoots?: string[];
}

export function buildWeChatRuntime(options: BuildWeChatRuntimeOptions): WeChatRuntime {
  return {
    loadConfig: options.loadConfig,
    loadPluginModule: (relativePath = 'src/channel.js') => options.loadPluginModule(relativePath),
    mediaLocalRoots: [...(options.mediaLocalRoots ?? [resolve(process.cwd())])],
  };
}

export function createWeChatRuntime(): WeChatRuntime {
  return buildWeChatRuntime({
    loadConfig: async () => {
      const cfg = await readOpenClawConfig();
      return cfg as Record<string, unknown> | null;
    },
    loadPluginModule: (relativePath = 'src/channel.js') => importWeChatPluginModule(relativePath),
  });
}
