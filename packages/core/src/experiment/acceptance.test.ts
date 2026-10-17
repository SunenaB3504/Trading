import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import {
  aggregateByDate,
  blockMeansTest,
  embargoMask,
  estimatePower,
  findMde,
  nonOverlappingTest,
  shiftedPlacebo,
  syntheticPanel,
} from './index';

/**
 * WP-0.6 acceptance (a) and (b), run on synthetic panels: 10 instruments, 1,000 start dates,
 * H = 20, a common market factor and signal episodes of 20 sessions that are independent of returns.
 */
const OPTS = {
  instruments: 10,
  dates: 1000,
  horizon: 20,
  dailyVol: 0.01,
  marketVol: 0.01,
  startProbability: 0.0125,
  episodeLength: 20,
};

describe('null control: no effect planted', () => {
  it('false-positive rates sit at the nominal 5% (4-6% band) over 1,000 panels', () => {
    const root = createRng('null-control-v1');
    const n = 1000;
    let nonOverlap = 0,
      batch = 0,
      both = 0,
      placebo = 0,
      placeboRuns = 0;
    for (let i = 0; i < n; i += 1) {
      const p = syntheticPanel(OPTS, root.fork(`p${String(i)}`));
      const agg = aggregateByDate(p, embargoMask(p));
      const a = nonOverlappingTest(p, agg, 0).p < 0.05;
      const bm = blockMeansTest(agg, 80);
      const b = bm !== null && bm.p < 0.05;
      if (a) nonOverlap += 1;
      if (b) batch += 1;
      if (a && b) both += 1;
      if (i < 300) {
        placeboRuns += 1;
        const r = shiftedPlacebo(p, root.fork(`s${String(i)}`), { shifts: 99, periods: [252] });
        if (r.p < 0.05) placebo += 1;
      }
    }
    expect(nonOverlap / n).toBeGreaterThanOrEqual(0.04);
    expect(nonOverlap / n).toBeLessThanOrEqual(0.06);
    expect(batch / n).toBeGreaterThanOrEqual(0.04);
    expect(batch / n).toBeLessThanOrEqual(0.06);
    expect(both / n).toBeLessThan(0.05); // the conjunction used for "Supported" is conservative
    // 300 panels: binomial 3-sigma band around 5% is 1.2% to 8.8%
    expect(placebo / placeboRuns).toBeGreaterThan(0.012);
    expect(placebo / placeboRuns).toBeLessThan(0.088);
  }, 120_000);
});

describe('positive control: planted effect', () => {
  const root = createRng('mde-v1');
  const base = syntheticPanel(OPTS, root.fork('base'));
  const settings = { alpha: 0.05, blockLength: 80, offset: 0, placeboShifts: 0, periods: [252] };

  it('finds an MDE and recovers it on an independent seed', () => {
    const found = findMde(base, root.fork('search'), {
      ...settings,
      sims: 100,
      targetPower: 0.8,
      bisections: 6,
    });
    expect(found.mde).not.toBeNull();
    const mde = found.mde ?? 0;
    expect(mde).toBeGreaterThan(0.01); // about 2% on a 20-day return
    expect(mde).toBeLessThan(0.04);
    const confirm = estimatePower(base, mde, root.fork('confirm'), { ...settings, sims: 400 });
    // target 80%; allow two binomial standard errors (2 x 2.0%) for Monte Carlo noise
    expect(confirm).toBeGreaterThanOrEqual(0.76);
  }, 120_000);

  it('detects nothing at zero effect and everything at double the MDE', () => {
    expect(
      estimatePower(base, 0, root.fork('zero'), { ...settings, sims: 300 }),
    ).toBeLessThanOrEqual(0.05);
    expect(
      estimatePower(base, 0.04, root.fork('big'), { ...settings, sims: 200 }),
    ).toBeGreaterThanOrEqual(0.95);
  }, 120_000);
});
