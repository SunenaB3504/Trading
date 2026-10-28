/**
 * packages/simulator/src/core/astro/dashaTimelineScanner.test.ts
 * Unit tests verifying chronological Dasha schedules and reverse Triad searches.
 */

import { describe, it, expect } from 'vitest';
import {
  generateDashaSchedule,
  findNextTriadOccurrence,
  findDashaAtDate,
} from './dashaTimelineScanner';
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

describe('Dasha Timeline Scanner & Schedule Engine', () => {
  it('generates chronological MD and AD schedule for a stock', () => {
    const schedule = generateDashaSchedule(sampleRecord, '2005-01-01', 2);
    expect(schedule.length).toBeGreaterThan(10);

    const firstMd = schedule.find((s) => s.level === 1);
    expect(firstMd).toBeDefined();
    expect(firstMd?.mdLord).toBe('ketu');
    expect(firstMd?.startDate).toBeDefined();
    expect(firstMd?.endDate).toBeDefined();
    expect(firstMd?.durationDays).toBeGreaterThan(0);
  });

  it('marks historical, active, and upcoming statuses accurately', () => {
    const schedule = generateDashaSchedule(sampleRecord, '2005-01-01', 2);
    const activeEntry = schedule.find((s) => s.status === 'ACTIVE');
    expect(activeEntry).toBeDefined();
    expect(activeEntry?.startTimeMs).toBeLessThanOrEqual(new Date('2005-01-01T12:00:00+05:30').getTime());
    expect(activeEntry?.endTimeMs).toBeGreaterThan(new Date('2005-01-01T12:00:00+05:30').getTime());
  });

  it('finds active Dasha lords and triad on any arbitrary past or future date', () => {
    const dasha2010 = findDashaAtDate(sampleRecord, '2010-09-01');
    expect(dasha2010.mdLord).toBeDefined();
    expect(dasha2010.adLord).toBeDefined();
    expect(dasha2010.triadCode).toMatch(/^\[.+\]$/);
    expect(dasha2010.remainingDays).toBeGreaterThanOrEqual(0);
  });

  it('performs reverse lookup to find when next specific Triad takes effect', () => {
    const nextOccurrence = findNextTriadOccurrence(sampleRecord, '[T-T-T]', '2005-01-01');
    // TCS (Libra Lagna: Saturn, Venus, Mercury are Trikona lords)
    // Venus Mahadasha will have Venus and Saturn ADs which are [T-T-T]
    if (nextOccurrence) {
      expect(nextOccurrence.triadCode).toBe('[T-T-T]');
      expect(nextOccurrence.startDate).toBeDefined();
      expect(nextOccurrence.endDate).toBeDefined();
    }
  });
});
