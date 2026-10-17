import { describe, expect, it } from 'vitest';
import { buildChart } from './chart';
import { DEFAULT_CONVENTIONS } from './conventions';
import { extractFeatures } from './features';
import { SignalLog, defineSignal, logDay, verifyEntries } from './signal';
import type { LogEntry, SignalSpec } from './signal';

const SPEC: SignalSpec = {
  id: 'moon-nak-class',
  version: 1,
  hypothesisId: 'PH-11',
  evidenceTag: 'M',
  inputs: ['moonNakshatra'],
  formula: 'moonNakshatra % 3',
  params: { modulus: 3 },
  claimed: { effectSizePct: 0.5, direction: 'up', horizonSessions: 5 },
  periodsDays: [27.3],
};
const def = defineSignal(SPEC);
const chart = buildChart(
  { utc: '2020-06-15T06:30', latitude: 8.5, longitude: 76.9 },
  DEFAULT_CONVENTIONS,
);
const feats = (asOf: string) => extractFeatures({ natal: chart, asOf });
const OPEN = Date.UTC(2026, 9, 19, 3, 45); // 09:15 IST
const CLOSE_BAR = Date.UTC(2026, 9, 19, 12, 0);

function run(log: SignalLog, now = OPEN, date = '2026-10-19') {
  return logDay(log, {
    def,
    fn: (f) => f.natal.moonNakshatra % 3,
    date,
    features: new Map([
      ['TCS', feats(date)],
      ['INFY', feats(date)],
    ]),
    now,
    outcomeAvailableAt: CLOSE_BAR,
  });
}

describe('SignalDefinition (FR-S1)', () => {
  it('hashes every field, so a changed parameter is a different signal', () => {
    expect(def.hash).toBe(defineSignal(SPEC).hash);
    expect(defineSignal({ ...SPEC, params: { modulus: 4 } }).hash).not.toBe(def.hash);
    expect(
      defineSignal({ ...SPEC, claimed: { ...SPEC.claimed, horizonSessions: 10 } }).hash,
    ).not.toBe(def.hash);
    expect(Object.isFrozen(def)).toBe(true);
  });

  it('refuses a definition without a hypothesis id, claim, horizon or period', () => {
    expect(() => defineSignal({ ...SPEC, hypothesisId: 'idea' })).toThrow(/hypothesis id/);
    expect(() => defineSignal({ ...SPEC, version: 0 })).toThrow(/version/);
    expect(() =>
      defineSignal({ ...SPEC, claimed: { ...SPEC.claimed, horizonSessions: 0 } }),
    ).toThrow(/horizon/);
    expect(() =>
      defineSignal({ ...SPEC, claimed: { ...SPEC.claimed, effectSizePct: -1 } }),
    ).toThrow(/effect size/);
    expect(() => defineSignal({ ...SPEC, periodsDays: [] })).toThrow(/period/);
    expect(() => defineSignal({ ...SPEC, formula: ' ' })).toThrow(/formula/);
  });
});

describe('SignalLog (FR-S2, FR-S3)', () => {
  it('writes one chained row per instrument-day, in instrument order, before the outcome', () => {
    const log = new SignalLog();
    const rows = run(log);
    expect(rows.map((r) => r.instrumentId)).toEqual(['INFY', 'TCS']);
    expect(rows.every((r) => r.writtenAt < r.outcomeAvailableAt)).toBe(true);
    expect(rows[1]?.prevHash).toBe(rows[0]?.hash);
    expect(rows[0]?.definitionHash).toBe(def.hash);
    expect(log.verify()).toBe(true);
    expect(log.find('TCS', '2026-10-19', def.id)?.value).toBe(chart.planets.moon.nakshatra % 3);
  });

  it('refuses a row written at or after the moment the outcome is available', () => {
    expect(() => run(new SignalLog(), CLOSE_BAR)).toThrow(/after its outcome/);
    expect(() => run(new SignalLog(), CLOSE_BAR + 1)).toThrow(/after its outcome/);
  });

  it('refuses to log the same instrument, day and signal version twice', () => {
    const log = new SignalLog();
    run(log);
    expect(() => run(log, OPEN - 1)).toThrow(/already logged/);
    expect(() => run(log, OPEN, '2026-10-20')).not.toThrow();
  });

  it('detects an edited, removed or re-ordered row', () => {
    const log = new SignalLog();
    run(log);
    run(log, OPEN, '2026-10-20');
    const rows = [...log.entries()];
    expect(verifyEntries(rows)).toBe(true);
    expect(verifyEntries([{ ...(rows[0] as LogEntry), value: 99 }, ...rows.slice(1)])).toBe(false);
    expect(verifyEntries(rows.slice(1))).toBe(false);
    expect(verifyEntries([rows[1] as LogEntry, rows[0] as LogEntry, ...rows.slice(2)])).toBe(false);
    expect(
      verifyEntries([{ ...(rows[0] as LogEntry), writtenAt: CLOSE_BAR }, ...rows.slice(1)]),
    ).toBe(false);
  });

  it('gives the same chain head for the same inputs', () => {
    const a = new SignalLog();
    const b = new SignalLog();
    run(a);
    run(b);
    expect(a.head()).toBe(b.head());
  });
});
