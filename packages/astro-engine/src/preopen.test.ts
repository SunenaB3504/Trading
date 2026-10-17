import { describe, expect, it } from 'vitest';
import { buildChart } from './chart';
import { DEFAULT_CONVENTIONS } from './conventions';
import { extractFeatures } from './features';
import { classifyDays, lockDay, verifyLock } from './preopen';
import type { Anchorer } from './preopen';
import { SignalLog, defineSignal, logDay } from './signal';

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
const OPEN = Date.UTC(2026, 9, 19, 3, 45);
const NOW = OPEN - 3_600_000;

function dayRows(date = '2026-10-19') {
  const log = new SignalLog();
  logDay(log, {
    def,
    fn: (f) => f.natal.moonNakshatra % 3,
    date,
    features: new Map([['TCS', extractFeatures({ natal: chart, asOf: date })]]),
    now: NOW - 1000,
    outcomeAvailableAt: OPEN + 8 * 3_600_000,
  });
  return log.entries();
}

const clock = (at: number): Anchorer => ({
  submit: (digest) => Promise.resolve({ provider: 'test', digest, submittedAt: at, proof: 'ab' }),
});

const base = { date: '2026-10-19', prev: null, openAt: OPEN };

describe('pre-open lock (FR-S9, D16)', () => {
  it('anchors a day locked and timestamped before the open, and verifies', async () => {
    const rows = dayRows();
    const lock = await lockDay({ ...base, rows, now: NOW, anchorer: clock(NOW + 5) });
    expect(lock.status).toBe('anchored');
    expect(lock.event.payloadRef).toBe(`2026-10-19:${lock.signalsHash}`);
    expect(verifyLock(lock, rows)).toBe(true);
  });

  it('marks a day unanchored when the lock is late, but still records it in the chain', async () => {
    const lock = await lockDay({ ...base, rows: dayRows(), now: OPEN, anchorer: clock(OPEN - 1) });
    expect(lock.status).toBe('unanchored');
    expect(lock.reason).toMatch(/at or after the open/);
    expect(lock.event.seq).toBe(0);
  });

  it('marks a day unanchored when the receipt was taken after the open', async () => {
    const lock = await lockDay({ ...base, rows: dayRows(), now: NOW, anchorer: clock(OPEN) });
    expect(lock.status).toBe('unanchored');
    expect(lock.reason).toMatch(/after the open/);
  });

  it('marks a day unanchored when the service fails, or answers for another digest', async () => {
    const failing: Anchorer = { submit: () => Promise.reject(new Error('offline')) };
    const failed = await lockDay({ ...base, rows: dayRows(), now: NOW, anchorer: failing });
    expect(failed).toMatchObject({ status: 'unanchored', reason: 'anchor failed: offline' });
    const wrong: Anchorer = {
      submit: () => Promise.resolve({ provider: 't', digest: 'x', submittedAt: NOW, proof: '' }),
    };
    const other = await lockDay({ ...base, rows: dayRows(), now: NOW, anchorer: wrong });
    expect(other.reason).toMatch(/different digest/);
  });

  it('does not anchor a day with no signals', async () => {
    const lock = await lockDay({ ...base, rows: [], now: NOW, anchorer: clock(NOW) });
    expect(lock).toMatchObject({ status: 'unanchored', reason: 'no signals to lock' });
  });

  it('chains the days and detects changed rows or a forged status', async () => {
    const rows = dayRows();
    const a = await lockDay({ ...base, rows, now: NOW, anchorer: clock(NOW) });
    const next = Date.UTC(2026, 9, 20, 3, 45);
    const rows2 = dayRows('2026-10-20');
    const b = await lockDay({
      date: '2026-10-20',
      rows: rows2,
      prev: a.event,
      openAt: next,
      now: next - 60_000,
      anchorer: clock(next - 59_000),
    });
    expect(b.event.prevHash).toBe(a.event.hash);
    expect(verifyLock(a, rows2)).toBe(false);
    expect(verifyLock({ ...a, receipt: null }, rows)).toBe(false);
    const late = await lockDay({ ...base, rows, now: OPEN, anchorer: clock(NOW) });
    expect(verifyLock({ ...late, status: 'anchored' }, rows)).toBe(false);
  });

  it('keeps only anchored days as evidence; a day never locked is excluded too', async () => {
    const rows = dayRows();
    const good = await lockDay({ ...base, rows, now: NOW, anchorer: clock(NOW) });
    const bad = await lockDay({
      ...base,
      date: '2026-10-20',
      rows,
      now: OPEN,
      anchorer: clock(NOW),
    });
    const out = classifyDays(['2026-10-19', '2026-10-20', '2026-10-21'], [good, bad]);
    expect(out.evidence).toEqual(['2026-10-19']);
    expect(out.excluded.map((e) => e.date)).toEqual(['2026-10-20', '2026-10-21']);
    expect(out.excluded[1]?.reason).toBe('no lock was made');
  });
});
