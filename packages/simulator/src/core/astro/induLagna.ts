/**
 * packages/simulator/src/core/astro/induLagna.ts
 * Classical Indu Lagna (Wealth Vector / Kalas Ray) Engine.
 * Implements Uttara Kalamrita rules for 9th lord Kalas summation and Gochara transit activation.
 * Enforces strict modularity (< 200 LOC, functions < 60 LOC, complexity <= 10).
 */

import type { PlanetKey } from './types';
import { SIGN_LORDS } from './constants';

/**
 * Classical Kalas (Rays) assigned to the 7 visible grahas
 * according to Uttara Kalamrita (Kanda 1, Ch. IV).
 */
export const INDU_RAYS: Readonly<Record<PlanetKey, number>> = {
  sun: 30,
  moon: 16,
  mars: 6,
  mercury: 8,
  jupiter: 10,
  venus: 12,
  saturn: 1,
  rahu: 0,
  ketu: 0,
};

export interface InduLagnaEvaluation {
  induLagnaSignId: number;
  totalKalas: number;
  lagnaNinthLord: PlanetKey;
  moonNinthLord: PlanetKey;
  isInduActive: boolean;
  beneficPlanetsInKendraTrikona: PlanetKey[];
  status: 'ACTIVE' | 'NEUTRAL';
}

/**
 * Calculates the Indu Lagna sign index (0..11) from natal Lagna and Moon signs.
 * Formula:
 * 1. Identify 9th lord from Lagna and 9th lord from Moon.
 * 2. Sum their respective Kalas (rays).
 * 3. Remainder = sum % 12. If rem === 0, rem = 12.
 * 4. Count rem signs from Moon sign: (moonSignId + rem - 1) % 12.
 */
export function calculateInduLagnaSign(lagnaSignId: number, moonSignId: number): {
  induLagnaSignId: number;
  totalKalas: number;
  lagnaNinthLord: PlanetKey;
  moonNinthLord: PlanetKey;
} {
  const lagnaNinthSign = (lagnaSignId + 8) % 12;
  const lagnaNinthLord = SIGN_LORDS[lagnaNinthSign] ?? 'mars';

  const moonNinthSign = (moonSignId + 8) % 12;
  const moonNinthLord = SIGN_LORDS[moonNinthSign] ?? 'moon';

  const raysLagna = INDU_RAYS[lagnaNinthLord] ?? 0;
  const raysMoon = INDU_RAYS[moonNinthLord] ?? 0;
  const totalKalas = raysLagna + raysMoon;

  let rem = totalKalas % 12;
  if (rem === 0) rem = 12;

  const induLagnaSignId = (moonSignId + rem - 1) % 12;

  return {
    induLagnaSignId,
    totalKalas,
    lagnaNinthLord,
    moonNinthLord,
  };
}

/**
 * Evaluates transit benefic activation over the Indu Lagna.
 * Benefics (Jupiter, Venus, Mercury) transiting Kendra (1, 4, 7, 10)
 * or Trikona (1, 5, 9) from Indu Lagna activate the wealth vector.
 */
export function evaluateInduLagnaActivation(
  induLagnaSignId: number,
  transitSigns: Partial<Record<PlanetKey, number>>
): {
  isInduActive: boolean;
  beneficPlanetsInKendraTrikona: PlanetKey[];
  status: 'ACTIVE' | 'NEUTRAL';
} {
  const targetBenefics: PlanetKey[] = ['jupiter', 'venus', 'mercury'];
  const kendraTrikonaHouses = new Set([1, 4, 5, 7, 9, 10]);
  const activeBenefics: PlanetKey[] = [];

  for (const b of targetBenefics) {
    const pSign = transitSigns[b];
    if (pSign !== undefined) {
      const houseFromIndu = ((pSign - induLagnaSignId + 12) % 12) + 1;
      if (kendraTrikonaHouses.has(houseFromIndu)) {
        activeBenefics.push(b);
      }
    }
  }

  // Active if at least Jupiter or Venus (or 2+ benefics) in Kendra/Trikona
  const isInduActive = activeBenefics.includes('jupiter') || activeBenefics.includes('venus') || activeBenefics.length >= 2;

  return {
    isInduActive,
    beneficPlanetsInKendraTrikona: activeBenefics,
    status: isInduActive ? 'ACTIVE' : 'NEUTRAL',
  };
}

/**
 * Full composite Indu Lagna assessment for an equity chart.
 */
export function evaluateInduLagna(
  lagnaSignId: number,
  moonSignId: number,
  transitSigns: Partial<Record<PlanetKey, number>>
): InduLagnaEvaluation {
  const calc = calculateInduLagnaSign(lagnaSignId, moonSignId);
  const act = evaluateInduLagnaActivation(calc.induLagnaSignId, transitSigns);

  return {
    induLagnaSignId: calc.induLagnaSignId,
    totalKalas: calc.totalKalas,
    lagnaNinthLord: calc.lagnaNinthLord,
    moonNinthLord: calc.moonNinthLord,
    isInduActive: act.isInduActive,
    beneficPlanetsInKendraTrikona: act.beneficPlanetsInKendraTrikona,
    status: act.status,
  };
}
