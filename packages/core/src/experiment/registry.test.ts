import { describe, expect, it } from 'vitest';
import { sha256Hex } from '../hash/sha256';
import {
  EMPTY_REGISTRY,
  RegistryError,
  canRun,
  freeze,
  preRegister,
  specHashOf,
  verifyRegistry,
} from './registry';
import type { AnchorProof, HypothesisSpec, TimeAnchorer } from './registry';
import { logVariant, multiplicityCount } from './variantLog';

const spec = (over: Partial<HypothesisSpec> = {}): HypothesisSpec => ({
  id: 'PH-12',
  title: 'Tara Bala of the stock',
  family: 'tara',
  statedNull: 'Returns after favourable Tara days equal returns after other days.',
  claimed: { effectSizePct: 0.5, direction: 'up', horizonSessions: 5 },
  params: { classes: 'good', lagSessions: 1 },
  ruleHash: sha256Hex('rule'),
  excludedInstruments: ['PILOT1'],
  ...over,
});

const honest: TimeAnchorer = {
  submit: (digest): Promise<AnchorProof> =>
    Promise.resolve({ provider: 'test', digest, submittedAt: 2000, proof: 'ab' }),
};

describe('pre-registration', () => {
  it('records a complete hypothesis with its hash on the chain', () => {
    const reg = preRegister(EMPTY_REGISTRY, spec(), 1000);
    expect(reg.registrations[0]?.specHash).toBe(specHashOf(spec()));
    expect(reg.events).toHaveLength(1);
    expect(verifyRegistry(reg)).toEqual({ ok: true });
  });

  it.each([
    ['no H/PH id', { id: 'X-1' }],
    ['no stated null', { statedNull: '  ' }],
    [
      'no claimed effect',
      { claimed: { effectSizePct: 0, direction: 'up' as const, horizonSessions: 5 } },
    ],
    ['no frozen parameters', { params: {} }],
    ['no rule hash', { ruleHash: 'abc' }],
  ])('refuses a hypothesis with %s', (_, over) => {
    expect(() => preRegister(EMPTY_REGISTRY, spec(over), 1)).toThrow(RegistryError);
  });

  it('refuses a repeated id: a change is a new id', () => {
    const reg = preRegister(EMPTY_REGISTRY, spec(), 1000);
    expect(() => preRegister(reg, spec({ title: 'changed' }), 1100)).toThrow(/already registered/);
  });
});

describe('freezing and running', () => {
  it('lets a frozen, unchanged rule run after the freeze, and no earlier', async () => {
    const reg = await freeze(preRegister(EMPTY_REGISTRY, spec(), 1000), 'PH-12', 1500, honest);
    expect(canRun(reg, spec(), 3000)).toEqual({ ok: true });
    expect(canRun(reg, spec(), 1500).ok).toBe(false);
    expect(verifyRegistry(reg)).toEqual({ ok: true });
  });

  it('refuses a rule that was never registered, never frozen, or changed after the freeze', async () => {
    const pre = preRegister(EMPTY_REGISTRY, spec(), 1000);
    expect(canRun(EMPTY_REGISTRY, spec(), 9)).toMatchObject({ ok: false });
    expect(canRun(pre, spec(), 9000)).toEqual({ ok: false, reason: 'PH-12 is not frozen' });
    const frozen = await freeze(pre, 'PH-12', 1500, honest);
    const tweaked = spec({ params: { classes: 'good', lagSessions: 2 } });
    expect(canRun(frozen, tweaked, 9000)).toEqual({
      ok: false,
      reason: 'PH-12 differs from what was frozen',
    });
  });

  it('stays unfrozen when the time service fails or stamps the wrong digest, and says why', async () => {
    const pre = preRegister(EMPTY_REGISTRY, spec(), 1000);
    const down: TimeAnchorer = { submit: () => Promise.reject(new Error('offline')) };
    const wrong: TimeAnchorer = {
      submit: () =>
        Promise.resolve({ provider: 't', digest: '0'.repeat(64), submittedAt: 1, proof: '' }),
    };
    const a = await freeze(pre, 'PH-12', 1500, down);
    expect(a.registrations[0]?.frozen).toBeNull();
    expect(a.registrations[0]?.freezeNote).toContain('offline');
    const b = await freeze(pre, 'PH-12', 1500, wrong);
    expect(b.registrations[0]?.freezeNote).toContain('different digest');
    expect(canRun(b, spec(), 9000).ok).toBe(false);
    expect(a.events).toHaveLength(2);
  });

  it('refuses a receipt that came after the run began', async () => {
    const slow: TimeAnchorer = {
      submit: (digest) => Promise.resolve({ provider: 't', digest, submittedAt: 8000, proof: '' }),
    };
    const reg = await freeze(preRegister(EMPTY_REGISTRY, spec(), 1000), 'PH-12', 1500, slow);
    expect(canRun(reg, spec(), 5000).ok).toBe(false);
  });

  it('detects an edited registration', async () => {
    const reg = await freeze(preRegister(EMPTY_REGISTRY, spec(), 1000), 'PH-12', 1500, honest);
    const forged = {
      ...reg,
      registrations: reg.registrations.map((r) => ({
        ...r,
        spec: { ...r.spec, claimed: { ...r.spec.claimed, effectSizePct: 0.1 } },
      })),
    };
    expect(verifyRegistry(forged)).toEqual({ ok: false, reason: 'PH-12 was altered' });
    const reordered = { ...reg, events: [...reg.events].reverse() };
    expect(verifyRegistry(reordered).ok).toBe(false);
  });
});

describe('multiplicity log', () => {
  const base = preRegister(
    preRegister(EMPTY_REGISTRY, spec(), 1000),
    spec({ id: 'PH-11', family: 'cs' }),
    1001,
  );

  it('counts every variant tried, pilot ones included, per family, and not synthetic placeholders', () => {
    let reg = base;
    reg = logVariant(
      reg,
      { hypothesisId: 'PH-12', label: 'lag 1', params: { lag: 1 }, pValue: 0.04 },
      1100,
    );
    reg = logVariant(
      reg,
      { hypothesisId: 'PH-12', label: 'lag 2', params: { lag: 2 }, pValue: 0.2 },
      1101,
    );
    reg = logVariant(
      reg,
      { hypothesisId: 'PH-12', label: 'pilot', params: { lag: 0 }, pilot: true },
      1102,
    );
    reg = logVariant(
      reg,
      { hypothesisId: 'PH-12', label: 'demo', params: { lag: 9 }, synthetic: true, pValue: 0.001 },
      1103,
    );
    reg = logVariant(reg, { hypothesisId: 'PH-11', label: 'other family', params: { x: 1 } }, 1104);
    expect(multiplicityCount(reg, 'tara')).toEqual({
      family: 'tara',
      m: 3,
      pilot: 1,
      synthetic: 1,
      pValues: [0.04, 0.2],
      withoutP: 1,
    });
    expect(multiplicityCount(reg, 'cs').m).toBe(1);
    expect(verifyRegistry(reg)).toEqual({ ok: true });
  });

  it('refuses a variant for an unregistered hypothesis or a bad p-value', () => {
    expect(() =>
      logVariant(base, { hypothesisId: 'PH-99', label: 'x', params: { a: 1 } }, 5000),
    ).toThrow(/not registered/);
    expect(() =>
      logVariant(base, { hypothesisId: 'PH-12', label: 'x', params: { a: 1 }, pValue: 1.5 }, 5000),
    ).toThrow(/p-value/);
  });
});
