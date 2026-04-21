import { describe, expect, it } from 'vitest';

import { getBundleRootPackages } from '../../scripts/bundle-openclaw-lib.mjs';

describe('bundle openclaw script', () => {
  it('includes explicit runtime packages that KTClaw resolves from the OpenClaw context', () => {
    expect(getBundleRootPackages()).toEqual(['openclaw']);
  });
});
