import { describe, expect, it } from 'vitest';
import {
  scanUniverse,
  filterUniverseByTriad,
  filterUniverseByYoga,
  filterUniverseByKota,
  filterUniverseBySBC,
  filterUniverseByInduLagna,
  filterUniverseByTara,
  getPrioritizedDailyActionFeed,
} from './universeScanner';
import type { CorporateRegistryRecord, QuarterlyFundamental } from '../data/types';

const sampleRegistry: Record<string, CorporateRegistryRecord> = {
  TCS: {
    symbol: 'TCS',
    company_name: 'Tata Consultancy Services Limited',
    listing_date: '2004-08-25',
    listing_time: '10:00:00',
    timezone_offset_minutes: 330,
    latitude: 19.0596,
    longitude: 72.8656,
    year_length_days: 365.2425,
    primary_consonant: 'Ta',
    ayanamsa: 23.922021,
    lagna_sign_id: 6, // Libra
    lagna_sign: 'Libra',
    lagna_deg: 28.8479,
    moon_sign_id: 9, // Sagittarius
    moon_sign: 'Sagittarius',
    moon_deg: 1.7089,
    moon_nakshatra: 'Mula',
    pada: 1,
    birth_md_lord: 'ketu',
    starting_balance_years: 6.1029,
  },
  INFY: {
    symbol: 'INFY',
    company_name: 'Infosys Limited',
    listing_date: '1993-06-14',
    listing_time: '10:00:00',
    timezone_offset_minutes: 330,
    latitude: 19.0596,
    longitude: 72.8656,
    year_length_days: 365.2425,
    primary_consonant: 'I',
    ayanamsa: 23.82,
    lagna_sign_id: 1, // Taurus
    lagna_sign: 'Taurus',
    lagna_deg: 12.0,
    moon_sign_id: 11, // Pisces
    moon_sign: 'Pisces',
    moon_deg: 15.0,
    moon_nakshatra: 'Uttara Bhadrapada',
    pada: 4,
    birth_md_lord: 'saturn',
    starting_balance_years: 4.5,
  },
  DISTRESSED: {
    symbol: 'DISTRESSED',
    company_name: 'Distressed Sample Ltd',
    listing_date: '2010-01-01',
    listing_time: '10:00:00',
    timezone_offset_minutes: 330,
    latitude: 19.0596,
    longitude: 72.8656,
    year_length_days: 365.2425,
    primary_consonant: 'Da',
    ayanamsa: 23.95,
    lagna_sign_id: 0, // Aries
    lagna_sign: 'Aries',
    lagna_deg: 10.0,
    moon_sign_id: 7, // Scorpio (debilitated Moon)
    moon_sign: 'Scorpio',
    moon_deg: 5.0,
    moon_nakshatra: 'Anuradha',
    pada: 1,
    birth_md_lord: 'saturn',
    starting_balance_years: 12.0,
  },
};

const sampleFundamentals: Record<string, QuarterlyFundamental[]> = {
  TCS: [
    {
      symbol: 'TCS',
      fiscal_quarter: 'FY26Q1',
      period_end_date: '2026-06-30',
      filing_timestamp: '2026-07-15T18:00:00Z',
      debt_to_equity: 0.0,
      fcf: 40000,
      roce: 55.0,
      roe: 45.0,
      pledging_pct: 0.0,
      icr: 100.0,
    },
  ],
  DISTRESSED: [
    {
      symbol: 'DISTRESSED',
      fiscal_quarter: 'FY26Q1',
      period_end_date: '2026-06-30',
      filing_timestamp: '2026-07-15T18:00:00Z',
      debt_to_equity: 3.5, // Severe debt veto
      fcf: -1000,
      roce: 2.0,
      roe: 1.0,
      pledging_pct: 45.0, // High pledge veto
      icr: 0.8,
    },
  ],
};

