import { describe, expect, it } from 'vitest';
import { createRng } from '../random';
import { baselineArm, matchedRandomArm } from './arms';
import { evaluateRule } from './evaluate';
import { embargoMask } from './panel';
import type { Panel } from './panel';
import { syntheticPanel } from './synthetic';

/** Cells with no usable return (not trading, disputed day) must be invisible to every step. */
const base = (): Panel =>
  syntheticPanel(
    {
      instruments: 6,
      dates: 160,
      horizon: 10,
      dailyVol: 0.02,
      marketVol: 0.01,
      startProbability: 0.08,
      episodeLength: 10,
    },
    createRng('valid-mask'),
  );

const cfg = { offset: 0, replicates: 50, placeboShifts: 30, periods: [] as number[] };

/** The last 40 dates of the last two instruments have no usable return. */
function withHoles(p: Panel, garbage: number): Panel {
  const valid = new Uint8Array(p.ret.length).fill(1);
  const ret = Float64Array.from(p.ret);
  for (const i of [4, 5])
    for (let t = 120; t < p.dates; t += 1) {
      valid[i * p.dates + t] = 0;
      ret[i * p.dates + t] = garbage;
    }
  return { ...p, valid, ret };
}

describe('panel cells without a usable return', () => {
  it('give the same report when every cell is valid as when no mask is given', () => {
    const p = base();
    const allValid = { ...p, valid: new Uint8Array(p.ret.length).fill(1) };
    const a = evaluateRule(p, cfg, createRng('r'));
    const b = evaluateRule(allValid, cfg, createRng('r'));
    expect(b).toEqual(a);
  });

  it('are ignored whatever value sits in them', () => {
    const p = base();
    const a = evaluateRule(withHoles(p, 0), cfg, createRng('r'));
    const b = evaluateRule(withHoles(p, 9), cfg, createRng('r'));
    expect(b).toEqual(a);
  });

  it('are left out of the usable rows even when the signal is on there', () => {
    const p = withHoles(base(), 0);
    p.on.fill(1);
    const use = embargoMask(p);
    for (const i of [4, 5]) expect(use[i * p.dates + 130]).toBe(0);
    expect(use[0]).toBe(1);
  });

  it('do not count in the baseline arm or in the random draws of the matched arm', () => {
    const p = withHoles(base(), 1000);
    expect(baselineArm(p).n).toBe(p.ret.length - 2 * 40);
    expect(baselineArm(p).meanReturn).toBeLessThan(1);
    const mask = new Uint8Array(p.ret.length);
    for (let t = 0; t < 30; t += 1) mask[4 * p.dates + t] = 1;
    const r = matchedRandomArm(p, mask, createRng('b1'), 20);
    expect(Math.max(...r.drawMeans)).toBeLessThan(1);
  });
});
