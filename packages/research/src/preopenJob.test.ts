import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  DEFAULT_CONVENTIONS,
  SignalLog,
  buildChart,
  classifyDays,
  defineSignal,
  extractFeatures,
  verifyLock,
} from '@trading/astro-engine';
import type { Anchorer, LogEntry } from '@trading/astro-engine';
import { eventHash, sessionOn } from '@trading/core';
import { AppendOnlyFile } from '@trading/data-service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runPreopen } from './preopenJob';
import type { PreopenDeps, PreopenInput } from './preopenJob';

const DATE = '2026-10-19';
const OPEN = sessionOn(DATE).windows[0]?.openUtc ?? 0;
const BEFORE = OPEN - 3_600_000;

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
const features = (asOf: string) => () => extractFeatures({ natal: chart, asOf });

const goodAnchorer: Anchorer = {
  submit: (digest) =>
    Promise.resolve({ provider: 'test', digest, submittedAt: BEFORE + 1000, proof: 'ab' }),
};

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'preopen-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const deps = (over: Partial<PreopenDeps> = {}): PreopenDeps => ({
  files: { log: join(dir, 'log.jsonl'), locks: join(dir, 'locks.jsonl') },
  anchorer: goodAnchorer,
  now: () => BEFORE,
  ...over,
});

const input = (over: Partial<PreopenInput> = {}): PreopenInput => ({
  date: DATE,
  signals: [{ def, fn: (f) => f.natal.moonNakshatra % 3 }],
  builders: new Map([
    ['A:1', features(DATE)],
    ['B:2', features(DATE)],
  ]),
  snapshot: { snapshotId: 'snap-1', verified: true, ageSessions: 1, maxAgeSessions: 3 },
  instruments: new Map([
    ['A:1', { timeAssumed: false, disputed: false }],
    ['B:2', { timeAssumed: false, disputed: false }],
  ]),
  ...over,
});

const storedLog = (d: PreopenDeps) => new AppendOnlyFile<LogEntry>(d.files.log).readAll();

describe('the daily pre-open job', () => {
  it('writes the rows, locks them before the open, and stores both so they survive a restart', async () => {
    const d = deps();
    const r = await runPreopen(d, input());
    expect(r.status).toBe('locked');
    expect(r.rowsWritten).toBe(2);
    expect(r.lock.status).toBe('anchored');
    const rows = storedLog(d);
    expect(SignalLog.fromEntries(rows).verify()).toBe(true);
    expect(verifyLock(r.lock, rows)).toBe(true);
    expect(classifyDays([DATE], [r.lock]).evidence).toEqual([DATE]);
  });

  it('never locks a day twice: the second run returns the stored lock and writes nothing', async () => {
    const d = deps();
    const first = await runPreopen(d, input());
    const second = await runPreopen({ ...d, now: () => BEFORE + 5000 }, input());
    expect(second.status).toBe('already-locked');
    expect(second.lock).toEqual(first.lock);
    expect(storedLog(d)).toHaveLength(2);
  });

  it('chains each day to the previous day lock', async () => {
    const d = deps();
    const a = await runPreopen(d, input());
    const nextDate = '2026-10-21';
    const nextOpen = sessionOn(nextDate).windows[0]?.openUtc ?? 0;
    const b = await runPreopen(
      {
        ...d,
        now: () => nextOpen - 3_600_000,
        anchorer: {
          submit: (digest) =>
            Promise.resolve({ provider: 't', digest, submittedAt: nextOpen - 1000, proof: '' }),
        },
      },
      input({
        date: nextDate,
        builders: new Map([
          ['A:1', features(nextDate)],
          ['B:2', features(nextDate)],
        ]),
      }),
    );
    expect(b.lock.event.prevHash).toBe(eventHash(a.lock.event));
  });

  it('a lock made at or after the open is recorded as unanchored and is not evidence', async () => {
    const d = deps({ now: () => OPEN + 60_000 });
    const r = await runPreopen(d, input());
    expect(r.lock.status).toBe('unanchored');
    expect(classifyDays([DATE], [r.lock]).evidence).toEqual([]);
    expect(storedLog(d)).toHaveLength(2);
  });

  it('a failing time service gives an unanchored day with the reason, and the rows are kept', async () => {
    const d = deps({ anchorer: { submit: () => Promise.reject(new Error('no network')) } });
    const r = await runPreopen(d, input());
    expect(r.lock.status).toBe('unanchored');
    expect(r.lock.reason).toContain('no network');
    expect(storedLog(d)).toHaveLength(2);
  });

  it('a bad snapshot writes GRAY-NODATA rows for every instrument and still locks the day', async () => {
    const d = deps();
    const r = await runPreopen(
      d,
      input({
        snapshot: { snapshotId: null, verified: false, ageSessions: null, maxAgeSessions: 3 },
      }),
    );
    expect(r.lock.status).toBe('anchored');
    expect(storedLog(d).map((x) => x.value)).toEqual(['GRAY-NODATA', 'GRAY-NODATA']);
  });

  it('picks up after a crash that stored the rows but not the lock, without writing them again', async () => {
    const d = deps();
    await runPreopen(d, input());
    rmSync(d.files.locks);
    const r = await runPreopen(d, input());
    expect(r.status).toBe('locked');
    expect(r.rowsWritten).toBe(0);
    expect(storedLog(d)).toHaveLength(2);
  });

  it('refuses to lock a partial day (some rows stored, not all)', async () => {
    const d = deps();
    await runPreopen(d, input());
    rmSync(d.files.locks);
    const rows = storedLog(d);
    writeFileSync(d.files.log, `${JSON.stringify(rows[0])}\n`);
    await expect(runPreopen(d, input())).rejects.toThrow('partial day');
  });

  it('refuses a stored log whose chain was edited', async () => {
    const d = deps();
    await runPreopen(d, input());
    rmSync(d.files.locks);
    const rows = storedLog(d);
    writeFileSync(
      d.files.log,
      `${[{ ...rows[0], value: 99 }, rows[1]].map((x) => JSON.stringify(x)).join('\n')}\n`,
    );
    await expect(runPreopen(d, input())).rejects.toThrow('fails its checks');
  });

  it('has nothing to lock on a day the exchange is closed', async () => {
    await expect(runPreopen(deps(), input({ date: '2026-10-18' }))).rejects.toThrow(
      'not a trading day',
    );
  });
});
