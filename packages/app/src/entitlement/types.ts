/**
 * Feature gating seam (SSD §9.5, FR-P9). Screens and view models ask this interface whether a feature is
 * available and never talk to a store SDK. It lives in the app layer only: core, the astro engine and
 * the experiment harness do not import it, and a gate changes what a user sees, never what the engine
 * computes or an experiment records.
 */
export type FeatureId = string;

export interface IEntitlementService {
  hasFeatureAccess(feature: FeatureId): Promise<boolean>;
  getEntitlements(): Promise<readonly FeatureId[]>;
}

/**
 * Tier names, prices, store product ids and store wording. Empty until the legal review (D32) is done;
 * nothing in the specification or the code may carry them before then.
 */
export interface CommercialTierConfig {
  /** Feature ids that a paid tier would unlock. */
  features: readonly FeatureId[];
}

export const COMMERCIAL_TIER_CONFIG: CommercialTierConfig = { features: [] };
