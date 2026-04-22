import { describe, expect, it } from 'vitest';
import {
  classifyGatewayRefresh,
  type GatewayRefreshAction,
} from '@electron/gateway/refresh-classifier';

function expectAction(
  actual: GatewayRefreshAction,
  expected: GatewayRefreshAction,
): void {
  expect(actual).toBe(expected);
}

describe('gateway refresh classifier', () => {
  it('classifies provider auth changes as secrets reload', () => {
    expectAction(
      classifyGatewayRefresh({ kind: 'provider', event: 'auth_changed' }),
      'secrets_reload',
    );
  });

  it('classifies provider config saves as no forced refresh', () => {
    expectAction(
      classifyGatewayRefresh({ kind: 'provider', event: 'saved' }),
      'none',
    );
  });

  it('classifies provider default changes as no forced refresh', () => {
    expectAction(
      classifyGatewayRefresh({ kind: 'provider', event: 'default_changed' }),
      'none',
    );
  });

  it('classifies hot-safe channel config changes as no forced refresh', () => {
    expectAction(
      classifyGatewayRefresh({ kind: 'channel', event: 'config_saved', channelType: 'feishu' }),
      'none',
    );
  });

  it('classifies gateway port changes as restart-required', () => {
    expectAction(
      classifyGatewayRefresh({ kind: 'settings', event: 'gateway_port_changed' }),
      'restart',
    );
  });

  it('classifies provider deletion as restart-required', () => {
    expectAction(
      classifyGatewayRefresh({ kind: 'provider', event: 'deleted' }),
      'restart',
    );
  });
});
