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
import { eventHash, sessionOn, sha256Bytes } from '@trading/core';
import { AppendOnlyFile, OpenTimestampsAnchorer } from '@trading/data-service';
import type { HttpClient } from '@trading/data-service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runPreopen, upgradeLockProofs } from './preopenJob';
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

describe('upgrading the proofs of locked days', () => {
  const ALICE = 'https://alice.btc.calendar.opentimestamps.org';
  const nonce = Uint8Array.from({ length: 16 }, (_, i) => i + 1);
  const uri = new TextEncoder().encode(ALICE);
  const pendingReply = Uint8Array.from([
    0xf0,
    16,
    ...nonce,
    0x08,
    0x00,
    0x83,
    0xdf,
    0xe3,
    0x0d,
    0x2e,
    0xf9,
    0x0c,
    0x8e,
    uri.length + 1,
    uri.length,
    ...uri,
  ]);
  const bitcoin = Uint8Array.from([
    0x00, 0x05, 0x88, 0x96, 0x0d, 0x73, 0xd7, 0x19, 0x01, 3, 0x80, 0xea, 0x30,
  ]);
  const hex = (b: Uint8Array): string =>
    [...b].map((x) => x.toString(16).padStart(2, '0')).join('');

  async function lockedDay() {
    const poster = {
      post: () => Promise.resolve({ status: 200, body: pendingReply, headers: {} }),
    };
    const d = deps({ anchorer: new OpenTimestampsAnchorer({ poster, now: () => BEFORE + 1000 }) });
    const r = await runPreopen(d, input());
    const commitment = sha256Bytes(Uint8Array.from([...hexBytes(r.lock.event.hash), ...nonce]));
    return { d, url: `${ALICE}/timestamp/${hex(commitment)}` };
  }
  const hexBytes = (h: string): Uint8Array =>
    Uint8Array.from((h.match(/../g) ?? []).map((x) => parseInt(x, 16)));
  const calendar = (url: string, ready: boolean): HttpClient => ({
    get: (u) =>
      Promise.resolve({
        status: ready && u === url ? 200 : 404,
        body: ready ? bitcoin : new Uint8Array(0),
        headers: {},
      }),
  });

  it('stays pending while the calendar has nothing, then records the completed proof once', async () => {
    const { d, url } = await lockedDay();
    const proofsFile = join(dir, 'proofs.jsonl');
    const args = { files: d.files, proofsFile, now: () => 5 };
    expect(await upgradeLockProofs({ ...args, http: calendar(url, false) })).toEqual({
      upgraded: [],
      stillPending: [DATE],
    });
    expect(await upgradeLockProofs({ ...args, http: calendar(url, true) })).toEqual({
      upgraded: [DATE],
      stillPending: [],
    });
    const stored = new AppendOnlyFile<{ bitcoinHeights: number[] }>(proofsFile).readAll();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.bitcoinHeights).toEqual([800000]);
    expect(await upgradeLockProofs({ ...args, http: calendar(url, true) })).toEqual({
      upgraded: [],
      stillPending: [],
    });
  });

  it('leaves the lock itself unchanged', async () => {
    const { d, url } = await lockedDay();
    const before = new AppendOnlyFile(d.files.locks).readAll();
    await upgradeLockProofs({
      files: d.files,
      proofsFile: join(dir, 'p.jsonl'),
      http: calendar(url, true),
      now: () => 5,
    });
    expect(new AppendOnlyFile(d.files.locks).readAll()).toEqual(before);
  });
});
