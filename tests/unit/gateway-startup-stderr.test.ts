// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { classifyGatewayStderrMessage } from '@electron/gateway/startup-stderr';

describe('gateway startup stderr classification', () => {
  it('keeps token mismatch diagnostics visible', () => {
    expect(
      classifyGatewayStderrMessage('[ws] unauthorized token_mismatch').level,
    ).toBe('warn');
    expect(
      classifyGatewayStderrMessage('[ws] closed before connect token mismatch').level,
    ).toBe('warn');
  });

  it('still downgrades code=1005 handshake noise', () => {
    expect(
      classifyGatewayStderrMessage('[ws] closed before connect code=1005').level,
    ).toBe('debug');
  });
});
