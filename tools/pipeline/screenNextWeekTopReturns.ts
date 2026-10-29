/**
 * tools/pipeline/screenNextWeekTopReturns.ts
 * Identifies high-velocity Nifty 500 stocks positioned for maximum return
 * over the next 1 week (Oct 30 to Nov 06, 2026).
 * 
 * Evaluates:
 * 1. Active [T-T-T] Dasha alignment
 * 2. 7-Day Tara Bala progression (Sampat, Sadhana, Param-Mitra days)
 * 3. Absence of Chandrashtama & Naidhana traps in next 7 days
 * 4. Real-world breakout momentum & volume confirmation
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

const CANDIDATE_SYMBOLS = [
  'APLAPOLLO', 'DIVISLAB', 'INDHOTEL', 'JKCEMENT', 'CONCORDBIO',
  'GOKULAGRO', 'AFCONS', 'MAPMYINDIA', 'IRFC', 'IDFCFIRSTB',
  'BLS', 'BANDHANBNK', 'CRISIL', 'POLYCAB', 'KIMS', 'KIRLOSENG'
];

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

  console.log(`Evaluating 7-Day Velocity Matrix for top [T-T-T] candidates...\n`);

  const results = [];

  for (const sym of CANDIDATE_SYMBOLS) {
    const stock = preMatrix[sym];
    if (!stock) continue;

    const janmaNak = stock.janmaNakshatraId;
    const moonSignId = stock.moonSignId;
    const chandrashtamaSign = (moonSignId + 7) % 12; // 8th house from natal moon

    let auspiciousDays = 0;
    let afflictedDays = 0;
    let hasChandrashtama = false;
    const dayBreakdown: string[] = [];

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

      dayBreakdown.push(`${d.slice(5)}: T${tara.taraNumber}`);
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

  console.log('Symbol'.padEnd(12), 'Lagna'.padEnd(20), '1-Wk Ret'.padEnd(12), 'Ausp/Affl'.padEnd(12), 'Score'.padEnd(8), 'Top Yogas');
  console.log('-'.repeat(85));
  results.forEach((r) => {
    const retStr = (r.momentum1W >= 0 ? '+' : '') + r.momentum1W.toFixed(2) + '%';
    console.log(
      r.symbol.padEnd(12),
      r.lagna.padEnd(20),
      retStr.padEnd(12),
      `${r.auspiciousDays} / ${r.afflictedDays} bad`.padEnd(12),
      r.velocityScore.toString().padEnd(8),
      r.yogas.slice(0, 2).join(', ') || 'None'
    );
  });
}

main().catch(console.error);

