import { describe, expect, it } from 'vitest';
import { calculateTransitNakshatras, calculateLahiriAyanamsa } from './ephemeris';

describe('ephemeris & transit nakshatra engine', () => {
  it('computes expected Lahiri ayanamsa for J2000 epoch (~23.85°)', () => {
    const jd2000 = 2451545.0;
    const ayanamsa = calculateLahiriAyanamsa(jd2000);
    expect(ayanamsa).toBeCloseTo(23.857, 2);
  });

  it('computes 9 planetary transit nakshatras in valid range [0, 26]', () => {
    const transits = calculateTransitNakshatras('2005-11-10');
    expect(transits.jupiter.nakshatraIndex).toBeGreaterThanOrEqual(0);
    expect(transits.jupiter.nakshatraIndex).toBeLessThanOrEqual(26);
    expect(transits.sun.nakshatraIndex).toBeGreaterThanOrEqual(0);
    expect(transits.sun.nakshatraIndex).toBeLessThanOrEqual(26);
    expect(transits.saturn.nakshatraIndex).toBeGreaterThanOrEqual(0);
    expect(transits.saturn.nakshatraIndex).toBeLessThanOrEqual(26);
    expect(transits.rahu.nakshatraIndex).toBeGreaterThanOrEqual(0);
    expect(transits.rahu.nakshatraIndex).toBeLessThanOrEqual(26);
    expect(transits.ketu.nakshatraIndex).toBeGreaterThanOrEqual(0);
    expect(transits.ketu.nakshatraIndex).toBeLessThanOrEqual(26);
  });

  it('verifies Rahu and Ketu are exactly opposite by 180 degrees (approx 13 or 14 nakshatras apart)', () => {
    const transits = calculateTransitNakshatras('2024-01-15');
    const diff = Math.abs(transits.rahu.nakshatraIndex - transits.ketu.nakshatraIndex);
    // 27 nakshatras: 180 degrees = 13.5 nakshatras, so difference is 13 or 14
    expect([13, 14]).toContain(diff);
  });
});
