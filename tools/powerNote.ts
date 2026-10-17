/**
 * WP-0.5. Simulates the minimum detectable effect (MDE) of the SSD 11.3 decision procedure for
 * several universe sizes, holding horizons and window lengths, and writes
 * fixtures/eval/power_note_results.json. Everything is seeded; re-running reproduces the file.
 *
 * Run: pnpm exec tsx tools/powerNote.ts
 *
 * Synthetic design (no real prices): daily idiosyncratic volatility 2%, common market factor 1%,
 * signal on about 20% of the time in episodes as long as the holding horizon, independent of returns.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRng } from '../packages/core/src/random';
import {
  aggregateByDate,
  effectiveSampleSize,
  embargoMask,
  findMde,
  nonOverlappingTest,
  onReturnSeries,
  syntheticPanel,
} from '../packages/core/src/experiment';

interface Row {
  scenario: string;
  instruments: number;
  horizon: number;
  dates: number;
  years: number;
  onShare: number;
  nonOverlapDates: number;
  rawNOn: number;
  effectiveN: number;
  returnSd: number;
  design: string;
  replicates?: number;
  mdeMin?: number | null;
  mdeMax?: number | null;
  mde: number | null;
  mdeOverSd: number | null;
  powerAtMde: number;
  withPlaceboMde?: number | null;
}

const SCENARIOS = [
  { name: 'base', dailyVol: 0.02, marketVol: 0.01, sharedSignal: false },
  { name: 'stress-correlated', dailyVol: 0.015, marketVol: 0.015, sharedSignal: false },
  { name: 'market-wide', dailyVol: 0.02, marketVol: 0.01, sharedSignal: true },
];

function sd(xs: Float64Array): number {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / xs.length);
}

const DUTY = 0.2;

function buildPanel(
  scenario: (typeof SCENARIOS)[number],
  instruments: number,
  horizon: number,
  dates: number,
  rng: ReturnType<typeof createRng>,
) {
  return syntheticPanel(
    {
      instruments,
      dates,
      horizon,
      dailyVol: scenario.dailyVol,
      marketVol: scenario.marketVol,
      startProbability: DUTY / (horizon * (1 - DUTY)),
      episodeLength: horizon,
      sharedSignal: scenario.sharedSignal,
    },
    rng,
  );
}

function runOne(
  scenario: (typeof SCENARIOS)[number],
  instruments: number,
  horizon: number,
  dates: number,
  placebo: boolean,
  replicate: number,
): Row {
  const root = createRng(
    `power-note-v1|${scenario.name}|${String(instruments)}|${String(horizon)}|${String(dates)}|${String(replicate)}`,
  );
  const panel = buildPanel(scenario, instruments, horizon, dates, root.fork('panel'));
  const agg = aggregateByDate(panel, embargoMask(panel));
  const settings = {
    alpha: 0.05,
    blockLength: 4 * horizon,
    offset: 0,
    placeboShifts: 0,
    periods: [252],
  };
  const opts = { ...settings, sims: 60, targetPower: 0.8, bisections: 5 };
  const found = findMde(panel, root.fork('mde'), opts);
  const returnSd = sd(panel.ret);
  const row: Row = {
    scenario: scenario.name,
    instruments,
    horizon,
    dates,
    years: Math.round((dates / 250) * 10) / 10,
    onShare: panel.on.reduce((a, b) => a + b, 0) / panel.on.length,
    nonOverlapDates: nonOverlappingTest(panel, agg, 0).n,
    rawNOn: panel.on.reduce((a, b) => a + b, 0),
    effectiveN: effectiveSampleSize(onReturnSeries(agg), horizon).effectiveN,
    design: nonOverlappingTest(panel, agg, 0).design,
    returnSd,
    mde: found.mde,
    mdeOverSd: found.mde === null ? null : found.mde / returnSd,
    powerAtMde: found.power,
  };
  if (placebo) {
    row.withPlaceboMde = findMde(panel, root.fork('mde-placebo'), {
      ...opts,
      placeboShifts: 49,
      sims: 40,
    }).mde;
  }
  return row;
}

function wanted(scenario: string, dates: number, instruments: number): boolean {
  if (scenario === 'base') return dates !== 4000;
  if (scenario === 'stress-correlated') return dates === 1000 && [50, 200].includes(instruments);
  return dates !== 4000 || [20, 200].includes(instruments);
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
};

/** One reported row: the median over independent panels, with the range of the MDE. */
function combine(reps: Row[]): Row {
  const mdes = reps.map((r) => r.mde).filter((m): m is number => m !== null);
  const first = reps[0] as Row;
  return {
    ...first,
    replicates: reps.length,
    nonOverlapDates: median(reps.map((r) => r.nonOverlapDates)),
    effectiveN: median(reps.map((r) => r.effectiveN)),
    returnSd: median(reps.map((r) => r.returnSd)),
    mde: mdes.length === 0 ? null : median(mdes),
    mdeMin: mdes.length === 0 ? null : Math.min(...mdes),
    mdeMax: mdes.length === 0 ? null : Math.max(...mdes),
    mdeOverSd: mdes.length === 0 ? null : median(mdes) / median(reps.map((r) => r.returnSd)),
  };
}

const rows: Row[] = [];
for (const scenario of SCENARIOS) {
  const copies = scenario.sharedSignal ? 5 : 1;
  for (const horizon of [20, 60]) {
    for (const dates of [1000, 2000, 4000]) {
      for (const instruments of [20, 50, 100, 200]) {
        if (!wanted(scenario.name, dates, instruments)) continue;
        const withPlacebo =
          scenario.name !== 'stress-correlated' && dates === 1000 && instruments === 100;
        const reps = Array.from({ length: copies }, (_, k) =>
          runOne(scenario, instruments, horizon, dates, withPlacebo && k === 0, k),
        );
        rows.push(combine(reps));
        console.log(JSON.stringify(rows[rows.length - 1]));
      }
    }
  }
}

const dir = join(process.cwd(), 'fixtures', 'eval');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'power_note_results.json'), JSON.stringify(rows, null, 1));
console.log('wrote fixtures/eval/power_note_results.json');
