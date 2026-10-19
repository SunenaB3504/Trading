import { describe, expect, it } from 'vitest';
import type { Candidate, Overlay, OverlayContext } from '../overlay';
import { createRng } from '../random';
import { sha256Hex } from '../hash/sha256';
import {
  baselineArm,
  calendarControlArm,
  matchedRandomArm,
  overlayRun,
  shuffledEphemerisArm,
  summarise,
} from './arms';
import type { ArmGrid } from './arms';
import { makePanel } from './panel';
import { EMPTY_REGISTRY, freeze, preRegister } from './registry';
import type { HypothesisSpec, Registry } from './registry';
import { drawBirth, syntheticBuyerNull } from './syntheticBuyers';

const INSTRUMENTS = 6;
const DATES = 400;
const H = 5;
const RULE = sha256Hex('rule');
const spec: HypothesisSpec = {
  id: 'PH-12',
  title: 't',
  family: 'f',
  statedNull: 'none',
  claimed: { effectSizePct: 1, direction: 'up', horizonSessions: H },
  params: { a: 1 },
  ruleHash: RULE,
  excludedInstruments: [],
};
const anchor = {
  submit: (digest: string) =>
    Promise.resolve({ provider: 't', digest, submittedAt: 2000, proof: '' }),
};

/** Returns are noise; rows where `flag` is 1 get `effect` added. */
function grid(effect: number, seed: string): { g: ArmGrid; flag: Uint8Array } {
  const rng = createRng(seed);
  const panel = makePanel(INSTRUMENTS, DATES, H);
  const flag = new Uint8Array(INSTRUMENTS * DATES);
  const candidates: Candidate[] = [];
  const contexts: OverlayContext[] = [];
  for (let i = 0; i < INSTRUMENTS; i += 1) {
    for (let t = 0; t < DATES; t += 1) {
      const k = i * DATES + t;
      const start = Math.floor(t / 20) * 20 + ((Math.floor(t / 20) * 7 + 3 + i * 5) % 12);
      const on = t >= start && t < start + 4 ? 1 : 0; // short bursts at irregular places
      flag[k] = on;
      panel.ret[k] = (rng.nextFloat() - 0.5) * 2 + (on === 1 ? effect : 0);
      candidates.push({
        instrumentId: `I${String(i)}`,
        date: `d${String(t)}`,
        side: 'buy',
        quantity: 1,
      });
      contexts.push({ features: { on }, decidedAt: 1 });
    }
  }
  return { g: { panel, candidates, contexts }, flag };
}

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

async function frozen(): Promise<Registry> {
  return freeze(preRegister(EMPTY_REGISTRY, spec, 1000), 'PH-12', 1500, anchor);
}

describe('arm A: the frozen overlay over every candidate', () => {
  it('allows and denies row by row and keeps the counts', async () => {
    const { g, flag } = grid(0, 'a');
    const run = overlayRun(await frozen(), spec, overlay, g, 3000);
    if (!run.ok) throw new Error(run.reason);
    expect([...run.mask]).toEqual([...flag]);
    expect(run.denied).toBe(flag.filter((v) => v === 0).length);
    expect(run.resized).toBe(0);
  });

  it('fails the whole run, naming the row, when the overlay is not frozen or one row fails', async () => {
    const { g } = grid(0, 'a');
    const pre = preRegister(EMPTY_REGISTRY, spec, 1000);
    expect(overlayRun(pre, spec, overlay, g, 3000)).toEqual({
      ok: false,
      reason: 'PH-12 is not frozen',
      row: 0,
    });
    const flaky: Overlay = {
      ...overlay,
      evaluate: (c, x) => {
        if (c.date === 'd7') throw new Error('boom');
        return overlay.evaluate(c, x);
      },
    };
    const run = overlayRun(await frozen(), spec, flaky, g, 3000);
    expect(run.ok).toBe(false);
    if (!run.ok) expect(run.row).toBe(7);
  });

  it('weights a resize and counts the shrunk rows', async () => {
    const { g } = grid(0, 'a');
    const half: Overlay = {
      ...overlay,
      evaluate: () => ({ decision: 'resize', reasonCode: 'half', sizeMultiplier: 0.5 }),
    };
    const run = overlayRun(await frozen(), spec, half, g, 3000);
    if (!run.ok) throw new Error(run.reason);
    expect(run.resized).toBe(INSTRUMENTS * DATES);
    expect(run.weights[0]).toBe(0.5);
  });
});

