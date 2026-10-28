/**
 * packages/simulator/src/core/astro/jathakaCache.test.ts
 * Unit tests verifying on-demand Jathakam computation and cache hit behavior.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getOrComputeJathakam, clearJathakamCache } from './jathakaCache';
import type { CorporateRegistryRecord } from '../data/types';

const sampleRecord: CorporateRegistryRecord = {
  symbol: 'TCS',
  company_name: 'Tata Consultancy Services Limited',
  listing_date: '2004-08-25',
  listing_time: '10:00:00',
  timezone_offset_minutes: 330,
  latitude: 19.0596,
  longitude: 72.8656,
  year_length_days: 365.2425,
  primary_consonant: 'Ta',
  ayanamsa: 23.92,
  lagna_sign_id: 6, // Libra
  lagna_sign: 'Libra',
  lagna_deg: 28.8,
  moon_sign_id: 9, // Sagittarius
  moon_sign: 'Sagittarius',
  moon_deg: 1.7,
  moon_nakshatra: 'Mula',
  pada: 1,
  birth_md_lord: 'ketu',
  starting_balance_years: 6.1,
};

describe('Jathakam On-Demand Cache Engine', () => {
  beforeEach(() => {
    clearJathakamCache();
  });

  it('computes full Jathakam record on first access', () => {
    const jathakam = getOrComputeJathakam(sampleRecord);
    expect(jathakam.symbol).toBe('TCS');
    expect(jathakam.lagnaSignId).toBe(6);
    expect(jathakam.lagnaLord).toBe('venus');
    expect(jathakam.mahadashas.length).toBeGreaterThanOrEqual(9);
    expect(jathakam.induLagnaSignId).toBeGreaterThanOrEqual(0);
    expect(jathakam.induLagnaSignId).toBeLessThanOrEqual(11);
    expect(Object.keys(jathakam.lordships).length).toBe(9);
  });

  it('returns cached record on second access without recomputing', () => {
    const first = getOrComputeJathakam(sampleRecord);
    const second = getOrComputeJathakam(sampleRecord);
    expect(first).toBe(second); // Exact memory reference hit
    expect(second.computedAtMs).toBe(first.computedAtMs);
  });
});
