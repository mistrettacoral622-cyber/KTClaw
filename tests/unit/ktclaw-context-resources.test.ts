import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('KTClaw context resources', () => {
  it('tells the agent to proactively check local skills and tools before replying', () => {
    const content = readFileSync(join(root, 'resources', 'context', 'AGENTS.clawx.md'), 'utf8');

    expect(content).toContain('local skill or tool already fits the job');
    expect(content).toContain('use it proactively');
    expect(content).toContain('browser');
  });

  it('documents the browser evidence-gathering flow in tool notes', () => {
    const content = readFileSync(join(root, 'resources', 'context', 'TOOLS.clawx.md'), 'utf8');

    expect(content).toContain('start');
    expect(content).toContain('snapshot');
    expect(content).toContain('screenshot');
    expect(content).toContain('visual state matters');
  });
});
