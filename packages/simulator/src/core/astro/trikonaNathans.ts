/**
 * packages/simulator/src/core/astro/trikonaNathans.ts
 * Resolves Dual Lordship (Dvi-Rashi Adhipatya) and derives [T] and [D] sets.
 * Implements Parashara's Moolatrikona weighting and Lagnesha immunity laws (BPHS Ch. 34).
 * Enforces strict modularity (< 200 LOC, functions < 60 LOC, complexity <= 10).
 */

import { SIGN_LORDS, SIGN_NAMES } from './constants';
import type { PlanetKey } from './types';

export interface LagnaLordshipResult {
  lagnaSignId: number;
  lagnaSignName: string;
  lagnaLord: PlanetKey;
  h5SignName: string;
  h5Lord: PlanetKey;
  h9SignName: string;
  h9Lord: PlanetKey;
  trikonaLords: readonly PlanetKey[];
  dusthanaLords: readonly PlanetKey[];
}

const MOOLATRIKONA_SIGNS: Readonly<Record<PlanetKey, number>> = {
  sun: 4, // Leo
  moon: 1, // Taurus
  mars: 0, // Aries
  mercury: 5, // Virgo
  jupiter: 8, // Sagittarius
  venus: 6, // Libra
  saturn: 10, // Aquarius
  rahu: 10,
  ketu: 4,
};

const SECOND_SIGNS: Readonly<Partial<Record<PlanetKey, number>>> = {
  moon: 3, // Cancer
  mars: 7, // Scorpio
  mercury: 2, // Gemini
  jupiter: 11, // Pisces
  venus: 1, // Taurus
  saturn: 9, // Capricorn
};

const BASE_HOUSE_WEIGHTS: Readonly<Record<number, number>> = {
  1: 1.0, 5: 1.0, 9: 1.0,
  4: 0.5, 7: 0.5, 10: 0.5,
  3: -0.8, 6: -0.8, 11: -0.8,
  8: -0.8, 12: -0.6,
  2: 0.0,
};

function getHouseWeight(house: number, isLagnesha: boolean): number {
  if (house === 8 && isLagnesha) return 0.8;
  return BASE_HOUSE_WEIGHTS[house] ?? 0.0;
}

function calculateLordScore(planet: PlanetKey, lagnaSignId: number): number {
  if (planet === 'rahu' || planet === 'ketu') return -1.0;
  const moolSign = MOOLATRIKONA_SIGNS[planet];
  const moolHouse = (((moolSign - lagnaSignId + 12) % 12) + 1);
  const secSign = SECOND_SIGNS[planet];
  const isLagnesha = moolHouse === 1 || (secSign !== undefined && (((secSign - lagnaSignId + 12) % 12) + 1) === 1);

  const moolWeight = getHouseWeight(moolHouse, isLagnesha);
  if (secSign === undefined) return moolWeight;

  const secHouse = (((secSign - lagnaSignId + 12) % 12) + 1);
  const secWeight = getHouseWeight(secHouse, isLagnesha);
  return 0.70 * moolWeight + 0.30 * secWeight;
}

export function classifyLordRole(lord: PlanetKey, lagnaSignId: number): 'trikona' | 'kendra' | 'dusthana' {
  const normLagna = ((lagnaSignId % 12) + 12) % 12;
  const score = calculateLordScore(lord, normLagna);
  if (score >= 0.25) return 'trikona';
  if (score <= -0.20) return 'dusthana';
  return 'kendra';
}

export function deriveLagnaLordships(lagnaSignId: number): LagnaLordshipResult {
  const normLagna = ((lagnaSignId % 12) + 12) % 12;
  const h5Id = (normLagna + 4) % 12;
  const h9Id = (normLagna + 8) % 12;

  const lagnaLord = SIGN_LORDS[normLagna] ?? 'mars';
  const h5Lord = SIGN_LORDS[h5Id] ?? 'sun';
  const h9Lord = SIGN_LORDS[h9Id] ?? 'jupiter';

  const trikonaSet = Array.from(new Set([lagnaLord, h5Lord, h9Lord]));
  const candidateDusthana: PlanetKey[] = ['jupiter', 'mars', 'sun', 'saturn', 'mercury', 'venus', 'rahu', 'ketu'];
  const dusthanaSet = candidateDusthana.filter(
    (p) => !trikonaSet.includes(p) && (p === 'rahu' || p === 'ketu' || calculateLordScore(p, normLagna) < 0.2)
  );

  return {
    lagnaSignId: normLagna,
    lagnaSignName: SIGN_NAMES[normLagna] ?? 'Aries',
    lagnaLord,
    h5SignName: SIGN_NAMES[h5Id] ?? 'Leo',
    h5Lord,
    h9SignName: SIGN_NAMES[h9Id] ?? 'Sagittarius',
    h9Lord,
    trikonaLords: trikonaSet,
    dusthanaLords: dusthanaSet,
  };
}

// Backward-compatible alias for existing imports
export const deriveTrikonaNathans = deriveLagnaLordships;
