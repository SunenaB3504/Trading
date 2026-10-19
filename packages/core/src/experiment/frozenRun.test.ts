import { describe, expect, it } from 'vitest';
import type { Candidate, Overlay, OverlayContext } from '../overlay';
import { createRng } from '../random';
import { sha256Hex } from '../hash/sha256';
import type { ArmGrid } from './arms';
import { runFrozenEvaluation } from './frozenRun';
import type { FrozenRunConfig } from './frozenRun';
import { makePanel } from './panel';
import { EMPTY_REGISTRY, freeze, preRegister } from './registry';
import type { HypothesisSpec, Registry } from './registry';
import { logVariant } from './variantLog';

const N = 8;
const T = 500;
const H = 5;
const RULE = sha256Hex('rule');
const spec: HypothesisSpec = {
  id: 'PH-12',
  title: 't',
  family: 'f',
  statedNull: 'none',
  claimed: { effectSizePct: 40, direction: 'up', horizonSessions: H },
  params: { a: 1 },
  ruleHash: RULE,
  excludedInstruments: [],
};
const overlay: Overlay = {
  id: 'o',
  version: 1,
  hypothesisId: 'PH-12',
  ruleHash: RULE,
  evaluate: (_c, x) =>
    x.features.on === 1
      ? { decision: 'allow', reasonCode: 'on' }
      : { decision: 'deny', reasonCode: 'off' },
};
const anchor = {
  submit: (digest: string) =>
    Promise.resolve({ provider: 't', digest, submittedAt: 2000, proof: '' }),
};

/** Returns are noise (sd about 0.58 percent points); allowed rows get `effect` added. */
function grid(effect: number, seed: string): ArmGrid {
  const rng = createRng(seed);
  const panel = makePanel(N, T, H);
  const candidates: Candidate[] = [];
  const contexts: OverlayContext[] = [];
  for (let i = 0; i < N; i += 1) {
    for (let t = 0; t < T; t += 1) {
      const start = Math.floor(t / 25) * 25 + ((Math.floor(t / 25) * 7 + 3 + i * 5) % 15);
      const on = t >= start && t < start + 5 ? 1 : 0;
      panel.ret[i * T + t] = (rng.nextFloat() - 0.5) * 2 + (on === 1 ? effect : 0);
      candidates.push({
        instrumentId: `I${String(i)}`,
        date: `d${String(t)}`,
        side: 'buy',
        quantity: 1,
      });
      contexts.push({ features: { on }, decidedAt: 1 });
    }
  }
  return { panel, candidates, contexts };
}

const cfg = (seed: string): FrozenRunConfig => ({
  seed,
  runStartsAt: 3000,
  eval: { offset: 0, replicates: 200, placeboShifts: 99, periods: [252] },
  control: {
    sims: 30,
    alpha: 0.05,
    blockLength: 4 * H,
    offset: 0,
    placeboShifts: 0,
    periods: [252],
    targetPower: 0.8,
    bisections: 4,
  },
  matchedDraws: 100,
  calendarMask: null,
  returnUnit: 'percent',
  recoveryTolerance: 0.15,
  loggedAt: 2500,
});

async function frozen(): Promise<Registry> {
  return freeze(preRegister(EMPTY_REGISTRY, spec, 1000), 'PH-12', 1500, anchor);
}

describe('the first frozen run', () => {
  it('refuses to run an unfrozen hypothesis', () => {
    const pre = preRegister(EMPTY_REGISTRY, spec, 1000);
    const r = runFrozenEvaluation(pre, spec, overlay, grid(0, 'g'), cfg('s'));
    expect(r).toEqual({ ok: false, reason: 'row 0: PH-12 is not frozen' });
  });

  it('reports every step and labels a planted effect Supported', async () => {
    const r = runFrozenEvaluation(await frozen(), spec, overlay, grid(1.5, 'plant'), cfg('s1'));
    if (!r.ok) throw new Error(r.reason);
    const rep = r.report;
    expect(rep.arms.A.meanReturn).toBeGreaterThan(rep.arms.B0.meanReturn);
    expect(rep.arms.B1.p).toBeLessThan(0.05);
    expect(rep.evaluation.nonOverlap.p).toBeLessThan(0.05);
    expect(rep.positiveControl.mde).not.toBeNull();
    expect(rep.multiplicity.m).toBe(1);
    expect(rep.verdict).toBe('Supported');
    expect(r.registry.variants).toHaveLength(1);
  }, 120_000);

  it('does not label a null result Supported', async () => {
    const r = runFrozenEvaluation(await frozen(), spec, overlay, grid(0, 'null'), cfg('s2'));
    if (!r.ok) throw new Error(r.reason);
    expect(r.report.verdict).toBe('Not supported (adequately powered)');
    expect(r.report.positiveControl.mde).toBeLessThan(r.report.claimedEffect ?? 0);
  }, 120_000);

  it('gives the same report hash for the same seed and a different one for another seed', async () => {
    const reg = await frozen();
    const g = grid(0.6, 'x');
    const hash = (seed: string) => {
      const r = runFrozenEvaluation(reg, spec, overlay, g, cfg(seed));
      if (!r.ok) throw new Error(r.reason);
      return r.report.reportHash;
    };
    expect(hash('same')).toBe(hash('same'));
    expect(hash('same')).not.toBe(hash('other'));
  }, 120_000);

  it('counts earlier and pilot variants in M, which raises the adjusted p-value', async () => {
    const reg0 = await frozen();
    const g = grid(1.5, 'plant');
    let reg = reg0;
    for (let k = 0; k < 9; k += 1)
      reg = logVariant(
        reg,
        { hypothesisId: 'PH-12', label: `pilot ${String(k)}`, params: { k }, pilot: true },
        1600,
      );
    const base = runFrozenEvaluation(reg0, spec, overlay, g, cfg('s1'));
    const many = runFrozenEvaluation(reg, spec, overlay, g, cfg('s1'));
    if (!base.ok || !many.ok) throw new Error('run failed');
    expect(many.report.multiplicity.m).toBe(10);
    expect(many.report.multiplicity.pilot).toBe(9);
    expect(many.report.multiplicity.adjustedP).toBeGreaterThan(base.report.multiplicity.adjustedP);
  }, 120_000);
});
