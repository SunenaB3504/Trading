import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EMPTY_REGISTRY, freeze, preRegister, sha256Hex } from '../packages/core/src/index';
import type { HypothesisSpec } from '../packages/core/src/index';
import { SignalLog, lockDay } from '../packages/astro-engine/src/index';
import type { DayLock, LogEntry } from '../packages/astro-engine/src/index';
import {
  AppendOnlyFile,
  StoreError,
  loadRegistry,
  saveRegistry,
} from '../packages/data-service/src/index';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/** Records survive a restart, and a file that was edited is refused on load (WP-4.5, WP-5.1). */
let dir = '';
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'research-store-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const row = (i: number) => ({
  instrumentId: `I${String(i)}`,
  date: '2026-03-02',
  signalId: 's',
  signalVersion: 1,
  definitionHash: 'd'.repeat(64),
  featuresHash: 'f'.repeat(64),
  value: i,
  writtenAt: 1000 + i,
  outcomeAvailableAt: 9000,
});

const anchor = {
  submit: (digest: string) =>
    Promise.resolve({ provider: 't', digest, submittedAt: 1500, proof: 'ab' }),
};

describe('the signal log on disk', () => {
  it('is written one row at a time, read back after a restart, and still verifies', () => {
    const file = new AppendOnlyFile<LogEntry>(join(dir, 'signals.jsonl'));
    const log = new SignalLog();
    for (let i = 0; i < 4; i += 1) file.append(log.append(row(i)));
    const reloaded = SignalLog.fromEntries(
      new AppendOnlyFile<LogEntry>(join(dir, 'signals.jsonl')).readAll(),
    );
    expect(reloaded.entries()).toEqual(log.entries());
    expect(reloaded.head()).toBe(log.head());
    expect(reloaded.verify()).toBe(true);
    expect(() => reloaded.append(row(2))).toThrow(/already logged/);
    expect(reloaded.append(row(9)).prevHash).toBe(log.head());
  });

  it('refuses a file where a row was edited, removed or put out of order', () => {
    const path = join(dir, 'signals.jsonl');
    const file = new AppendOnlyFile<LogEntry>(path);
    const log = new SignalLog();
    for (let i = 0; i < 4; i += 1) file.append(log.append(row(i)));
    const lines = readFileSync(path, 'utf8').trim().split('\n');
    writeFileSync(
      path,
      [lines[0], lines[1]?.replace('"value":1', '"value":7'), lines[2], lines[3]].join('\n'),
    );
    expect(() => SignalLog.fromEntries(file.readAll())).toThrow(/fails its checks/);
    writeFileSync(path, [lines[0], lines[2], lines[3]].join('\n'));
    expect(() => SignalLog.fromEntries(file.readAll())).toThrow(/fails its checks/);
    writeFileSync(path, `${lines[0] ?? ''}\n{not json\n`);
    expect(() => file.readAll()).toThrow(StoreError);
  });

  it('reads a missing file as empty', () => {
    expect(new AppendOnlyFile(join(dir, 'none.jsonl')).readAll()).toEqual([]);
  });
});

describe('day locks and receipts on disk', () => {
  it('come back unchanged and still verify against the log', async () => {
    const log = new SignalLog();
    const rows = [0, 1].map((i) => log.append(row(i)));
    const lock = await lockDay({
      date: '2026-03-02',
      rows,
      prev: null,
      openAt: 5000,
      now: 2000,
      anchorer: anchor,
    });
    const file = new AppendOnlyFile<DayLock>(join(dir, 'locks.jsonl'));
    file.append(lock);
    const [back] = file.readAll();
    expect(back).toEqual(lock);
    expect(back?.status).toBe('anchored');
  });
});

describe('the experiment registry on disk', () => {
  const spec: HypothesisSpec = {
    id: 'PH-12',
    title: 't',
    family: 'f',
    statedNull: 'none',
    claimed: { effectSizePct: 1, direction: 'up', horizonSessions: 5 },
    params: { a: 1 },
    ruleHash: sha256Hex('rule'),
    excludedInstruments: [],
  };
  const timeAnchor = {
    submit: (digest: string) =>
      Promise.resolve({ provider: 't', digest, submittedAt: 2000, proof: '' }),
  };

  it('is saved, reloaded intact, and keeps every earlier version in a history file', async () => {
    const path = join(dir, 'registry.json');
    expect(loadRegistry(path)).toBeNull();
    const pre = preRegister(EMPTY_REGISTRY, spec, 1000);
    saveRegistry(path, pre);
    const frozen = await freeze(pre, 'PH-12', 1500, timeAnchor);
    saveRegistry(path, frozen);
    expect(loadRegistry(path)).toEqual(frozen);
    expect(readFileSync(`${path}.history`, 'utf8').trim().split('\n')).toHaveLength(1);
  });

  it('refuses to save a broken registry and to load an edited one', async () => {
    const path = join(dir, 'registry.json');
    const frozen = await freeze(preRegister(EMPTY_REGISTRY, spec, 1000), 'PH-12', 1500, timeAnchor);
    const forged = {
      ...frozen,
      registrations: frozen.registrations.map((r) => ({
        ...r,
        spec: { ...r.spec, claimed: { ...r.spec.claimed, effectSizePct: 0.1 } },
      })),
    };
    expect(() => saveRegistry(path, forged)).toThrow(StoreError);
    saveRegistry(path, frozen);
    writeFileSync(
      path,
      readFileSync(path, 'utf8').replace('"effectSizePct":1', '"effectSizePct":9'),
    );
    expect(() => loadRegistry(path)).toThrow(/fails its checks/);
  });
});
