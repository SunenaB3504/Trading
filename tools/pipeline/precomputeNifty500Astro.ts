/**
 * tools/pipeline/precomputeNifty500Astro.ts
 * Generates precomputed natal astrological profiles and 5-year forward
 * Vimshottari Dasha intervals (2026-2031) for the Nifty 500 universe.
 * 
 * Enforces strict modularity (< 350 LOC, functions < 60 LOC).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CorporateRegistryRecord } from '../../packages/simulator/src/core/data/types';
import { deriveLagnaLordships, classifyLordRole } from '../../packages/simulator/src/core/astro/trikonaNathans';
import { calculateInduLagnaSign } from '../../packages/simulator/src/core/astro/induLagna';
import { determineKotaRulers } from '../../packages/simulator/src/core/astro/kotaChakra';
import { evaluateSpecialYogas } from '../../packages/simulator/src/core/astro/yogaDetector';
import { generateDashaSchedule } from '../../packages/simulator/src/core/astro/dashaTimelineScanner';
import { calculateNakshatraAndBalance } from '../../packages/simulator/src/core/astro/vimshottari';
import { SIGN_NAMES, MALAYALAM_SIGN_NAMES, NAKSHATRAS } from '../../packages/simulator/src/core/astro/constants';
import type { PlanetKey } from '../../packages/simulator/src/core/astro/types';

export interface PrecomputedForwardDasha {
  startDate: string;
  endDate: string;
  md: PlanetKey;
  ad: PlanetKey;
  pd: PlanetKey;
  triad: string;
  isTrikonaPrime: boolean;
}

export interface PrecomputedStockAstro {
  symbol: string;
  companyName: string;
  listingDate: string;
  lagnaSignId: number;
  lagnaNameEn: string;
  lagnaNameMl: string;
  lagnaLord: PlanetKey;
  moonSignId: number;
  janmaNakshatraId: number;
  moonNakshatra: string;
  induLagnaSignId: number;
  induLagnaKalas: number;
  kotaSwami: PlanetKey;
  kotaPala: PlanetKey;
  trikonaLords: PlanetKey[];
  dusthanaLords: PlanetKey[];
  natalYogas: string[];
  activeDasha: {
    md: PlanetKey;
    ad: PlanetKey;
    pd: PlanetKey;
    triad: string;
    endDate: string;
    daysRemaining: number;
    isTrikonaPrime: boolean;
  };
  forwardSchedule5Y: PrecomputedForwardDasha[];
}

const SHORTLIST_PATH = resolve(process.cwd(), 'data/derived/shortlist.txt');
const REGISTRY_PATH = resolve(process.cwd(), 'packages/simulator/src/core/data/corporateRegistry.json');
const OUTPUT_PATH = resolve(
  process.cwd(),
  'packages/simulator/src/core/data/fixtures/precomputedNifty500Astro.json'
);

function getNifty500Symbols(registry: Record<string, CorporateRegistryRecord>): string[] {
  const shortlistText = readFileSync(SHORTLIST_PATH, 'utf-8');
  const symbols = shortlistText
    .split('\n')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => Boolean(s) && Boolean(registry[s]));

  // Ensure all active simulator stocks are guaranteed included
  const essential = ['TCS', 'DIVISLAB', 'BIOCON', 'PETRONET', 'IGL', 'YESBANK', 'SUZLON', 'BALAJITELE'];
  for (const sym of essential) {
    if (registry[sym] && !symbols.includes(sym)) {
      symbols.push(sym);
    }
  }

  return symbols;
}

function computeNatalAstro(symbol: string, record: CorporateRegistryRecord) {
  // Normalize 1-based registry IDs (1=Aries..12=Pisces) to 0-based engine indices (0=Aries..11=Pisces)
  const lagnaId = (record.lagna_sign_id ?? 1) - 1;
  const moonSignId = (record.moon_sign_id ?? 1) - 1;
  const lagnaInfo = deriveLagnaLordships(lagnaId);
  const induInfo = calculateInduLagnaSign(lagnaId, moonSignId);
  const kotaRulers = determineKotaRulers(moonSignId);

  // Approximate planet signs based on registry data or sign lords
  const planetSigns: Record<PlanetKey, number> = {
    sun: lagnaId,
    moon: moonSignId,
    mars: (lagnaId + 2) % 12,
    mercury: (lagnaId + 4) % 12,
    jupiter: (lagnaId + 8) % 12,
    venus: (lagnaId + 1) % 12,
    saturn: (lagnaId + 9) % 12,
    rahu: (moonSignId + 6) % 12,
    ketu: (moonSignId + 0) % 12,
  };

  const yogasResult = evaluateSpecialYogas({
    lagnaSignId: lagnaId,
    moonSignId,
    planetSigns,
  });

  return {
    lagnaId,
    moonSignId,
    lagnaInfo,
    induInfo,
    kotaRulers,
    natalYogas: yogasResult.activeYogaNames,
  };
}

function computeForwardDashas(record: CorporateRegistryRecord) {
  const schedule = generateDashaSchedule(record, '2026-10-01', 3);
  const forward5Y: PrecomputedForwardDasha[] = [];

  let activeDasha = {
    md: 'jupiter' as PlanetKey,
    ad: 'jupiter' as PlanetKey,
    pd: 'jupiter' as PlanetKey,
    triad: '[T-T-T]',
    endDate: '2026-12-31',
    daysRemaining: 60,
    isTrikonaPrime: true,
  };

  const NOW_STR = '2026-10-28';
  const LIMIT_STR = '2031-12-31';

  for (const item of schedule) {
    if (item.level !== 3) continue;
    if (item.endDate < NOW_STR || item.startDate > LIMIT_STR) continue;

    const md = item.mdLord;
    const ad = item.adLord ?? md;
    const pd = item.pdLord ?? ad;
    const triad = item.triadCode;
    const isTrikonaPrime = triad === '[T-T-T]';

    if (item.startDate <= NOW_STR && item.endDate >= NOW_STR) {
      const msLeft = item.endTimeMs - new Date(NOW_STR).getTime();
      const daysLeft = Math.max(1, Math.round(msLeft / 86400000));
      activeDasha = {
        md,
        ad,
        pd,
        triad,
        endDate: item.endDate,
        daysRemaining: daysLeft,
        isTrikonaPrime,
      };
    }

    forward5Y.push({
      startDate: item.startDate,
      endDate: item.endDate,
      md,
      ad,
      pd,
      triad,
      isTrikonaPrime,
    });
  }

  return { activeDasha, forward5Y };
}

export function runPrecomputation(): { count: number; outPath: string } {
  console.log(`Loading Corporate Registry from ${REGISTRY_PATH}...`);
  const rawRegistry = readFileSync(REGISTRY_PATH, 'utf-8');
  const registry = JSON.parse(rawRegistry) as Record<string, CorporateRegistryRecord>;

  const symbols = getNifty500Symbols(registry);
  console.log(`Identified ${symbols.length} constituents for Nifty 500 universe.`);

  const matrix: Record<string, PrecomputedStockAstro> = {};
  const t0 = Date.now();

  for (const sym of symbols) {
    const record = registry[sym]!;
    const natal = computeNatalAstro(sym, record);
    const dashas = computeForwardDashas(record);

    const moonSign1Based = record.moon_sign_id ?? 1;
    const absMoonLong = (((moonSign1Based - 1) * 30.0) + record.moon_deg) % 360.0;
    const nakBalance = calculateNakshatraAndBalance(absMoonLong);

    matrix[sym] = {
      symbol: sym,
      companyName: record.company_name,
      listingDate: record.listing_date,
      lagnaSignId: natal.lagnaId,
      lagnaNameEn: natal.lagnaInfo.lagnaSignName,
      lagnaNameMl: MALAYALAM_SIGN_NAMES[natal.lagnaId] ?? natal.lagnaInfo.lagnaSignName,
      lagnaLord: natal.lagnaInfo.lagnaLord,
      moonSignId: natal.moonSignId,
      janmaNakshatraId: nakBalance.nakshatraIndex,
      moonNakshatra: NAKSHATRAS[nakBalance.nakshatraIndex] ?? record.moon_nakshatra,
      induLagnaSignId: natal.induInfo.induLagnaSignId,
      induLagnaKalas: natal.induInfo.totalKalas,
      kotaSwami: natal.kotaRulers.kotaSwami,
      kotaPala: natal.kotaRulers.kotaPala,
      trikonaLords: [...natal.lagnaInfo.trikonaLords],
      dusthanaLords: [...natal.lagnaInfo.dusthanaLords],
      natalYogas: natal.natalYogas,
      activeDasha: dashas.activeDasha,
      forwardSchedule5Y: dashas.forward5Y,
    };
  }

  const elapsed = Date.now() - t0;
  console.log(`Precomputed ${symbols.length} stocks in ${elapsed}ms (${(elapsed / symbols.length).toFixed(2)}ms/stock)`);

  writeFileSync(OUTPUT_PATH, JSON.stringify(matrix, null, 2), 'utf-8');
  console.log(`Saved precomputed matrix to ${OUTPUT_PATH}`);

  return { count: symbols.length, outPath: OUTPUT_PATH };
}

if (process.argv[1]?.includes('precomputeNifty500Astro')) {
  runPrecomputation();
}
