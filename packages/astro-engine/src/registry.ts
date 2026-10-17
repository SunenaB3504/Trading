import { canonicalJson, sha256Hex } from '@trading/core';
import { DEFAULT_CONVENTIONS } from './conventions';
import type { ConventionSet } from './conventions';

/**
 * The frozen convention set (FR-A2): the calculation choices plus the rules that decide which moment
 * and which name feed a feature. Every field is part of the hash, so changing any one of them gives a
 * different set, and results made under different sets are never mixed. Rules the owner has not yet
 * registered read `unregistered`, and a feature that needs one must refuse to run.
 */
export interface Rules {
  nakshatraCount: 27 | 28;
  /** Length of a dasha year. */
  dashaYear: 'julian-365.25';
  /** Which name feeds a name-based feature (D10). */
  nameMapping: 'legal-name-in-force' | 'unregistered';
  /** How a timestamp is turned into the chart moment. */
  timestamp: 'utc-minute';
  kotaAnchor: 'unregistered';
  prashnaMoment: 'unregistered';
}

export interface FrozenConventions {
  version: number;
  calc: ConventionSet;
  rules: Rules;
  /** SHA-256 of the canonical JSON of version, calc and rules. */
  hash: string;
}

export const DEFAULT_RULES: Rules = {
  nakshatraCount: 27,
  dashaYear: 'julian-365.25',
  nameMapping: 'legal-name-in-force',
  timestamp: 'utc-minute',
  kotaAnchor: 'unregistered',
  prashnaMoment: 'unregistered',
};

export function freezeConventions(
  version: number,
  calc: ConventionSet = DEFAULT_CONVENTIONS,
  rules: Rules = DEFAULT_RULES,
): FrozenConventions {
  const hash = sha256Hex(canonicalJson({ version, calc, rules }));
  return Object.freeze({ version, calc: { ...calc }, rules: { ...rules }, hash });
}

/** True when the stored hash still matches the content, i.e. nobody edited the set after freezing. */
export function isIntact(set: FrozenConventions): boolean {
  return freezeConventions(set.version, set.calc, set.rules).hash === set.hash;
}

/** The rules a named feature needs; throws if one is still `unregistered`. */
export function requireRules(set: FrozenConventions, needed: Array<keyof Rules>): void {
  const missing = needed.filter((k) => set.rules[k] === 'unregistered');
  if (missing.length > 0) throw new Error(`Convention not registered: ${missing.join(', ')}`);
}
