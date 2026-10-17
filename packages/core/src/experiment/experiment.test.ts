import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import {
  aggregateByDate,
  allowedShiftList,
  autocorrelation,
  benjaminiHochberg,
  benjaminiYekutieli,
  blockMeansTest,
  dateDifferences,
  effectiveSampleSize,
  embargoMask,
  evaluateRule,
  isSharedSignal,
  logGamma,
  makePanel,
  nonOverlappingTest,
  plantEffect,
  regIncBeta,
  studentTTwoSidedP,
  syntheticPanel,
  tTestOfMean,
  welchTest,
  verdictOf,
} from './index';
import type { VerdictInput } from './index';

describe('distributions', () => {
  it('log-gamma matches factorials', () => {
    expect(Math.exp(logGamma(5))).toBeCloseTo(24, 9);
    expect(logGamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 12);
  });

  it('incomplete beta is symmetric and bounded', () => {
    expect(regIncBeta(0.5, 2, 2)).toBeCloseTo(0.5, 12);
    expect(regIncBeta(0.3, 2, 5) + regIncBeta(0.7, 5, 2)).toBeCloseTo(1, 12);
    expect(regIncBeta(0, 1, 1)).toBe(0);
    expect(regIncBeta(1, 1, 1)).toBe(1);
  });

  it('Student t p-values match published critical values', () => {
    expect(studentTTwoSidedP(2.228, 10)).toBeCloseTo(0.05, 3); // t(0.975, 10) = 2.2281
    expect(studentTTwoSidedP(1.96, 100000)).toBeCloseTo(0.05, 3);
    expect(studentTTwoSidedP(0, 7)).toBeCloseTo(1, 12);
    expect(studentTTwoSidedP(Infinity, 7)).toBe(0);
  });
});

describe('effective sample size (§11.3 step 1)', () => {
  it('equals N for white noise and shrinks for persistent series', () => {
    const rng = createRng('ess');
    const noise = Array.from({ length: 400 }, () => rng.nextFloat() - 0.5);
    expect(effectiveSampleSize(noise, 20).effectiveN).toBeGreaterThan(300);
    const walk = noise.map((_, i) =>
      noise
        .slice(0, i + 1)
        .slice(-15)
        .reduce((a, b) => a + b, 0),
    );
    const r = effectiveSampleSize(walk, 20);
    expect(r.rho1).toBeGreaterThan(0.8);
    expect(r.effectiveN).toBeLessThan(100);
    expect(r.rawN).toBe(400);
  });

  it('uses the Bartlett-weighted sum, truncated at the first non-positive lag (hand-worked)', () => {
    // x alternates in blocks so rho1 > 0; compute the expected value from the definition.
    const x = [1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2];
    const H = 4;
    let sum = 0;
    for (let k = 1; k <= H - 1; k += 1) {
      const rho = autocorrelation(x, k);
      if (rho <= 0) break;
      sum += (1 - k / H) * rho;
    }
    expect(effectiveSampleSize(x, H).effectiveN).toBeCloseTo(x.length / (1 + 2 * sum), 12);
  });

  it('handles constant and tiny series', () => {
    expect(effectiveSampleSize([2, 2, 2, 2], 3)).toEqual({ rawN: 4, rho1: 0, effectiveN: 4 });
    expect(effectiveSampleSize([], 3).effectiveN).toBe(0);
  });
});

describe('embargo and aggregation (§11.3 step 3)', () => {
  it('drops signal-off rows whose H-day window overlaps a signal-on window', () => {
    const p = makePanel(1, 20, 3);
    p.on[10] = 1;
    const use = embargoMask(p);
    const dropped = [8, 9, 11, 12];
    for (let t = 0; t < 20; t += 1) {
      const expected = dropped.includes(t) ? 0 : 1;
      expect(use[t]).toBe(expected);
    }
  });

  it('computes per-date differences with the date as the unit', () => {
    const p = makePanel(2, 4, 1);
    p.ret.set([0.1, 0.2, 0.3, 0.4, 0.0, 0.1, 0.1, 0.0]); // two instruments, four dates
    p.on.set([1, 0, 0, 0, 0, 1, 0, 0]);
    const agg = aggregateByDate(p, new Uint8Array(8).fill(1));
    // date 0: on = 0.1 (inst 0), off = 0.0 (inst 1) -> 0.1; date 1: on = 0.1 (inst 1), off = 0.2 -> -0.1
    expect(dateDifferences(agg, [0, 1, 2, 3])[0]).toBeCloseTo(0.1, 12);
    expect(dateDifferences(agg, [0, 1])[1]).toBeCloseTo(-0.1, 12);
  });
});

