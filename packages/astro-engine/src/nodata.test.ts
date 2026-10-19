import { describe, expect, it } from 'vitest';
import { buildChart } from './chart';
import { DEFAULT_CONVENTIONS } from './conventions';
import { extractFeatures } from './features';
import {
  GRAY_NODATA,
  GRAY_NOSIGNAL,
  logDayGuarded,
  nodataHash,
  snapshotProblem,
  tally,
  usesBaseline,
} from './nodata';
import type { GuardedDay, InstrumentHealth, SnapshotHealth } from './nodata';
import { SignalLog, defineSignal, verifyEntries } from './signal';

const def = defineSignal({
  id: 's',
  version: 1,
  hypothesisId: 'PH-11',
  evidenceTag: 'M',
  inputs: ['moonNakshatra'],
  formula: 'moonNakshatra % 3',
  params: {},
  claimed: { effectSizePct: 0.5, direction: 'up', horizonSessions: 5 },
  periodsDays: [27.3],
});
const chart = buildChart(
  { utc: '2020-06-15T06:30', latitude: 8.5, longitude: 76.9 },
  DEFAULT_CONVENTIONS,
);
const good = () => extractFeatures({ natal: chart, asOf: '2026-10-19' });
const OPEN = Date.UTC(2026, 9, 19, 3, 45);
const NOW = OPEN - 3_600_000;
const CLOSE = OPEN + 8 * 3_600_000;

const fresh: SnapshotHealth = {
  snapshotId: 'snap-1',
  verified: true,
  ageSessions: 1,
  maxAgeSessions: 3,
};
const fine: InstrumentHealth = { timeAssumed: false, disputed: false };

function day(over: Partial<GuardedDay> = {}): GuardedDay {
  return {
    def,
    fn: (f) => f.natal.moonNakshatra % 3,
    date: '2026-10-19',
    builders: new Map([
      ['INFY', good],
      ['TCS', good],
    ]),
    snapshot: fresh,
    instruments: new Map([
      ['INFY', fine],
      ['TCS', fine],
    ]),
    now: NOW,
    outcomeAvailableAt: CLOSE,
    ...over,
  };
}

describe('GRAY-NODATA fallback (FR-S11)', () => {
  it('leaves healthy days alone: real values, no NODATA', () => {
    const rows = logDayGuarded(new SignalLog(), day());
    expect(rows.map((r) => r.value)).toEqual([
      chart.planets.moon.nakshatra % 3,
      chart.planets.moon.nakshatra % 3,
    ]);
    expect(tally(rows)).toEqual({ nodata: 0, nosignal: 0, withSignal: 2 });
  });

  it('emits NODATA, not a halt, when the ephemeris fails for one instrument, and carries on with the rest', () => {
    const builders = new Map([
      [
        'INFY',
        () => {
          throw new Error('ephemeris out of range');
        },
      ],
      ['TCS', good],
    ]);
    const log = new SignalLog();
    const rows = logDayGuarded(log, day({ builders: builders as GuardedDay['builders'] }));
    expect(rows.map((r) => [r.instrumentId, r.value === GRAY_NODATA])).toEqual([
      ['INFY', true],
      ['TCS', false],
    ]);
    expect(rows[0]?.featuresHash).toBe(nodataHash('computation failed: ephemeris out of range'));
    expect(verifyEntries(log.entries())).toBe(true);
  });

  it('emits NODATA when the signal rule itself throws', () => {
    const rows = logDayGuarded(
      new SignalLog(),
      day({
        fn: () => {
          throw new Error('bad rule');
        },
      }),
    );
    expect(rows.every((r) => r.value === GRAY_NODATA)).toBe(true);
  });

  it.each([
    ['no snapshot', { ...fresh, snapshotId: null }, /no data snapshot/],
    ['an unverified snapshot', { ...fresh, verified: false }, /not verified/],
    ['a stale snapshot', { ...fresh, ageSessions: 4 }, /4 sessions old \(limit 3\)/],
    ['a snapshot of unknown age', { ...fresh, ageSessions: null }, /no known age/],
  ])('makes every instrument NODATA for %s', (_, snapshot, why) => {
    expect(snapshotProblem(snapshot)).toMatch(why);
    const rows = logDayGuarded(new SignalLog(), day({ snapshot }));
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.value === GRAY_NODATA)).toBe(true);
    expect(tally(rows)).toEqual({ nodata: 2, nosignal: 0, withSignal: 0 });
  });

  it('accepts a snapshot exactly at its age limit', () => {
    expect(snapshotProblem({ ...fresh, ageSessions: 3 })).toBeNull();
  });

  it('makes one instrument NODATA when its first-trade time is assumed, its day is disputed, or it has no record', () => {
    for (const health of [
      { ...fine, timeAssumed: true },
      { ...fine, disputed: true },
    ]) {
      const rows = logDayGuarded(
        new SignalLog(),
        day({
          instruments: new Map([
            ['INFY', health],
            ['TCS', fine],
          ]),
        }),
      );
      expect(rows.map((r) => r.value === GRAY_NODATA)).toEqual([true, false]);
    }
    const noRecord = logDayGuarded(new SignalLog(), day({ instruments: new Map([['TCS', fine]]) }));
    expect(noRecord.map((r) => r.value === GRAY_NODATA)).toEqual([true, false]);
  });

  it('gives different NODATA rows different hashes for different reasons', () => {
    expect(nodataHash('a')).not.toBe(nodataHash('b'));
    expect(nodataHash('a')).toBe(nodataHash('a'));
  });

  it('counts NODATA and NOSIGNAL apart, and a NODATA row tells a baseline arm to carry on as usual', () => {
    const log = new SignalLog();
    logDayGuarded(log, day({ snapshot: { ...fresh, verified: false } }));
    logDayGuarded(log, day({ date: '2026-10-20', fn: () => GRAY_NOSIGNAL }));
    expect(tally(log.entries())).toEqual({ nodata: 2, nosignal: 2, withSignal: 0 });
    expect(usesBaseline({ value: GRAY_NODATA })).toBe(true);
    expect(usesBaseline({ value: GRAY_NOSIGNAL })).toBe(false);
  });

  it('still refuses a late row or a duplicate: integrity failures are not data failures', () => {
    expect(() => logDayGuarded(new SignalLog(), day({ now: CLOSE }))).toThrow(/after its outcome/);
    const log = new SignalLog();
    logDayGuarded(log, day());
    expect(() => logDayGuarded(log, day())).toThrow(/already logged/);
  });
});
