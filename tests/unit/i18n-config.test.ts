import { describe, expect, it } from 'vitest';
import i18n, { SUPPORTED_LANGUAGES } from '@/i18n';

describe('i18n exposed languages', () => {
  it('includes Japanese in the exposed language list', () => {
    const exposed = SUPPORTED_LANGUAGES.map((entry) => entry.code);
    expect(exposed).toContain('ja');
  });

  it('registers Japanese in i18next supportedLngs', () => {
    const supported = Array.isArray(i18n.options.supportedLngs) ? i18n.options.supportedLngs : [];
    expect(supported).toContain('ja');
  });
});