describe('tests of the difference', () => {
  it('one-sample t-test of a mean (hand-worked)', () => {
    const r = tTestOfMean([1, 2, 3, 4, 5]); // mean 3, sd sqrt(2.5), t = 3 / sqrt(2.5/5) = 4.2426, df 4
    expect(r.mean).toBe(3);
    expect(r.t).toBeCloseTo(3 / Math.sqrt(0.5), 12);
    expect(r.p).toBeCloseTo(0.01324, 4);
    expect(tTestOfMean([0, 0, 0])).toEqual({ t: 0, p: 1, mean: 0 });
    expect(tTestOfMean([2, 2, 2]).p).toBe(0);
  });

  it('non-overlapping test keeps one date in every H and counts them', () => {
    const p = syntheticPanel(
      {
        instruments: 6,
        dates: 400,
        horizon: 20,
        dailyVol: 0.01,
        marketVol: 0.01,
        startProbability: 0.0125,
        episodeLength: 20,
      },
      createRng('no'),
    );
    const r = nonOverlappingTest(p, aggregateByDate(p, embargoMask(p)), 3);
    expect(r.design).toBe('paired');
    expect(r.n).toBeLessThanOrEqual(20);
    expect(r.n).toBeGreaterThan(10);
  });

  it('batch-means test needs enough blocks and a populated comparison', () => {
    const p = makePanel(1, 30, 5);
    expect(blockMeansTest(aggregateByDate(p, embargoMask(p)), 20)).toBeNull();
  });
});

describe('market-wide signals', () => {
  const opts = {
    instruments: 12,
    dates: 800,
    horizon: 20,
    dailyVol: 0.02,
    marketVol: 0.01,
    startProbability: 0.0125,
    episodeLength: 20,
    sharedSignal: true,
  };

  it('every instrument shares one pattern, so there is no within-date contrast', () => {
    const p = syntheticPanel(opts, createRng('shared'));
    expect(isSharedSignal(p)).toBe(true);
    const agg = aggregateByDate(p, embargoMask(p));
    expect(
      dateDifferences(
        agg,
        Array.from({ length: p.dates }, (_, t) => t),
      ),
    ).toHaveLength(0);
    const independent = syntheticPanel({ ...opts, sharedSignal: false }, createRng('shared'));
    expect(isSharedSignal(independent)).toBe(false);
  });

  it('falls back to Welch across dates and keeps the shared pattern when an effect is planted', () => {
    const p = syntheticPanel(opts, createRng('shared'));
    const r = nonOverlappingTest(p, aggregateByDate(p, embargoMask(p)), 0);
    expect(r.design).toBe('across-dates');
    expect(r.n).toBeGreaterThan(5);
    const planted = plantEffect(p, 0.05, createRng('plant-shared'));
    expect(isSharedSignal(planted)).toBe(true);
  });

  it('Welch test matches a hand-worked case', () => {
    // a: mean 3, var 2.5; b: mean 5, var 2.5; n = 5 each -> se^2 = 1, t = -2, df = 8
    const r = welchTest([1, 2, 3, 4, 5], [3, 4, 5, 6, 7]);
    expect(r.diff).toBe(-2);
    expect(r.t).toBeCloseTo(-2, 12);
    expect(r.p).toBeCloseTo(0.0805, 3);
  });
});

describe('placebo shifts (§11.3 step 5)', () => {
  it('excludes shifts within +-H of any multiple of the period', () => {
    const allowed = allowedShiftList(100, 3, [10]);
    expect(allowed.every((k) => k % 10 >= 4 && k % 10 <= 6)).toBe(true);
    expect(allowed.slice(0, 4)).toEqual([4, 5, 6, 14]);
  });

  it('applies every period it is given', () => {
    const one = allowedShiftList(300, 3, [100]);
    const two = allowedShiftList(300, 3, [100, 27]);
    expect(two.length).toBeLessThan(one.length);
    expect(allowedShiftList(50, 3, [])).toHaveLength(49);
  });
});

describe('positive control', () => {
  it('plants the effect on the shifted signal and preserves its run structure', () => {
    const base = syntheticPanel(
      {
        instruments: 3,
        dates: 300,
        horizon: 10,
        dailyVol: 0.01,
        marketVol: 0.005,
        startProbability: 0.02,
        episodeLength: 10,
      },
      createRng('pc'),
    );
    const planted = plantEffect(base, 0.05, createRng('plant'));
    expect(planted.on.reduce((a, b) => a + b, 0)).toBe(base.on.reduce((a, b) => a + b, 0));
    let added = 0;
    for (let k = 0; k < base.ret.length; k += 1)
      added += (planted.ret[k] as number) - (base.ret[k] as number);
    expect(added).toBeCloseTo(0.05 * base.on.reduce((a, b) => a + b, 0), 9);
  });
});