describe('Market Universe Scanner Engine (universeScanner)', () => {
  it('correctly scans universe stocks and summarizes 27-triad distribution', () => {
    const summary = scanUniverse(sampleRegistry, '2026-10-05', sampleFundamentals);
    expect(summary.totalScanned).toBe(3);
    expect(summary.scanDate).toBe('2026-10-05');
    expect(summary.items.length).toBe(3);
    expect(Object.keys(summary.triadDistribution).length).toBeGreaterThan(0);
  });

  it('evaluates 4-fold Vedic Confluence fields (Kota, SBC, Indu Lagna, Tara Bala)', () => {
    const summary = scanUniverse(sampleRegistry, '2026-10-05', sampleFundamentals);
    const item = summary.items[0];
    expect(item).toBeDefined();
    if (!item) return;

    expect(item.kotaDefenseScore).toBeGreaterThanOrEqual(0);
    expect(item.kotaDefenseScore).toBeLessThanOrEqual(1.0);
    expect(['FORTIFIED', 'BREACHED', 'NEUTRAL']).toContain(item.kotaStatus);
    expect(['SUBHA', 'CLEAN', 'AFFLICTED']).toContain(item.sbcStatus);
    expect(typeof item.isInduLagnaActive).toBe('boolean');
    expect(item.taraNumber).toBeGreaterThanOrEqual(1);
    expect(item.taraNumber).toBeLessThanOrEqual(9);
    expect(['AUSPICIOUS', 'NEUTRAL', 'INAUSPICIOUS']).toContain(item.taraCategory);
    expect(item.confluenceScore).toBeGreaterThanOrEqual(0);
    expect(item.confluenceScore).toBeLessThanOrEqual(4);
  });

  it('correctly filters universe items by Confluence criteria (Kota, SBC, Indu, Tara)', () => {
    const summary = scanUniverse(sampleRegistry, '2026-10-05', sampleFundamentals);
    const items = summary.items;

    const fortified = filterUniverseByKota(items, 'FORTIFIED');
    expect(fortified.every((i) => i.isKotaFortified)).toBe(true);

    const sbcSubha = filterUniverseBySBC(items, 'SUBHA');
    expect(sbcSubha.every((i) => i.sbcStatus === 'SUBHA')).toBe(true);

    const induActive = filterUniverseByInduLagna(items, 'ACTIVE');
    expect(induActive.every((i) => i.isInduLagnaActive)).toBe(true);

    const taraAuspicious = filterUniverseByTara(items, 'AUSPICIOUS');
    expect(taraAuspicious.every((i) => i.taraCategory === 'AUSPICIOUS')).toBe(true);
  });

  it('correctly flags balance-sheet risk veto on distressed company', () => {
    const summary = scanUniverse(sampleRegistry, '2026-10-05', sampleFundamentals);
    const distressed = summary.items.find((i) => i.symbol === 'DISTRESSED');
    expect(distressed).toBeDefined();
    expect(distressed?.isBlocked).toBe(true);
    expect(distressed?.phiFinancial).toBe(0.0);
    expect(distressed?.action).toBe('HOLD');
    expect(distressed?.reason).toContain('BLOCKED');
  });

  it('correctly filters universe items by Dasha Triad', () => {
    const summary = scanUniverse(sampleRegistry, '2026-10-05', sampleFundamentals);
    const tcsItem = summary.items.find((i) => i.symbol === 'TCS')!;
    const filtered = filterUniverseByTriad(summary.items, tcsItem.triadCode);
    expect(filtered.length).toBeGreaterThanOrEqual(1);
    expect(filtered.every((i) => i.triadCode === tcsItem.triadCode)).toBe(true);
  });

  it('correctly filters universe items by Yoga (VRY/NBRY)', () => {
    const summary = scanUniverse(sampleRegistry, '2026-10-05', sampleFundamentals);
    const allItems = summary.items;
    const vryFiltered = filterUniverseByYoga(allItems, 'VRY');
    expect(vryFiltered.every((i) => i.hasVry)).toBe(true);

    const nbryFiltered = filterUniverseByYoga(allItems, 'NBRY');
    expect(nbryFiltered.every((i) => i.hasNbry)).toBe(true);
  });

  it('correctly prioritizes daily action feed (BUY > SELL > HOLD > Blocked)', () => {
    const summary = scanUniverse(sampleRegistry, '2026-10-05', sampleFundamentals);
    const prioritized = getPrioritizedDailyActionFeed(summary.items);
    expect(prioritized.length).toBe(3);

    // Blocked item must be at the bottom
    const lastItem = prioritized[prioritized.length - 1];
    expect(lastItem?.isBlocked).toBe(true);
  });

  it('TC-08 Benchmark: scans universe stocks in under 50ms', () => {
    const start = performance.now();
    const summary = scanUniverse(sampleRegistry, '2026-10-05', sampleFundamentals);
    const duration = performance.now() - start;

    expect(summary.totalScanned).toBe(3);
    expect(duration).toBeLessThan(50); // Under 50ms requirement
  });
});
