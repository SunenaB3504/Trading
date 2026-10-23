import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { makePanel } from './panel';
import { relabelPlacebo } from './placebo';

describe('the relabelling placebo', () => {
  it('finds a real company effect rare and a no-effect label ordinary', () => {
    const n = 20;
    const dates = 60;
    const build = (effect: number) => {
      const p = makePanel(n, dates, 5);
      const rng = createRng('relabel-test');
      for (let i = 0; i < n; i += 1)
        for (let t = 0; t < dates; t += 1) {
          const k = i * dates + t;
          const on = i < 10 ? 1 : 0;
          p.on[k] = on;
          p.ret[k] = (rng.nextFloat() - 0.5) * 0.02 + (on === 1 ? effect : 0);
        }
      return p;
    };
    const real = relabelPlacebo(build(0.03), createRng('a'), 200);
    expect(real.p).toBeLessThan(0.05);
    const none = relabelPlacebo(build(0), createRng('b'), 200);
    expect(none.p).toBeGreaterThan(0.05);
  });
});
