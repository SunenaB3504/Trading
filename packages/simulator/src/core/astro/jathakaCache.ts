/**
 * packages/simulator/src/core/astro/jathakaCache.ts
 * On-demand computation and persistent caching of corporate horoscopes (Jathakam).
 * Computes on first access and stores locally to eliminate duplicate calculations (0 ms future loads).
 * Enforces strict modularity (< 200 LOC, functions < 60 LOC, complexity <= 10).
 */

import type { CorporateRegistryRecord } from '../data/types';
import type { PlanetKey, DashaNode } from './types';
import { SIGN_LORDS } from './constants';
import { generateMahadashas, calculateNakshatraAndBalance } from './vimshottari';
import { deriveLagnaLordships } from './trikonaNathans';
import { calculateInduLagnaSign } from './induLagna';
import { calculateTransitPositions } from './ephemeris';
import { evaluateSpecialYogas } from './yogaDetector';

export interface CachedJathakam {
  symbol: string;
  companyName: string;
  listingDate: string;
  listingTime: string;
  lagnaSignId: number;
  lagnaLord: PlanetKey;
  moonSignId: number;
  moonLord: PlanetKey;
  moonDeg: number;
  janmaNakshatraIdx: number;
  induLagnaSignId: number;
  activeYogas: string[];
  lordships: ReturnType<typeof deriveLagnaLordships>;
  mahadashas: DashaNode[];
  computedAtMs: number;
}

const MEMORY_CACHE = new Map<string, CachedJathakam>();
const STORAGE_PREFIX = 'astrosim_jathakam_';

function readFromStorage(symbol: string): CachedJathakam | null {
  if (MEMORY_CACHE.has(symbol)) {
    return MEMORY_CACHE.get(symbol)!;
  }
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${symbol}`);
    if (raw) {
      const parsed = JSON.parse(raw) as CachedJathakam;
      MEMORY_CACHE.set(symbol, parsed);
      return parsed;
    }
  } catch {
    // Ignore storage read errors
  }
  return null;
}

function writeToStorage(jathakam: CachedJathakam): void {
  MEMORY_CACHE.set(jathakam.symbol, jathakam);
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(
      `${STORAGE_PREFIX}${jathakam.symbol}`,
      JSON.stringify(jathakam)
    );
  } catch {
    // Graceful fallback if storage quota exceeded
  }
}

export function computeJathakam(
  record: CorporateRegistryRecord,
  referenceDate: string = '2005-01-01'
): CachedJathakam {
  const lagnaId = record.lagna_sign_id ?? 0;
  const lagnaLord = SIGN_LORDS[lagnaId] ?? 'mars';
  const moonId = record.moon_sign_id ?? 0;
  const moonLord = SIGN_LORDS[moonId] ?? 'moon';

  const birthStr = `${record.listing_date}T${record.listing_time || '10:00:00'}+05:30`;
  const birthMs = new Date(birthStr).getTime();
  const mahadashas = generateMahadashas(birthMs, record.moon_deg, record.year_length_days);
  const nak = calculateNakshatraAndBalance(record.moon_deg);
  const indu = calculateInduLagnaSign(lagnaId, moonId);
  const lordships = deriveLagnaLordships(lagnaId);

  // Evaluate special yogas using reference ephemeris
  const safeDate = referenceDate && referenceDate.length >= 10 ? referenceDate : '2005-01-01';
  const transits = calculateTransitPositions(safeDate);
  const transitSigns: Record<PlanetKey, number> = {} as any;
  const navSigns: Partial<Record<PlanetKey, number>> = {};
  for (const [p, pos] of Object.entries(transits) as [PlanetKey, { signIndex: number; navamshaSignIndex: number }][]) {
    transitSigns[p] = pos.signIndex;
    navSigns[p] = pos.navamshaSignIndex;
  }

  const yogas = evaluateSpecialYogas({
    lagnaSignId: lagnaId,
    moonSignId: moonId,
    planetSigns: transitSigns,
    navamshaSigns: navSigns,
  });

  return {
    symbol: record.symbol,
    companyName: record.company_name,
    listingDate: record.listing_date,
    listingTime: record.listing_time || '10:00:00',
    lagnaSignId: lagnaId,
    lagnaLord,
    moonSignId: moonId,
    moonLord,
    moonDeg: record.moon_deg,
    janmaNakshatraIdx: nak.nakshatraIndex,
    induLagnaSignId: indu.induLagnaSignId,
    activeYogas: yogas.activeYogaNames,
    lordships,
    mahadashas,
    computedAtMs: Date.now(),
  };
}

/**
 * Retrieves horoscope from cache if present; otherwise computes, caches, and returns.
 */
export function getOrComputeJathakam(
  record: CorporateRegistryRecord,
  referenceDate?: string
): CachedJathakam {
  const cached = readFromStorage(record.symbol);
  if (cached) {
    return cached;
  }
  const computed = computeJathakam(record, referenceDate);
  writeToStorage(computed);
  return computed;
}

export function clearJathakamCache(): void {
  MEMORY_CACHE.clear();
  if (typeof window !== 'undefined' && window.localStorage) {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      window.localStorage.removeItem(k);
    }
  }
}

