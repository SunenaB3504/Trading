/**
 * tools/pipeline/screenDesirableNifty500.ts
 * High-speed 4-Gate screening engine over the precomputed Nifty 500 matrix.
 * Enforces strict modularity (< 250 LOC, functions < 60 LOC).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PrecomputedStockAstro } from './precomputeNifty500Astro';
import type { QuarterlyFundamental } from '../../packages/simulator/src/core/data/types';
import { calculateTransitPositions, calculateTransitSigns } from '../../packages/simulator/src/core/astro/ephemeris';
import { evaluateKotaChakra } from '../../packages/simulator/src/core/astro/kotaChakra';
import { evaluateInduLagna } from '../../packages/simulator/src/core/astro/induLagna';
import { calculateTaraBala } from '../../packages/simulator/src/core/astro/taraBala';

const PRECOMPUTED_PATH = resolve(
  process.cwd(),
  'packages/simulator/src/core/data/fixtures/precomputedNifty500Astro.json'
);
const FUNDAMENTALS_PATH = resolve(
  process.cwd(),
  'packages/simulator/src/core/data/fixtures/pitFundamentals.json'
);

export interface ScreenedCandidate {
  symbol: string;
  companyName: string;
  lagnaNameEn: string;
  lagnaNameMl: string;
  triad: string;
  dashaLords: string;
  daysRemaining: number;
  confluenceScore: number;
  isKotaFortified: boolean;
  isInduActive: boolean;
  isTaraFavorable: boolean;
  yogas: string[];
  fundamentalStatus: 'PASS' | 'NO_DATA' | 'FAIL';
  deRatio?: number;
  roce?: number;
}

export function runScreen(activeDate: string = '2026-10-28'): ScreenedCandidate[] {
  const rawPre = readFileSync(PRECOMPUTED_PATH, 'utf-8');
  const preMatrix = JSON.parse(rawPre) as Record<string, PrecomputedStockAstro>;

  const rawFunds = readFileSync(FUNDAMENTALS_PATH, 'utf-8');
  const fundamentalsMap = JSON.parse(rawFunds) as Record<string, QuarterlyFundamental[]>;

  const transitPositions = calculateTransitPositions(activeDate);
  const transitSigns = calculateTransitSigns(activeDate);
  const moonTransitNak = Math.floor(transitPositions.moon.apparentLongitude / (360.0 / 27.0));

  const results: ScreenedCandidate[] = [];

  for (const [sym, stock] of Object.entries(preMatrix)) {
    // 1. Fundamentals Gate
    const fundList = fundamentalsMap[sym] ?? [];
    let fundamentalStatus: 'PASS' | 'NO_DATA' | 'FAIL' = 'NO_DATA';
    let deRatio: number | undefined;
    let roce: number | undefined;

    if (fundList.length > 0) {
      const latestFund = fundList[fundList.length - 1]!;
      deRatio = latestFund.debt_to_equity;
      roce = latestFund.roce;
      const isClean = deRatio < 0.5 && roce > 15.0 && latestFund.pledging_pct === 0;
      fundamentalStatus = isClean ? 'PASS' : 'FAIL';
    }

    // 2. Active Dasha match for activeDate
    let currentDasha = stock.activeDasha;
    if (activeDate !== '2026-10-28' && stock.forwardSchedule5Y) {
      const match = stock.forwardSchedule5Y.find((f) => f.startDate <= activeDate && f.endDate >= activeDate);
      if (match) {
        currentDasha = {
          md: match.md,
          ad: match.ad,
          pd: match.pd,
          triad: match.triad,
          endDate: match.endDate,
          daysRemaining: 30,
          isTrikonaPrime: match.isTrikonaPrime,
        };
      }
    }

    // 3. 4-Fold Confluence
    const janmaNak = stock.janmaNakshatraId;
    const kota = evaluateKotaChakra(janmaNak, stock.moonSignId, transitPositions);
    const isKotaFortified = kota.defenseScore >= 0.35;

    const indu = evaluateInduLagna(stock.lagnaSignId, stock.moonSignId, transitSigns);
    const isInduActive = indu.isInduActive;

    const tara = calculateTaraBala(janmaNak, moonTransitNak);
    const isTaraFavorable = ['mitra', 'param_mitra', 'sadhana', 'kshema'].includes(tara.category);

    let confluenceScore = 0;
    if (isKotaFortified) confluenceScore++;
    if (isInduActive) confluenceScore++;
    if (isTaraFavorable) confluenceScore++;
    if (currentDasha.triad === '[T-T-T]') confluenceScore++;

    results.push({
      symbol: sym,
      companyName: stock.companyName,
      lagnaNameEn: stock.lagnaNameEn,
      lagnaNameMl: stock.lagnaNameMl,
      triad: currentDasha.triad,
      dashaLords: `${currentDasha.md}-${currentDasha.ad}-${currentDasha.pd}`,
      daysRemaining: currentDasha.daysRemaining,
      confluenceScore,
      isKotaFortified,
      isInduActive,
      isTaraFavorable,
      yogas: stock.natalYogas,
      fundamentalStatus,
      deRatio,
      roce,
    });
  }

  return results;
}

if (process.argv[1]?.includes('screenDesirableNifty500')) {
  const t0 = Date.now();
  const date = process.argv[2] ?? '2026-10-28';
  console.log(`Executing 4-Gate Screen across Nifty 500 as of ${date}...`);
  const candidates = runScreen(date);
  const elapsed = Date.now() - t0;
  console.log(`Scan completed in ${elapsed}ms across ${candidates.length} stocks.\n`);

  const searchSym = process.argv[3];
  if (searchSym) {
    const found = candidates.find((c) => c.symbol.toUpperCase() === searchSym.toUpperCase());
    if (found) {
      console.log(`\nSpecific Search for [${found.symbol}]:`);
      console.log(found);
    }
  }
  const desirable = candidates
    .filter((c) => c.triad === '[T-T-T]' && c.confluenceScore >= 3 && c.fundamentalStatus !== 'FAIL')
    .sort((a, b) => b.confluenceScore - a.confluenceScore);

  console.log(`Found ${desirable.length} Highly Desirable Shares ([T-T-T] & Confluence >= 3/4):\n`);
  for (const c of desirable.slice(0, 25)) {
    const fundStr = c.fundamentalStatus === 'PASS' ? `D/E: ${c.deRatio?.toFixed(2)} ROCE: ${c.roce?.toFixed(1)}%` : 'Fundamental: Clean';
    console.log(
      `${c.symbol.padEnd(12)} | ${c.lagnaNameEn} (${c.lagnaNameMl})`.padEnd(30),
      `| Conf: ${c.confluenceScore}/4 | ${c.dashaLords.padEnd(25)} | ${fundStr.padEnd(25)} | Yogas: ${c.yogas.join(', ') || 'None'}`
    );
  }
}
