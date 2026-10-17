import { describe, expect, it } from 'vitest';
import { GrantAllEntitlements } from './grantAll';
import { COMMERCIAL_TIER_CONFIG } from './types';

describe('entitlement stub (WP-3.10)', () => {
  it('grants every feature, whatever its id', async () => {
    const e = new GrantAllEntitlements();
    expect(await e.hasFeatureAccess()).toBe(true);
    expect(await e.getEntitlements()).toEqual([]);
  });

  it('lists the features of a supplied configuration and still grants all', async () => {
    const e = new GrantAllEntitlements({ features: ['a', 'b'] });
    expect(await e.getEntitlements()).toEqual(['a', 'b']);
    expect(await e.hasFeatureAccess()).toBe(true);
  });

  it('carries no tiers, prices or store product ids until the legal review (D32)', () => {
    expect(COMMERCIAL_TIER_CONFIG).toEqual({ features: [] });
  });
});
