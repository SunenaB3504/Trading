import { describe, expect, it } from 'vitest';
import { EMPTY_REGISTRY, freeze, preRegister } from '../experiment/registry';
import type { StateCode } from './contract';
import { evaluateOverlay } from './sandbox';
import {
  STATES,
  decisionTable,
  routeStates,
  routerOverlay,
  routerRuleHash,
  routerSpec,
} from './router';
import type { RouterConfig } from './router';

const choose = (n: number, k: number): number => {
  let r = 1;
  for (let i = 1; i <= k; i += 1) r = (r * (n - k + i)) / i;
  return r;
};

describe('the decision table', () => {
  it.each([1, 2, 3, 4])('covers every combination of %i inputs exactly once', (n) => {
    const rows = decisionTable(n);
    expect(rows).toHaveLength(choose(n + 4, 4));
    expect(new Set(rows.map((r) => r.counts.join(','))).size).toBe(rows.length);
    expect(rows.every((r) => r.counts.reduce((a, b) => a + b, 0) === n)).toBe(true);
  });

  it('gives every ordered input the output its table row says, whatever the order', () => {
    const n = 3;
    const rows = new Map(decisionTable(n).map((r) => [r.counts.join(','), r.output]));
    const walk = (acc: StateCode[]): void => {
      if (acc.length === n) {
        const key = STATES.map((s) => acc.filter((x) => x === s).length).join(',');
        expect(routeStates(acc)).toBe(rows.get(key));
        return;
      }
      for (const s of STATES) walk([...acc, s]);
    };
    walk([]);
  });

  it('applies the stated precedence to ties', () => {
    expect(routeStates(['GREEN', 'RED'])).toBe('RED');
    expect(routeStates(['GREEN', 'YELLOW'])).toBe('YELLOW');
    expect(routeStates(['RED', 'YELLOW'])).toBe('RED');
    expect(routeStates(['GREEN', 'GRAY-NOSIGNAL'])).toBe('GREEN');
    expect(routeStates(['GRAY-NOSIGNAL', 'GRAY-NOSIGNAL'])).toBe('GRAY-NOSIGNAL');
    expect(routeStates(['RED', 'GREEN', 'GRAY-NODATA'])).toBe('GRAY-NODATA');
  });

  it('refuses no inputs and more than eight', () => {
    expect(() => routeStates([])).toThrow(RangeError);
    expect(() => decisionTable(0)).toThrow(RangeError);
    expect(() => decisionTable(9)).toThrow(RangeError);
  });
});

describe('the router as an overlay', () => {
  const cfg: RouterConfig = {
    id: 'router',
    version: 1,
    hypothesisId: 'PH-10',
    signals: [
      { featureKey: 'a', hypothesisId: 'PH-01' },
      { featureKey: 'b', hypothesisId: 'PH-02' },
    ],
    yellowSize: 0.5,
  };
  const claim = { effectSizePct: 0.4, horizonSessions: 20, excludedInstruments: [] };
  const anchor = {
    submit: (digest: string) =>
      Promise.resolve({ provider: 't', digest, submittedAt: 2000, proof: '' }),
  };
  const candidate = { instrumentId: 'X', date: 'd', side: 'buy' as const, quantity: 4 };

  it('is refused unless every signal it combines is already Supported', () => {
    expect(() => routerSpec(cfg, claim, ['PH-01'])).toThrow(/PH-02/);
    expect(() => routerSpec({ ...cfg, signals: [] }, claim, [])).toThrow();
    expect(routerSpec(cfg, claim, ['PH-01', 'PH-02']).ruleHash).toBe(routerRuleHash(cfg));
  });

  it('allows on green, resizes on yellow, denies on red, and treats a missing state as no data', async () => {
    const spec = routerSpec(cfg, claim, ['PH-01', 'PH-02']);
    const reg = await freeze(preRegister(EMPTY_REGISTRY, spec, 1000), 'PH-10', 1500, anchor);
    const overlay = routerOverlay(cfg);
    const ask = (features: Record<string, string | null>) =>
      evaluateOverlay(reg, spec, overlay, candidate, { features, decidedAt: 1 }, 3000);
    const r = (o: ReturnType<typeof ask>) => (o.ok ? o.result : o.reason);
    expect(r(ask({ a: 'GREEN', b: 'GRAY-NOSIGNAL' }))).toMatchObject({
      decision: 'allow',
      stateCode: 'GREEN',
    });
    expect(r(ask({ a: 'GREEN', b: 'YELLOW' }))).toMatchObject({
      decision: 'resize',
      sizeMultiplier: 0.5,
    });
    expect(r(ask({ a: 'GREEN', b: 'RED' }))).toMatchObject({
      decision: 'deny',
      reasonCode: 'ROUTER-RED',
    });
    expect(r(ask({ a: 'GREEN' }))).toMatchObject({
      decision: 'allow',
      reasonCode: 'ROUTER-GRAY-NODATA',
    });
    expect(r(ask({ a: 'maybe', b: 'GREEN' }))).toMatchObject({ stateCode: 'GRAY-NODATA' });
  });

  it('changes its frozen hash when anything in it changes', () => {
    expect(routerRuleHash({ ...cfg, yellowSize: 0.6 })).not.toBe(routerRuleHash(cfg));
    expect(
      routerRuleHash({ ...cfg, signals: [cfg.signals[0] as RouterConfig['signals'][0]] }),
    ).not.toBe(routerRuleHash(cfg));
  });

  it('refuses a yellow size outside (0, 1]', () => {
    expect(() => routerOverlay({ ...cfg, yellowSize: 0 })).toThrow(RangeError);
    expect(() => routerOverlay({ ...cfg, yellowSize: 1.5 })).toThrow(RangeError);
  });
});
