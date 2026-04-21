import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('openclaw-weixin inbound session routing', () => {
  it('routes inbound direct messages with account-scoped agent resolution inputs', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'build/openclaw-plugins/openclaw-weixin/src/messaging/process-message.ts'),
      'utf-8',
    );

    expect(source).toContain('accountId: deps.accountId');
    expect(source).toContain('peer: { kind: "direct", id: ctx.To }');
    expect(source).toContain('resolveAgentRoute({');
  });
});
