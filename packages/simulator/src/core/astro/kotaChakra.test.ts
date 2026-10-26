/**
 * packages/app/src/core/astro/kotaChakra.test.ts
 * Unit tests verifying Kota Chakra zone mapping and siege defense calculations.
 */

import { describe, it, expect } from 'vitest';
import { getKotaZoneForNakshatra, evaluateKotaChakra } from './kotaChakra';
import type { PlanetKey } from './types';

describe('Kota Chakra Radar Engine', () => {
  it('maps Janma Nakshatra and cardinal pillars to Stambha', () => {
    expect(getKotaZoneForNakshatra(0)).toBe('stambha');
    expect(getKotaZoneForNakshatra(7)).toBe('stambha');
    expect(getKotaZoneForNakshatra(14)).toBe('stambha');
    expect(getKotaZoneForNakshatra(21)).toBe('stambha');
  });

  it('maps intermediate pathways to Madhya, Kantaka, and Bahya', () => {
    expect(getKotaZoneForNakshatra(1)).toBe('madhya');
    expect(getKotaZoneForNakshatra(2)).toBe('kantaka');
    expect(getKotaZoneForNakshatra(3)).toBe('bahya');
  });

  it('computes low defense score when malefics breach central citadel (siege)', () => {
    const transitPositions: Record<PlanetKey, { nakshatraIndex: number }> = {
      sun: { nakshatraIndex: 0 }, // Stambha
      mars: { nakshatraIndex: 0 }, // Stambha
      saturn: { nakshatraIndex: 1 }, // Madhya
      rahu: { nakshatraIndex: 7 }, // Stambha
      ketu: { nakshatraIndex: 14 }, // Stambha
      jupiter: { nakshatraIndex: 3 }, // Bahya
      venus: { nakshatraIndex: 4 }, // Bahya
      mercury: { nakshatraIndex: 10 }, // Bahya
      moon: { nakshatraIndex: 11 }, // Bahya
    };

    const result = evaluateKotaChakra(0, 0, transitPositions);
    expect(result.stambha).toContain('mars');
    expect(result.stambha).toContain('rahu');
    expect(result.defenseScore).toBeLessThan(0.3); // Severe siege
  });

  it('computes high defense score when benefics protect citadel and Swami is fortified', () => {
    const transitPositions: Record<PlanetKey, { nakshatraIndex: number }> = {
      jupiter: { nakshatraIndex: 0 }, // Stambha
      venus: { nakshatraIndex: 1 }, // Madhya
      mercury: { nakshatraIndex: 7 }, // Stambha
      moon: { nakshatraIndex: 0 }, // Stambha (Swami for Cancer/Taurus)
      sun: { nakshatraIndex: 3 }, // Bahya
      mars: { nakshatraIndex: 4 }, // Bahya
      saturn: { nakshatraIndex: 10 }, // Bahya
      rahu: { nakshatraIndex: 11 }, // Bahya
      ketu: { nakshatraIndex: 17 }, // Bahya
    };

    const result = evaluateKotaChakra(0, 3, transitPositions);
    expect(result.stambha).toContain('jupiter');
    expect(result.defenseScore).toBeGreaterThan(0.7); // Fortified
  });
});
