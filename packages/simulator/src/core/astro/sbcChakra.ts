/**
 * packages/app/src/core/astro/sbcChakra.ts
 * Sarvatobhadra Chakra (SBC) 81-Square Cross-Aspect & Vedha Grid Engine.
 * Evaluates transit Vedha hits on Janma, Nama, Karma, and Vinasha Nakshatras.
 * Enforces strict modularity (< 350 LOC, functions < 60 LOC, complexity <= 10).
 */

import type { PlanetKey, SBCState, SBCVedhaHit } from './types';
import { NATURAL_BENEFICS } from './constants';

export interface SBCTargets {
  janmaNakshatraIdx: number;
  namaNakshatraIdx: number;
  karmaNakshatraIdx: number;
  adhanaNakshatraIdx: number;
  vinashaNakshatraIdx: number;
}

export function computeSBCTargets(janmaNakshatraIdx: number, namaNakshatraIdx: number): SBCTargets {
  return {
    janmaNakshatraIdx,
    namaNakshatraIdx,
    karmaNakshatraIdx: (janmaNakshatraIdx + 9) % 28, // 10th Nakshatra
    adhanaNakshatraIdx: (janmaNakshatraIdx + 15) % 28, // 16th Nakshatra
    vinashaNakshatraIdx: (janmaNakshatraIdx + 22) % 28, // 23rd Nakshatra
  };
}

export function calculateVedhaCrossings(fromNakshatraIdx: number): {
  front: number;
  left: number;
  right: number;
} {
  // Classical 28-nakshatra 81-cell perimeter ray angles:
  // Front (Sammukha) is opposing side of grid (14 stations across)
  const front = (fromNakshatraIdx + 14) % 28;
  // Left (Vama) is 7 stations to the left (90-degree track)
  const left = (fromNakshatraIdx + 7) % 28;
  // Right (Dakshina) is 21 stations (or 7 stations to the right)
  const right = (fromNakshatraIdx + 21) % 28;

  return { front, left, right };
}

function matchTarget(
  nakshatraIdx: number,
  targets: SBCTargets
): 'janma_nakshatra' | 'nama_nakshatra' | 'karma_nakshatra' | 'adhana_nakshatra' | null {
  if (nakshatraIdx === targets.janmaNakshatraIdx) return 'janma_nakshatra';
  if (nakshatraIdx === targets.namaNakshatraIdx) return 'nama_nakshatra';
  if (nakshatraIdx === targets.karmaNakshatraIdx) return 'karma_nakshatra';
  if (nakshatraIdx === targets.adhanaNakshatraIdx) return 'adhana_nakshatra';
  return null;
}

function collectVedhaHitsForPlanet(
  planet: PlanetKey,
  posNakshatra: number,
  targets: SBCTargets
): SBCVedhaHit[] {
  const isBenefic = NATURAL_BENEFICS.includes(planet);
  const rays = calculateVedhaCrossings(posNakshatra);
  const hits: SBCVedhaHit[] = [];

  const checkRay = (targetIdx: number, vedhaType: 'front' | 'left' | 'right') => {
    const matched = matchTarget(targetIdx, targets);
    if (matched) {
      hits.push({
        transitingPlanet: planet,
        targetType: matched,
        vedhaType,
        isBenefic,
      });
    }
  };

  checkRay(rays.front, 'front');
  checkRay(rays.left, 'left');
  checkRay(rays.right, 'right');

  return hits;
}

export function evaluateSBCChakra(
  targets: SBCTargets,
  transitPositions: Record<PlanetKey, { nakshatraIndex: number }>
): SBCState {
  const hits: SBCVedhaHit[] = [];

  for (const [planet, pos] of Object.entries(transitPositions)) {
    const planetHits = collectVedhaHitsForPlanet(planet as PlanetKey, pos.nakshatraIndex, targets);
    hits.push(...planetHits);
  }

  let maleficWeight = 0;
  let beneficWeight = 0;

  for (const hit of hits) {
    const multiplier = hit.targetType === 'janma_nakshatra' || hit.targetType === 'nama_nakshatra' ? 1.5 : 1.0;
    if (hit.isBenefic) {
      beneficWeight += 0.15 * multiplier;
    } else {
      maleficWeight += 0.25 * multiplier;
    }
  }

  const netAffliction = Math.max(0.0, Math.min(1.0, maleficWeight - beneficWeight));

  return {
    hits,
    sbcAfflictionScore: netAffliction,
  };
}
