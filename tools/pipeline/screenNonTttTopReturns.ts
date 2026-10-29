/**
 * tools/pipeline/screenNonTttTopReturns.ts
 * Screens Nifty 500 stocks NOT in [T-T-T] (e.g. [T-T-K], [T-T-D], Turnarounds)
 * that have powerful Yogas, favorable 7-day Tara Bala, and high momentum.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PrecomputedStockAstro } from './precomputeNifty500Astro';
import { calculateTransitPositions, calculateTransitSigns } from '../../packages/simulator/src/core/astro/ephemeris';
import { calculateTaraBala } from '../../packages/simulator/src/core/astro/taraBala';

const PRECOMPUTED_PATH = resolve(
  process.cwd(),
  'packages/simulator/src/core/data/fixtures/precomputedNifty500Astro.json'
);

const NEXT_WEEK_DATES = [
  '2026-10-30', // Friday
  '2026-11-02', // Monday
  '2026-11-03', // Tuesday
  '2026-11-04', // Wednesday
  '2026-11-05', // Thursday
  '2026-11-06', // Friday
];

async function fetchRecentReturn(symbol: string): Promise<number> {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS?interval=1d&range=5d`);
    const data = await res.json();
    const q = data.chart?.result?.[0]?.indicators?.quote?.[0];
    if (!q || !q.close || q.close.length === 0) return 0;
    const closes = q.close.filter((c: number | null) => c != null && c > 0);
    if (closes.length < 2) return 0;
    const first = closes[0];
    const last = closes[closes.length - 1];
    return Number((((last - first) / first) * 100).toFixed(2));
  } catch {
    return 0;
  }
}

async function main() {
  const rawPre = readFileSync(PRECOMPUTED_PATH, 'utf-8');
  const preMatrix = JSON.parse(rawPre) as Record<string, PrecomputedStockAstro>;

  console.log(`Scanning Non-[T-T-T] stocks with powerful Yogas & favorable 7-day Tara Bala...\n`);

  // Filter stocks NOT in [T-T-T], but having powerful yogas (NBRY, VRY, Mahapurusha, Gajakesari, Dhana)
  const candidateSymbols: string[] = [];
  for (const [sym, stock] of Object.entries(preMatrix)) {
    if (stock.activeDasha.triad !== '[T-T-T]' && stock.natalYogas.length > 0) {
      // Must not be all Dusthana [D-D-D]
      if (stock.activeDasha.triad.includes('T') || stock.activeDasha.triad.includes('K')) {
        candidateSymbols.push(sym);
      }
    }
  }

  console.log(`Identified ${candidateSymbols.length} Non-[T-T-T] candidates with active Kendra/Trikona & Yogas.`);

  // Sample top liquid names to evaluate 7-day velocity and live 1-week momentum
  const sampleToCheck = [
    'DIVISLAB', 'BHARTIARTL', 'RELIANCE', 'SBIN', 'TITAN', 'LT', 'WIPRO',
    'TATACHEM', 'DIXON', 'PERSISTENT', 'COFORGE', 'LUPIN', 'AUBANK',
    'FEDERALBNK', 'VOLTAS', 'TRENT', 'HAL', 'BEL', 'BHEL', 'NTPC'
  ];

  const results = [];

  for (const sym of sampleToCheck) {
    const stock = preMatrix[sym];
    if (!stock) continue;
    if (stock.activeDasha.triad === '[T-T-T]') continue; // Strictly non-TTT

    const janmaNak = stock.janmaNakshatraId;
    const moonSignId = stock.moonSignId;
    const chandrashtamaSign = (moonSignId + 7) % 12;

    let auspiciousDays = 0;
    let afflictedDays = 0;
    let hasChandrashtama = false;

    for (const d of NEXT_WEEK_DATES) {
      const pos = calculateTransitPositions(d);
      const signs = calculateTransitSigns(d);
      const transitNak = pos.moon.nakshatraIndex;
      const transitMoonSign = signs.moon;

      const tara = calculateTaraBala(janmaNak, transitNak);
      const isAuspicious = [2, 4, 6, 8, 9].includes(tara.taraNumber);
      const isBad = [3, 5, 7].includes(tara.taraNumber);

      if (transitMoonSign === chandrashtamaSign) {
        hasChandrashtama = true;
        afflictedDays += 2;
      }

      if (isAuspicious) auspiciousDays++;
      if (isBad) afflictedDays++;
    }

    const momentum1W = await fetchRecentReturn(sym);
    const velocityScore = auspiciousDays * 2 - afflictedDays + (hasChandrashtama ? -5 : 2) + (momentum1W > 0 ? 3 : 0);

    results.push({
      symbol: sym,
      company: stock.companyName,
      lagna: `${stock.lagnaNameEn} (${stock.lagnaNameMl})`,
      triad: stock.activeDasha.triad,
      lords: `${stock.activeDasha.md}-${stock.activeDasha.ad}-${stock.activeDasha.pd}`,
      yogas: stock.natalYogas,
      auspiciousDays,
      afflictedDays,
      hasChandrashtama,
      momentum1W,
      velocityScore,
    });
  }

  results.sort((a, b) => b.velocityScore - a.velocityScore || b.momentum1W - a.momentum1W);

  console.log('Symbol'.padEnd(12), 'Lagna'.padEnd(20), 'Triad'.padEnd(10), '1-Wk Ret'.padEnd(12), 'Ausp/Affl'.padEnd(12), 'Score'.padEnd(8), 'Key Yogas');
  console.log('-'.repeat(95));
  results.forEach((r) => {
    const retStr = (r.momentum1W >= 0 ? '+' : '') + r.momentum1W.toFixed(2) + '%';
    console.log(
      r.symbol.padEnd(12),
      r.lagna.padEnd(20),
      r.triad.padEnd(10),
      retStr.padEnd(12),
      `${r.auspiciousDays} / ${r.afflictedDays} bad`.padEnd(12),
      r.velocityScore.toString().padEnd(8),
      r.yogas.slice(0, 2).join(', ') || 'None'
    );
  });
}

main().catch(console.error);

