import { describe, expect, it } from 'vitest';
import { EMPTY_REGISTRY, freeze, preRegister } from '../experiment/registry';
import type { AnchorProof, HypothesisSpec, Registry, TimeAnchorer } from '../experiment/registry';
import { canonicalJson } from '../hash/canonicalJson';
import { sha256Hex } from '../hash/sha256';
import type { Candidate, Overlay, OverlayContext } from './contract';
import { evaluateOverlay } from './sandbox';

const RULE = sha256Hex('rule');
const spec: HypothesisSpec = {
  id: 'PH-12',
  title: 'Tara Bala',
  family: 'tara',
  statedNull: 'No difference.',
  claimed: { effectSizePct: 0.5, direction: 'up', horizonSessions: 5 },
  params: { lag: 1 },
  ruleHash: RULE,
  excludedInstruments: [],
};
const anchorer: TimeAnchorer = {
  submit: (digest): Promise<AnchorProof> =>
    Promise.resolve({ provider: 't', digest, submittedAt: 2000, proof: '' }),
};
const candidate: Candidate = { instrumentId: 'AAA', date: '2026-03-02', side: 'buy', quantity: 10 };
const context: OverlayContext = { features: { taraClass: 'Mitra', score: 3 }, decidedAt: 5000 };

const make = (evaluate: Overlay['evaluate'], over: Partial<Overlay> = {}): Overlay => ({
  id: 'o',
  version: 1,
  hypothesisId: 'PH-12',
  ruleHash: RULE,
  evaluate,
  ...over,
});

async function frozen(): Promise<Registry> {
  return freeze(preRegister(EMPTY_REGISTRY, spec, 1000), 'PH-12', 1500, anchorer);
}
const run = (reg: Registry, o: Overlay, opts = {}) =>
  evaluateOverlay(reg, spec, o, candidate, context, 3000, opts);

describe('the sandboxed evaluator', () => {
  it('returns the answer with a features hash it computed itself', async () => {
    const reg = await frozen();
    const out = run(
      reg,
      make(() => ({ decision: 'allow', reasonCode: 'ok', stateCode: 'GREEN' })),
    );
    expect(out).toEqual({
      ok: true,
      result: {
        decision: 'allow',
        reasonCode: 'ok',
        stateCode: 'GREEN',
        featuresHash: sha256Hex(canonicalJson(context.features)),
      },
    });
  });

  it('refuses an overlay whose hypothesis is not frozen, or that differs from the frozen rule', async () => {
    const pre = preRegister(EMPTY_REGISTRY, spec, 1000);
    const ok = make(() => ({ decision: 'allow', reasonCode: 'ok' }));
    expect(run(pre, ok)).toEqual({ ok: false, reason: 'PH-12 is not frozen' });
    const reg = await frozen();
    expect(run(reg, make(ok.evaluate, { ruleHash: sha256Hex('other') })).ok).toBe(false);
    expect(run(reg, make(ok.evaluate, { hypothesisId: 'PH-11' })).ok).toBe(false);
  });

  it('fails, rather than allowing or denying, when the overlay throws or answers late', async () => {
    const reg = await frozen();
    const boom = run(
      reg,
      make(() => {
        throw new Error('bad');
      }),
    );
    expect(boom).toEqual({ ok: false, reason: 'the overlay failed: bad' });
    const late = run(
      reg,
      make((() => Promise.resolve({ decision: 'allow', reasonCode: 'x' })) as never),
    );
    expect(late.ok).toBe(false);
  });

  it('fails when the overlay changes its inputs or gives different answers to the same inputs', async () => {
    const reg = await frozen();
    const mutate = run(
      reg,
      make((c) => {
        (c as { quantity: number }).quantity = 99;
        return { decision: 'allow', reasonCode: 'x' };
      }),
    );
    expect(mutate.ok).toBe(false);
    let n = 0;
    const flaky = run(
      reg,
      make(() => ({ decision: 'allow', reasonCode: `r${String(n++)}` })),
    );
    expect(flaky).toEqual({
      ok: false,
      reason: 'the overlay gave two different answers to the same inputs',
    });
  });

  it('rejects malformed answers and resizes outside the limit', async () => {
    const reg = await frozen();
    expect(
      run(
        reg,
        make(() => ({ decision: 'allow', reasonCode: ' ' })),
      ).ok,
    ).toBe(false);
    expect(
      run(
        reg,
        make(() => ({ decision: 'maybe', reasonCode: 'x' }) as never),
      ).ok,
    ).toBe(false);
    expect(
      run(
        reg,
        make(() => ({ decision: 'resize', reasonCode: 'x' })),
      ).ok,
    ).toBe(false);
    expect(
      run(
        reg,
        make(() => ({ decision: 'resize', reasonCode: 'x', sizeMultiplier: 2 })),
      ).ok,
    ).toBe(false);
    expect(
      run(
        reg,
        make(() => ({ decision: 'resize', reasonCode: 'x', sizeMultiplier: 2 })),
        { maxSizeMultiplier: 2 },
      ).ok,
    ).toBe(true);
    expect(
      run(
        reg,
        make(() => ({ decision: 'allow', reasonCode: 'x', sizeMultiplier: 0.5 })),
      ).ok,
    ).toBe(false);
    expect(
      run(
        reg,
        make(() => ({ decision: 'resize', reasonCode: 'x', sizeMultiplier: 0.5 })),
      ).ok,
    ).toBe(true);
  });
});
