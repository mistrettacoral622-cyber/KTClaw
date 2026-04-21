import type { ProxySettings } from './proxy';

/**
 * Legacy hook kept for callers in the Gateway startup flow.
 *
 * Telegram-specific proxy sync has been disabled alongside the hidden channel
 * families, so the app no longer mutates OpenClaw channel config here.
 */
export async function syncProxyConfigToOpenClaw(_settings: ProxySettings): Promise<void> {
  return;
}