describe('B0, B1, B2 and B3', () => {
  it('B0 takes every candidate; A with a planted effect beats B0', () => {
    const { g, flag } = grid(1.5, 'plant');
    expect(baselineArm(g.panel).n).toBe(INSTRUMENTS * DATES);
    expect(summarise(g.panel, flag).meanReturn).toBeGreaterThan(
      baselineArm(g.panel).meanReturn + 0.5,
    );
  });

  it('B1 matched-random: a planted effect is beaten by almost no random draw, a null is not', () => {
    const real = grid(1.5, 'plant');
    expect(matchedRandomArm(real.g.panel, real.flag, createRng('b1'), 500).p).toBeLessThan(0.01);
    const none = grid(0, 'null');
    expect(matchedRandomArm(none.g.panel, none.flag, createRng('b1'), 500).p).toBeGreaterThan(0.05);
  });

  it('B1 gives the same draws for the same seed', () => {
    const { g, flag } = grid(0.3, 'x');
    const a = matchedRandomArm(g.panel, flag, createRng('s'), 50);
    const b = matchedRandomArm(g.panel, flag, createRng('s'), 50);
    expect(a.drawMeans).toEqual(b.drawMeans);
  });

  it('B2 shuffled ephemeris: sensible p, reproducible by seed, and period clashes are excluded', () => {
    const { g, flag } = grid(1.5, 'plant');
    const a = shuffledEphemerisArm(g.panel, flag, createRng('b2'), 100, [252]);
    const b = shuffledEphemerisArm(g.panel, flag, createRng('b2'), 100, [252]);
    expect(a).toEqual(b);
    expect(a.p).toBeLessThan(0.05);
    expect(a.allowedShifts).toBeLessThan(DATES - 1);
    expect(a.shiftsUsed).toBe(100);
  });

  it('B3 calendar control: A beats a twin that lacks its effect, and does not beat itself', () => {
    const { g, flag } = grid(1.5, 'plant');
    const calendar = new Uint8Array(flag.length);
    for (let k = 0; k < calendar.length; k += 1)
      calendar[k] = (k % DATES) % 20 >= 10 && (k % DATES) % 20 < 14 ? 1 : 0;
    const vs = calendarControlArm(g.panel, flag, calendar, 0);
    expect(vs.beats).toBe(true);
    expect(calendarControlArm(g.panel, flag, flag, 0).beats).toBe(false);
  });
});

describe('synthetic-buyer placebo', () => {
  const range = { fromYear: 1950, toYear: 2005, places: 100 };
  const score = (b: { date: string; time: string }): number =>
    (Number(b.date.slice(5, 7)) + Number(b.time.slice(0, 2))) % 9;

  it('draws real dates, times and places from the range', () => {
    const rng = createRng('d');
    for (let n = 0; n < 200; n += 1) {
      const b = drawBirth(rng, range);
      expect(new Date(`${b.date}T${b.time}:00Z`).toISOString().startsWith(b.date)).toBe(true);
      expect(b.placeIndex).toBeLessThan(100);
      expect(Number(b.date.slice(0, 4))).toBeGreaterThanOrEqual(1950);
      expect(Number(b.date.slice(0, 4))).toBeLessThanOrEqual(2005);
    }
  });

  it('gives the same null for the same seed and counts as the standard says', () => {
    const a = syntheticBuyerNull(score, 8, createRng('r'), range, 300);
    const b = syntheticBuyerNull(score, 8, createRng('r'), range, 300);
    expect(a).toEqual(b);
    expect(a.scores).toHaveLength(300);
    const atLeast = a.scores.filter((s) => Math.abs(s) >= 8).length;
    expect(a.p).toBeCloseTo((1 + atLeast) / 301, 12);
  });

  it('an unbeatable observed score gets the smallest possible p; a trivial one gets 1', () => {
    expect(syntheticBuyerNull(score, 1000, createRng('r'), range, 99).p).toBeCloseTo(1 / 100, 12);
    expect(syntheticBuyerNull(score, 0, createRng('r'), range, 99).p).toBe(1);
  });
});
