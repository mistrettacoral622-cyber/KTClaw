export type GatewayRefreshAction = 'none' | 'secrets_reload' | 'reload' | 'restart';

export type GatewayRefreshIntent =
  | { kind: 'provider'; event: 'saved' | 'updated' | 'default_changed' | 'deleted' | 'auth_changed' }
  | { kind: 'channel'; event: 'config_saved' | 'binding_changed' | 'default_account_changed' | 'enabled_changed'; channelType?: string }
  | { kind: 'agent'; event: 'created' | 'updated' | 'channel_assignment_changed' | 'deleted' }
  | { kind: 'settings'; event: 'gateway_port_changed' | 'proxy_changed' };

export function classifyGatewayRefresh(intent: GatewayRefreshIntent): GatewayRefreshAction {
  if (intent.kind === 'provider') {
    switch (intent.event) {
      case 'auth_changed':
        return 'secrets_reload';
      case 'deleted':
        return 'restart';
      case 'saved':
      case 'updated':
      case 'default_changed':
        return 'none';
    }
  }

  if (intent.kind === 'channel') {
    switch (intent.event) {
      case 'enabled_changed':
        return 'restart';
      case 'config_saved':
      case 'binding_changed':
      case 'default_account_changed':
        return 'none';
    }
  }

  if (intent.kind === 'agent') {
    switch (intent.event) {
      case 'deleted':
        return 'restart';
      case 'created':
      case 'updated':
      case 'channel_assignment_changed':
        return 'none';
    }
  }

  if (intent.kind === 'settings') {
    switch (intent.event) {
      case 'gateway_port_changed':
      case 'proxy_changed':
        return 'restart';
    }
  }

  return 'restart';
}
