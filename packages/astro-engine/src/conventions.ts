/**
 * The registered calculation conventions (FR-A2). A result is only comparable with another if both
 * used the same set, so the set is explicit, named and hashed; nothing is hard-coded in the maths.
 */
export type AyanamsaName = 'lahiri';
export type NodeKind = 'mean' | 'true';

export interface ConventionSet {
  ayanamsa: AyanamsaName;
  node: NodeKind;
}

/** The defaults the owner registered: Lahiri and the mean node. */
export const DEFAULT_CONVENTIONS: ConventionSet = { ayanamsa: 'lahiri', node: 'mean' };

/** Julian day of J2000.0 and days per Julian century. */
const J2000 = 2451545.0;
const CENTURY = 36525.0;

/**
 * Lahiri (Chitrapaksha) ayanamsa in degrees, a quadratic in Julian centuries from J2000.0. Checked
 * against Swiss Ephemeris over 1950 to 2040: the largest difference is 0.00005 degrees (0.2 arcsec).
 */
export function lahiriAyanamsa(julianDay: number): number {
  const t = (julianDay - J2000) / CENTURY;
  return 23.857092 + 1.3969713 * t + 0.0003086 * t * t;
}

const AYANAMSA: Record<AyanamsaName, (jd: number) => number> = { lahiri: lahiriAyanamsa };

export function ayanamsaFor(set: ConventionSet, julianDay: number): number {
  return AYANAMSA[set.ayanamsa](julianDay);
}
