import { COMMERCIAL_TIER_CONFIG } from './types';
import type { CommercialTierConfig, FeatureId, IEntitlementService } from './types';

/**
 * The only implementation in v1: every feature is available. A store-billing implementation arrives
 * with the commercial phase (P11) after legal review (D32); this stub is what keeps the gate honest
 * until then, because nothing is locked that nobody can unlock.
 */
export class GrantAllEntitlements implements IEntitlementService {
  constructor(private readonly config: CommercialTierConfig = COMMERCIAL_TIER_CONFIG) {}

  hasFeatureAccess(): Promise<boolean> {
    return Promise.resolve(true);
  }

  getEntitlements(): Promise<readonly FeatureId[]> {
    return Promise.resolve([...this.config.features]);
  }
}
