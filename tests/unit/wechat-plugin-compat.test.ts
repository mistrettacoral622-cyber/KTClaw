// @vitest-environment node
import { mkdtempSync, mkdirSync, realpathSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  ensurePluginLocalOpenClawPackage,
  patchFeishuPluginCompatibilitySource,
  patchWeChatPluginCompatibilitySource,
} from '@electron/utils/wechat-plugin-compat';

describe('wechat plugin compatibility shim', () => {
  it('replaces normalizeAccountId sdk import with local shim', () => {
    const source = [
      'import type { OpenClawConfig } from "openclaw/plugin-sdk/core";',
      'import { normalizeAccountId } from "openclaw/plugin-sdk/account-id";',
      'const normalized = normalizeAccountId(accountId);',
    ].join('\n');

    const patched = patchWeChatPluginCompatibilitySource(source);

    expect(patched).toContain('KTClaw compatibility shim');
    expect(patched).not.toContain('openclaw/plugin-sdk/account-id');
    expect(patched).toContain('const normalized = normalizeAccountId(accountId);');
  });

  it('rewrites feishu runtime dynamic import to a static import compatible with Windows file URLs', () => {
    const source = [
      'import { FEISHU_CONFIG_JSON_SCHEMA } from \'../core/config-schema.js\';',
      'const pluginLog = larkLogger(\'channel/plugin\');',
      'async function startAccount() {',
      '  const { monitorFeishuProvider } = await import(\'./monitor.js\');',
      '  return monitorFeishuProvider({});',
      '}',
    ].join('\n');

    const patched = patchFeishuPluginCompatibilitySource(source);

    expect(patched).toContain("import { monitorFeishuProvider } from './monitor.js';");
    expect(patched).not.toContain("await import('./monitor.js')");
    expect(patched).toContain('return monitorFeishuProvider({});');
  });

  it('rewrites feishu plugin-sdk named imports to namespace fallbacks', () => {
    const source = [
      "import { DEFAULT_ACCOUNT_ID, PAIRING_APPROVED_MESSAGE } from 'openclaw/plugin-sdk';",
      'const accountId = DEFAULT_ACCOUNT_ID;',
      'const text = PAIRING_APPROVED_MESSAGE;',
    ].join('\n');

    const patched = patchFeishuPluginCompatibilitySource(source);

    expect(patched).toContain("import * as pluginSdk from 'openclaw/plugin-sdk';");
    expect(patched).not.toContain("import { DEFAULT_ACCOUNT_ID, PAIRING_APPROVED_MESSAGE } from 'openclaw/plugin-sdk';");
    expect(patched).toContain("const DEFAULT_ACCOUNT_ID = typeof pluginSdk.DEFAULT_ACCOUNT_ID === 'string'");
    expect(patched).toContain("const PAIRING_APPROVED_MESSAGE = typeof pluginSdk.PAIRING_APPROVED_MESSAGE === 'string'");
    expect(patched).toContain('const accountId = DEFAULT_ACCOUNT_ID;');
    expect(patched).toContain('const text = PAIRING_APPROVED_MESSAGE;');
  });

  it('rewrites feishu onboarding helpers to local fallbacks', () => {
    const source = [
      "import { DEFAULT_ACCOUNT_ID, formatDocsLink } from 'openclaw/plugin-sdk';",
      "const docs = formatDocsLink('/channels/feishu', 'feishu');",
      'return DEFAULT_ACCOUNT_ID;',
    ].join('\n');

    const patched = patchFeishuPluginCompatibilitySource(source);

    expect(patched).toContain("import * as pluginSdk from 'openclaw/plugin-sdk';");
    expect(patched).toContain("const formatDocsLink = typeof pluginSdk.formatDocsLink === 'function'");
    expect(patched).toContain("const DEFAULT_ACCOUNT_ID = typeof pluginSdk.DEFAULT_ACCOUNT_ID === 'string'");
    expect(patched).toContain("const docs = formatDocsLink('/channels/feishu', 'feishu');");
    expect(patched).toContain('return DEFAULT_ACCOUNT_ID;');
  });

  it('forces per-account-channel-peer dmScope in feishu inbound route resolution', () => {
    const source = [
      'const route = core.channel.routing.resolveAgentRoute({',
      '        cfg: accountScopedCfg,',
      "        channel: 'feishu',",
      '        accountId: account.accountId,',
      '        peer: {',
      "            kind: isGroup ? 'group' : 'direct',",
      '            id: isGroup ? ctx.chatId : ctx.senderId,',
      '        },',
      '    });',
    ].join('\n');

    const patched = patchFeishuPluginCompatibilitySource(source);

    expect(patched).toContain('dmScope: "per-account-channel-peer"');
    expect(patched).toContain("kind: isGroup ? 'group' : 'direct'");
  });

  it('creates a local openclaw package alias for installed feishu plugins', () => {
    const sandboxRoot = mkdtempSync(join(tmpdir(), 'ktclaw-feishu-compat-'));
    const pluginRoot = join(sandboxRoot, 'plugin');
    const openClawRoot = join(sandboxRoot, 'openclaw-runtime');

    mkdirSync(join(pluginRoot, 'node_modules'), { recursive: true });
    mkdirSync(openClawRoot, { recursive: true });

    try {
      const patched = ensurePluginLocalOpenClawPackage(pluginRoot, openClawRoot);
      const aliasPath = join(pluginRoot, 'node_modules', 'openclaw');

      expect(patched).toBe(true);
      expect(realpathSync(aliasPath)).toBe(realpathSync(openClawRoot));
    } finally {
      rmSync(sandboxRoot, { recursive: true, force: true });
    }
  });
});
