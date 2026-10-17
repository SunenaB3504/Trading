import type { FeatureId, IEntitlementService } from '../entitlement/types';
import type { KeyValueStore } from '../store/kv';

/**
 * The only door to anything astro-derived on the device (FR-P10). Every caller goes through here, so the
 * "gate off" behaviour is decided in one place: nothing is loaded, executed or stored. The gate is soft
 * (D34): the engine ships in the same app, so a modified client can bypass it. It controls what the user
 * sees and what runs on their device, never what the research pipeline computes.
 */
export type Loader<T> = () => Promise<T>;

/** Runs `load` only when the feature is granted; returns null, without calling it, when it is not. */
export async function loadAstroLayer<T>(
  entitlements: IEntitlementService,
  feature: FeatureId,
  load: Loader<T>,
): Promise<T | null> {
  if (!(await entitlements.hasFeatureAccess(feature))) return null;
  return load();
}

export const BIRTH_KEY = 'profile/birth';

/** What the owner types on the birth-details screen (FR-P4). Stored only on the device, and only when granted. */
export interface BirthProfile {
  name: string;
  date: string;
  time: string;
  place: string;
}

export type SaveResult = { saved: true } | { saved: false; reason: 'locked' };

/** Saves birth details, or does nothing at all when the feature is not granted. */
export async function saveBirthProfile(
  kv: KeyValueStore,
  entitlements: IEntitlementService,
  feature: FeatureId,
  profile: BirthProfile,
): Promise<SaveResult> {
  if (!(await entitlements.hasFeatureAccess(feature))) return { saved: false, reason: 'locked' };
  await kv.set(BIRTH_KEY, JSON.stringify(profile));
  return { saved: true };
}
