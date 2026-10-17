import { canonicalJson, sha256Hex } from '@trading/core';
import type { Chart } from './chart';
import { taraBala } from './tara';
import type { Tara } from './tara';
import { PLANETS } from './tables';
import type { PlanetKey } from './tables';

/** A longitude closer than this to a sign boundary makes the sign fragile; the flag travels with the feature. */
export const FRAGILE_DEGREES = 0.01;

export interface NatalFeatures {
  lagnaSign: number;
  moonSign: number;
  moonNakshatra: number;
  moonPada: number;
  /** Mahadasha lord running on the as-of date, null if the date is outside the nine periods. */
  dashaLord: PlanetKey | null;
  /** The Moon or the ascendant sits within FRAGILE_DEGREES of a sign boundary. */
  fragile: boolean;
}

export interface TransitFeatures {
  /** House of each transiting planet counted from the natal Moon sign (1 = same sign). */
  fromMoon: Record<PlanetKey, number>;
  /** House of each transiting planet counted from the natal ascendant sign. */
  fromLagna: Record<PlanetKey, number>;
}

export interface FeatureSet {
  natal: NatalFeatures;
  transit: TransitFeatures | null;
  /** Tara from the reference nakshatra (the trader's) to this chart's Moon star; null without a reference. */
  tara: Tara | null;
  /** SHA-256 of the canonical JSON of everything above: equal inputs give equal hashes. */
  featuresHash: string;
}

export interface FeatureInput {
  natal: Chart;
  /** The date (YYYY-MM-DD) the daśā is read on. */
  asOf: string;
  /** A chart of the moment being judged, for transit houses. */
  transit?: Chart;
  /** The trader's janma nakshatra (0-based) for Tara. */
  traderNakshatra?: number;
}

function dashaOn(natal: Chart, asOf: string): PlanetKey | null {
  const hit = natal.dasha.mahadashas.find((m) => m.startDate <= asOf && asOf < m.endDate);
  return hit?.lord ?? null;
}

function houses(transit: Chart, fromSign: number): Record<PlanetKey, number> {
  const out = {} as Record<PlanetKey, number>;
  for (const p of PLANETS) out[p] = ((transit.planets[p].sign - fromSign + 12) % 12) + 1;
  return out;
}

function natalFeatures(natal: Chart, asOf: string): NatalFeatures {
  const moon = natal.planets.moon;
  return {
    lagnaSign: natal.lagna.sign,
    moonSign: moon.sign,
    moonNakshatra: moon.nakshatra,
    moonPada: moon.pada,
    dashaLord: dashaOn(natal, asOf),
    fragile: Math.min(moon.signMargin, natal.lagna.signMargin) < FRAGILE_DEGREES,
  };
}

/** The deterministic, discrete feature set of FR-A3: signs, stars, daśā lord, Tara class, transit houses. */
export function extractFeatures(input: FeatureInput): FeatureSet {
  const { natal, asOf, transit, traderNakshatra } = input;
  const n = natalFeatures(natal, asOf);
  const body = {
    natal: n,
    transit: transit
      ? { fromMoon: houses(transit, n.moonSign), fromLagna: houses(transit, n.lagnaSign) }
      : null,
    tara: traderNakshatra === undefined ? null : taraBala(traderNakshatra, n.moonNakshatra),
  };
  return { ...body, featuresHash: sha256Hex(canonicalJson(body)) };
}