describe('multiplicity (§11.3 step 7)', () => {
  it('Benjamini-Hochberg adjusted p-values (hand-worked)', () => {
    const r = benjaminiHochberg([0.01, 0.04, 0.03, 0.005], 0.05);
    expect(r.adjusted[0]).toBeCloseTo(0.02, 12);
    expect(r.adjusted[1]).toBeCloseTo(0.04, 12);
    expect(r.adjusted[2]).toBeCloseTo(0.04, 12);
    expect(r.adjusted[3]).toBeCloseTo(0.02, 12);
    expect(r.rejected).toEqual([true, true, true, true]);
  });

  it('is stricter when many tests are tried', () => {
    const many = benjaminiHochberg([0.01, ...Array.from({ length: 19 }, () => 0.9)], 0.05);
    expect(many.rejected[0]).toBe(false); // 0.01 x 20 = 0.20
    const by = benjaminiYekutieli([0.001, 0.2], 0.05);
    expect(by.adjusted[0]).toBeCloseTo(0.001 * 2 * 1.5, 12);
  });
});

describe('verdict labels (§11.3 step 8)', () => {
  const base: VerdictInput = {
    nonOverlapN: 25,
    passesNonOverlap: true,
    passesBootstrap: true,
    passesPlacebo: true,
    passesMultiplicity: true,
    beatsCalendarControl: null,
    mde: 0.02,
    claimedEffect: 0.03,
    positiveControlOk: true,
  };

  it.each([
    ['all pass', {}, 'Supported'],
    [
      'a failed test with a strong test of the claim',
      { passesPlacebo: false },
      'Not supported (adequately powered)',
    ],
    [
      'a failed test but MDE above the claim',
      { passesPlacebo: false, mde: 0.05 },
      'Inconclusive (underpowered)',
    ],
    [
      'a failed test and no MDE',
      { passesPlacebo: false, mde: null },
      'Inconclusive (underpowered)',
    ],
    ['too few non-overlapping dates', { nonOverlapN: 9 }, 'No verdict'],
    ['positive control failed', { positiveControlOk: false }, 'No verdict'],
    ['no claimed effect registered', { claimedEffect: null }, 'No verdict'],
    [
      'solar-ingress style rule that fails to beat the calendar control',
      { beatsCalendarControl: false },
      'Not supported (adequately powered)',
    ],
  ] as const)('%s', (_name, over, expected) => {
    expect(verdictOf({ ...base, ...over })).toBe(expected);
  });
});

describe('evaluateRule', () => {
  const opts = {
    instruments: 8,
    dates: 600,
    horizon: 20,
    dailyVol: 0.01,
    marketVol: 0.01,
    startProbability: 0.0125,
    episodeLength: 20,
  };
  const cfg = { offset: 0, replicates: 200, placeboShifts: 50, periods: [252] };

  it('reports every step and is bit-identical for a fixed seed', () => {
    const panel = syntheticPanel(opts, createRng('eval-data'));
    const a = evaluateRule(panel, cfg, createRng('eval-seed'));
    const b = evaluateRule(panel, cfg, createRng('eval-seed'));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.rawNOn).toBeGreaterThan(0);
    expect(a.rawNOff).toBeGreaterThan(0);
    expect(a.embargoDropped).toBeGreaterThan(0);
    expect(a.ess.effectiveN).toBeLessThan(a.ess.rawN);
    expect(a.bootstrap?.lo).toBeLessThan(a.bootstrap?.hi ?? 0);
    expect(a.blockMeans?.blocks).toBe(7); // floor(600 / 80)
    expect(a.placebo.shiftsUsed).toBe(50);
  });

  it('gives different resampling numbers for a different seed but the same deterministic tests', () => {
    const panel = syntheticPanel(opts, createRng('eval-data'));
    const a = evaluateRule(panel, cfg, createRng('s1'));
    const b = evaluateRule(panel, cfg, createRng('s2'));
    expect(a.nonOverlap).toEqual(b.nonOverlap);
    expect(a.blockMeans).toEqual(b.blockMeans);
    expect(a.bootstrap?.p).not.toBe(b.bootstrap?.p);
  });
});
