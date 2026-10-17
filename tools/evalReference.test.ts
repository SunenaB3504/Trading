/** WP-0.6 acceptance (c): the TypeScript harness reproduces the independent Python/scipy reference. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  aggregateByDate,
  allowedShiftList,
  benjaminiHochberg,
  benjaminiYekutieli,
  blockMeansTest,
  effectiveSampleSize,
  embargoMask,
  nonOverlappingTest,
  onReturnSeries,
  regIncBeta,
  studentTTwoSidedP,
} from '../packages/core/src/experiment';
import type { Panel } from '../packages/core/src/experiment';

const read = <T>(file: string): T =>
  JSON.parse(readFileSync(join(process.cwd(), 'fixtures/eval', file), 'utf8')) as T;

interface PanelFile {
  instruments: number;
  dates: number;
  horizon: number;
  ret: number[];
  on: number[];
}
interface Expected {
  embargoKept: number;
  rawNOn: number;
  ess: { rawN: number; rho1: number; effectiveN: number };
  nonOverlap0: { n: number; meanDiff: number; t: number; p: number };
  nonOverlap3: { n: number; meanDiff: number; t: number; p: number };
  blockMeans20: { difference: number; se: number; t: number; p: number; blocks: number };
  bh: number[];
  by: number[];
  allowedShifts: number[];
  studentP: Array<{ t: number; df: number; p: number }>;
  incBeta: Array<{ x: number; a: number; b: number; v: number }>;
  pvalues: number[];
}

const file = read<PanelFile>('panel_small.json');
const expected = read<Expected>('reference_expected.json');
const panel: Panel = {
  instruments: file.instruments,
  dates: file.dates,
  horizon: file.horizon,
  ret: Float64Array.from(file.ret),
  on: Uint8Array.from(file.on),
};
const use = embargoMask(panel);
const agg = aggregateByDate(panel, use);
const close = (a: number, b: number): void => expect(Math.abs(a - b)).toBeLessThan(1e-9);

describe('TypeScript harness vs the Python/scipy reference (fixed 4 x 120 panel, H = 10)', () => {
  it('embargo and counts', () => {
    expect(use.reduce((n, v) => n + v, 0)).toBe(expected.embargoKept);
    expect(panel.on.reduce((n, v) => n + v, 0)).toBe(expected.rawNOn);
  });

  it('effective sample size and lag-1 autocorrelation', () => {
    const e = effectiveSampleSize(onReturnSeries(agg), panel.horizon);
    expect(e.rawN).toBe(expected.ess.rawN);
    close(e.rho1, expected.ess.rho1);
    close(e.effectiveN, expected.ess.effectiveN);
  });

  it.each([
    ['nonOverlap0', 0],
    ['nonOverlap3', 3],
  ] as const)('non-overlapping test, offset %s', (key, offset) => {
    const r = nonOverlappingTest(panel, agg, offset);
    const want = expected[key];
    expect(r.n).toBe(want.n);
    close(r.meanDiff, want.meanDiff);
    close(r.t, want.t);
    close(r.p, want.p);
  });

  it('batch-means test', () => {
    const r = blockMeansTest(agg, 20);
    const want = expected.blockMeans20;
    expect(r?.blocks).toBe(want.blocks);
    close(r?.difference ?? NaN, want.difference);
    close(r?.se ?? NaN, want.se);
    close(r?.t ?? NaN, want.t);
    close(r?.p ?? NaN, want.p);
  });

  it('Benjamini-Hochberg and Benjamini-Yekutieli adjusted p-values', () => {
    benjaminiHochberg(expected.pvalues).adjusted.forEach((v, i) => close(v, expected.bh[i] ?? NaN));
    benjaminiYekutieli(expected.pvalues).adjusted.forEach((v, i) =>
      close(v, expected.by[i] ?? NaN),
    );
  });

  it('allowed placebo shifts with two periods', () => {
    expect(allowedShiftList(panel.dates, panel.horizon, [37, 50])).toEqual(expected.allowedShifts);
  });

  it('Student t p-values and the incomplete beta function', () => {
    for (const c of expected.studentP) close(studentTTwoSidedP(c.t, c.df), c.p);
    for (const c of expected.incBeta) close(regIncBeta(c.x, c.a, c.b), c.v);
  });
});
