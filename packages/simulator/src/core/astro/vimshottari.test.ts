/**
 * packages/app/src/core/astro/vimshottari.test.ts
 * Unit tests verifying 5-fold Vimshottari Dasha calculations.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateNakshatraAndBalance,
  generateMahadashas,
  resolveActive5FoldDasha,
  resolveActiveSubLord,
} from './vimshottari';
import { DAYS_PER_TROPICAL_YEAR } from './constants';

describe('Vimshottari Dasha Engine', () => {
  it('identifies Ashwini 0° Moon as starting with full Ketu 7-year MD', () => {
    const res = calculateNakshatraAndBalance(0.0);
    expect(res.nakshatraIndex).toBe(0);
    expect(res.startingLord).toBe('ketu');
    expect(res.fractionRemaining).toBeCloseTo(1.0, 5);
    expect(res.balanceYears).toBeCloseTo(7.0, 4);
  });

  it('calculates partial balance correctly for Moon midpoint in Bharani', () => {
    // Bharani is nakshatra 1: [13.333333°, 26.666667°]
    // Midpoint: 20.0°
    const res = calculateNakshatraAndBalance(20.0);
    expect(res.nakshatraIndex).toBe(1);
    expect(res.startingLord).toBe('venus');
    // Full years for Venus is 20
    expect(res.fractionRemaining).toBeCloseTo(0.5, 4);
    expect(res.balanceYears).toBeCloseTo(10.0, 3);
  });

  it('generates 9 sequential Mahadashas spanning 120 total years', () => {
    const birthDateStr = '2000-01-01T00:00:00.000Z';
    const birthMs = new Date(birthDateStr).getTime();
    // Moon at 0° (Ketu start)
    const dashas = generateMahadashas(birthMs, 0.0);

    expect(dashas.length).toBe(9);
    expect(dashas[0]?.lord).toBe('ketu');
    expect(dashas[1]?.lord).toBe('venus');
    expect(dashas[2]?.lord).toBe('sun');
    expect(dashas[3]?.lord).toBe('moon');
    expect(dashas[4]?.lord).toBe('mars');
    expect(dashas[5]?.lord).toBe('rahu');
    expect(dashas[6]?.lord).toBe('jupiter');
    expect(dashas[7]?.lord).toBe('saturn');
    expect(dashas[8]?.lord).toBe('mercury');

    const totalDays = (dashas[8]!.endTimeMs - dashas[0]!.startTimeMs) / 86400000;
    const totalYears = totalDays / DAYS_PER_TROPICAL_YEAR;
    expect(totalYears).toBeCloseTo(120.0, 2);
  });

  it('resolves Antardasha accurately inside Mahadasha', () => {
    const startMs = 1000000000000;
    const endMs = startMs + 120 * 86400000; // 120 day interval for easy math
    // First sub-period of Ketu is Ketu (7/120 = 7 days)
    const sub1 = resolveActiveSubLord(startMs, endMs, 'ketu', startMs + 2 * 86400000);
    expect(sub1.lord).toBe('ketu');

    // Second sub-period of Ketu is Venus (20/120 = 20 days, spanning days 7 to 27)
    const sub2 = resolveActiveSubLord(startMs, endMs, 'ketu', startMs + 10 * 86400000);
    expect(sub2.lord).toBe('venus');
  });

  it('resolves full 5-fold hierarchy (MD -> AD -> PD -> SD -> Prana)', () => {
    const birthMs = new Date('2000-01-01T00:00:00.000Z').getTime();
    const dashas = generateMahadashas(birthMs, 0.0);

    // Query 1 year after birth (in Ketu MD)
    const targetMs = birthMs + 365.2425 * 86400000;
    const state = resolveActive5FoldDasha(dashas, targetMs);

    expect(state).not.toBeNull();
    expect(state?.mahadasha).toBe('ketu');
    expect(state?.antardasha).toBeDefined();
    expect(state?.pratyantardasha).toBeDefined();
    expect(state?.sookshmadasha).toBeDefined();
    expect(state?.pranadasha).toBeDefined();
    expect(state!.mdRemainingDays).toBeGreaterThan(0);
  });
});
