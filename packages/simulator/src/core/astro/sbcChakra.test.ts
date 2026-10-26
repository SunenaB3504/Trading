/**
 * packages/app/src/core/astro/sbcChakra.test.ts
 * Unit tests verifying Sarvatobhadra Chakra (SBC) Vedha ray calculations and affliction scoring.
 */

import { describe, it, expect } from 'vitest';
import {
  computeSBCTargets,
  calculateVedhaCrossings,
  evaluateSBCChakra,
} from './sbcChakra';
import type { PlanetKey } from './types';

describe('Sarvatobhadra Chakra (SBC) Engine', () => {
  it('computes special corporate sensitive points (Janma, Karma, Adhana, Vinasha)', () => {
    const targets = computeSBCTargets(0, 5); // Janma = 0 (Ashwini), Nama = 5 (Mrigashira)
    expect(targets.janmaNakshatraIdx).toBe(0);
    expect(targets.namaNakshatraIdx).toBe(5);
    expect(targets.karmaNakshatraIdx).toBe(9); // 10th from 0 is index 9 (Magha)
    expect(targets.adhanaNakshatraIdx).toBe(15); // 16th from 0 is index 15 (Swati)
    expect(targets.vinashaNakshatraIdx).toBe(22); // 23rd from 0 is index 22 (Shravana)
  });

  it('calculates front (sammukha), left (vama), and right (dakshina) Vedha rays', () => {
    const rays = calculateVedhaCrossings(0);
    expect(rays.front).toBe(14); // Opposite
    expect(rays.left).toBe(7); // 90° Left
    expect(rays.right).toBe(21); // 90° Right
  });

  it('detects malefic Vedha hit on Janma Nakshatra and raises affliction score', () => {
    const targets = computeSBCTargets(14, 5); // Janma at index 14
    // Saturn at index 0 casts front Vedha on index 14!
    const transitPositions: Record<PlanetKey, { nakshatraIndex: number }> = {
      saturn: { nakshatraIndex: 0 },
      sun: { nakshatraIndex: 2 },
      mars: { nakshatraIndex: 3 },
      rahu: { nakshatraIndex: 4 },
      ketu: { nakshatraIndex: 6 },
      jupiter: { nakshatraIndex: 8 },
      venus: { nakshatraIndex: 9 },
      mercury: { nakshatraIndex: 10 },
      moon: { nakshatraIndex: 11 },
    };

    const sbc = evaluateSBCChakra(targets, transitPositions);
    const saturnHit = sbc.hits.find((h) => h.transitingPlanet === 'saturn');

    expect(saturnHit).toBeDefined();
    expect(saturnHit?.targetType).toBe('janma_nakshatra');
    expect(saturnHit?.vedhaType).toBe('front');
    expect(sbc.sbcAfflictionScore).toBeGreaterThan(0.2);
  });

  it('mitigates affliction when benefic (Jupiter) casts protective Vedha', () => {
    const targets = computeSBCTargets(14, 5);
    // Both Saturn and Jupiter cast Vedha on index 14
    const transitPositions: Record<PlanetKey, { nakshatraIndex: number }> = {
      saturn: { nakshatraIndex: 0 }, // Front Vedha on 14
      jupiter: { nakshatraIndex: 7 }, // Left Vedha on 14
      sun: { nakshatraIndex: 2 },
      mars: { nakshatraIndex: 3 },
      rahu: { nakshatraIndex: 4 },
      ketu: { nakshatraIndex: 6 },
      venus: { nakshatraIndex: 9 },
      mercury: { nakshatraIndex: 10 },
      moon: { nakshatraIndex: 11 },
    };

    const sbc = evaluateSBCChakra(targets, transitPositions);
    expect(sbc.hits.some((h) => h.transitingPlanet === 'jupiter')).toBe(true);
    // Net affliction score should be lower than saturn alone
    expect(sbc.sbcAfflictionScore).toBeLessThan(0.3);
  });
});
