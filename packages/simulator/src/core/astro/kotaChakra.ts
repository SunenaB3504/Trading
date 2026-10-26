/**
 * packages/app/src/core/astro/kotaChakra.ts
 * Classical 4-Zone Kota Chakra (Fort Citadel) Radar Engine.
 * Evaluates transit planetary siege vs fortification.
 * Enforces strict modularity (< 350 LOC, functions < 60 LOC, complexity <= 10).
 */

import type { PlanetKey, KotaChakraState } from './types';
import { NATURAL_BENEFICS, NATURAL_MALEFICS, SIGN_LORDS } from './constants';

export type KotaZone = 'stambha' | 'madhya' | 'kantaka' | 'bahya';

/**
 * Maps a Nakshatra index (0..27, where 0=Ashwini, 21=Uttara Ashadha, Abhijit=27)
 * relative to the Janma Nakshatra into one of the 4 concentric Kota zones.
 */
export function getKotaZoneForNakshatra(nakshatraOffset: number): KotaZone {
  const norm = ((nakshatraOffset % 28) + 28) % 28;
  // Classical concentric distribution from entry pathway:
  // Offset 0 (Janma) is inside the core citadel (Stambha)
  if (norm === 0 || norm === 7 || norm === 14 || norm === 21) {
    return 'stambha'; // 4 Central pillars
  }
  if (norm === 1 || norm === 6 || norm === 15 || norm === 20) {
    return 'madhya'; // 4 Inner courtyard stations
  }
  if ([2, 5, 8, 13, 16, 19, 22, 27].includes(norm)) {
    return 'kantaka'; // 8 Fort wall bastion stations
  }
  return 'bahya'; // 12 Outer perimeter / moat stations
}

export function determineKotaRulers(moonSignIndex: number): { kotaSwami: PlanetKey; kotaPala: PlanetKey } {
  const kotaSwami = SIGN_LORDS[moonSignIndex % 12] ?? 'moon';
  // Kota Pala is classically the lord of the 10th rashi or protective guardian
  const palaSignIdx = (moonSignIndex + 9) % 12;
  const kotaPala = SIGN_LORDS[palaSignIdx] ?? 'mars';
  return { kotaSwami, kotaPala };
}

function classifyPlanetsInZones(
  transitPositions: Record<PlanetKey, { nakshatraIndex: number }>,
  janmaNakshatraIdx: number
): Record<KotaZone, PlanetKey[]> {
  const zones: Record<KotaZone, PlanetKey[]> = {
    stambha: [],
    madhya: [],
    kantaka: [],
    bahya: [],
  };

  for (const [planet, pos] of Object.entries(transitPositions)) {
    const offset = pos.nakshatraIndex - janmaNakshatraIdx;
    const zone = getKotaZoneForNakshatra(offset);
    zones[zone].push(planet as PlanetKey);
  }

  return zones;
}

function calculateDefenseScore(
  zones: Record<KotaZone, PlanetKey[]>,
  swamiZone: KotaZone,
  palaZone: KotaZone
): number {
  let innerBenefics = 0;
  let innerMalefics = 0;

  for (const p of [...zones.stambha, ...zones.madhya]) {
    if (NATURAL_BENEFICS.includes(p)) innerBenefics += 1;
    if (NATURAL_MALEFICS.includes(p)) innerMalefics += 1;
  }

  // Base score from inner sanctuary harmony
  let score = 0.5 + innerBenefics * 0.15 - innerMalefics * 0.2;

  // Swami in central citadel gives sovereign strength
  if (swamiZone === 'stambha') score += 0.15;
  else if (swamiZone === 'bahya') score -= 0.1;

  // Pala guarding perimeter or walls strengthens fort
  if (palaZone === 'kantaka' || palaZone === 'bahya') score += 0.1;
  else if (palaZone === 'stambha') score -= 0.05;

  return Math.max(0.0, Math.min(1.0, score));
}

export function evaluateKotaChakra(
  janmaNakshatraIdx: number,
  moonSignIdx: number,
  transitPositions: Record<PlanetKey, { nakshatraIndex: number }>
): KotaChakraState {
  const { kotaSwami, kotaPala } = determineKotaRulers(moonSignIdx);
  const zones = classifyPlanetsInZones(transitPositions, janmaNakshatraIdx);

  const swamiPos = transitPositions[kotaSwami];
  const swamiZone = swamiPos ? getKotaZoneForNakshatra(swamiPos.nakshatraIndex - janmaNakshatraIdx) : 'bahya';

  const palaPos = transitPositions[kotaPala];
  const palaZone = palaPos ? getKotaZoneForNakshatra(palaPos.nakshatraIndex - janmaNakshatraIdx) : 'bahya';

  const defenseScore = calculateDefenseScore(zones, swamiZone, palaZone);

  return {
    stambha: zones.stambha,
    madhya: zones.madhya,
    kantaka: zones.kantaka,
    bahya: zones.bahya,
    kotaSwami,
    kotaPala,
    swamiZone,
    palaZone,
    defenseScore,
  };
}
