import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(__dirname, '..', '..');

const FILES_WITHOUT_DIRECT_CONSOLE = [
  'electron/api/routes/agents.ts',
  'electron/api/routes/channels.ts',
  'electron/gateway/clawhub.ts',
  'electron/utils/secure-storage.ts',
  'electron/utils/skill-config.ts',
  'electron/utils/whatsapp-login.ts',
  'electron/main/ipc-handlers.ts',
  'electron/utils/openclaw-auth.ts',
  'electron/services/providers/provider-validation.ts',
];

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(REPO_ROOT, relativePath), 'utf-8');
}

describe('backend cleanup guards', () => {
  it.each(FILES_WITHOUT_DIRECT_CONSOLE)('%s uses the shared logger instead of direct console calls', (relativePath) => {
    const source = readRepoFile(relativePath);
    expect(source).not.toMatch(/\bconsole\.(debug|info|log|warn|error)\s*\(/);
  });

  it('removes the unreachable legacy memory extract block', () => {
    const source = readRepoFile('electron/api/routes/memory.ts');
    expect(source).not.toContain('rawMessages.length < 0');
    expect(source).not.toContain('no_substantial_content');
  });

  it('does not statically import the WhatsApp login manager into startup-critical main-process modules', () => {
    const mainEntry = readRepoFile('electron/main/index.ts');
    const ipcHandlers = readRepoFile('electron/main/ipc-handlers.ts');

    expect(mainEntry).not.toContain("from '../utils/whatsapp-login'");
    expect(ipcHandlers).not.toContain("from '../utils/whatsapp-login'");
  });
});
