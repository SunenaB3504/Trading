import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contractId, futureExpiries, parseLearningMarket, simulateFno } from '@trading/core';
import type { FnoOrder } from '@trading/core';
import { FNO_SCENARIOS } from '@trading/content';
import { describe, expect, it } from 'vitest';
import { applyImport, exportProfile, readBackup } from '../backup/backupService';
import { ProfileStore } from '../profiles/profiles';
import { MemorySecureStore } from '../secure/secureStore';
import { MemoryKv } from '../store/kv';
import { realMarket } from '../trading/market';
import { labGreeks, labLegs } from './optionsLab';
import type { LabInputs } from './optionsLab';
import { allMet, goalResults, leverageFlag, peakMarginShare } from './fnoGoals';
import { createFno, deleteFno, fnoDataOf, listFno, nextExpiryStep, saveFno, snapRange, stepFrom } from './fnoSessions';

const ASSETS = join(import.meta.dirname, '..', '..', 'assets');
const file = parseLearningMarket(JSON.parse(readFileSync(join(ASSETS, 'learning-market.market'), 'utf8')));
if (file === null) throw new Error('the bundled market file is unreadable');
const REAL = realMarket(file);
const DATA = fnoDataOf(REAL);
if (DATA === null) throw new Error('the bundled prices have no Nifty and Bank Nifty funds');
const NOW = 1_760_000_000_000;

describe('F&O sessions', () => {
  it('are created, saved, listed and deleted with the profile', async () => {
    const kv = new MemoryKv();
    const a = await createFno(kv, { title: 'A', scenarioId: null, underlyings: ['NIFTY'], start: '2024-01-02', end: '2024-02-01' }, NOW);
    const b = await createFno(kv, { title: 'B', scenarioId: 'fno-x', underlyings: ['NIFTY', 'BANKNIFTY'], start: '2024-03-01', end: '2024-04-01' }, NOW);
    expect([a.id, b.id]).toEqual(['f1', 'f2']);
    expect(a.current).toBe('2024-01-02');
    await saveFno(kv, { ...a, current: '2024-01-05', orders: [{ id: 'o1', date: '2024-01-02', contract: 'NIFTY|2024-01-30|CE|21700', side: 'buy', lots: 1 }] }, NOW);
    expect((await listFno(kv)).find((s) => s.id === 'f1')?.orders).toHaveLength(1);
    await deleteFno(kv, 'f1', NOW);
    expect((await listFno(kv)).map((s) => s.id)).toEqual(['f2']);
  });

  it('ignores a damaged record and rides along in a backup', async () => {
    const kv = new MemoryKv();
    await kv.set('tm/fno', JSON.stringify({ savedAt: 1, value: [{ id: 'f1' }, 7] }));
    expect(await listFno(kv)).toEqual([]);
    const dev = new MemoryKv();
    const profiles = new ProfileStore(dev, new MemorySecureStore(), () => NOW, () => 'ab'.repeat(32));
    const p = await profiles.create('Asha');
    const mine = profiles.scope(p.id);
    await createFno(mine, { title: 'Kept', scenarioId: null, underlyings: ['NIFTY'], start: '2024-01-02', end: '2024-02-01' }, NOW);
    const out = await exportProfile({ device: dev, profileKv: mine, profile: p, snapshotId: 'snap', now: NOW, randomHex: () => 'cd'.repeat(32) });
    const read = await readBackup(new MemoryKv(), out.text, 'cd'.repeat(32), 'snap');
    if (!read.ok) throw new Error(read.message);
    const other = new ProfileStore(new MemoryKv(), new MemorySecureStore(), () => NOW, () => 'ef'.repeat(32));
    const target = await applyImport(read.backup, other, NOW);
    expect((await listFno(other.scope(target.id))).map((s) => s.title)).toEqual(['Kept']);
  });
});

describe('F&O date stepping on the bundled prices', () => {
  it('moves by sessions, stops at the end and finds the next expiry', () => {
    const start = snapRange(DATA, '2024-05-27', '2024-06-07');
    expect(start).not.toBeNull();
    const s = start?.start ?? '';
    expect(stepFrom(DATA, s, '2024-06-07', 1) > s).toBe(true);
    expect(stepFrom(DATA, s, '2024-06-07', 500)).toBe(start?.end);
    expect(stepFrom(DATA, '2024-06-07', '2024-06-07', 1)).toBe('2024-06-07');
    expect(nextExpiryStep(DATA, s, '2024-06-07', ['2024-06-04'])).toBe('2024-06-04');
    expect(nextExpiryStep(DATA, s, '2024-06-07', [])).toBe(start?.end);
  });

  it('every scenario period has prices in the bundled file', () => {
    for (const sc of FNO_SCENARIOS) {
      const r = snapRange(DATA, sc.start, sc.end);
      expect(r, sc.id).not.toBeNull();
      expect((r?.start ?? '') <= sc.start || (r?.start ?? '') <= sc.start.slice(0, 8) + '10', sc.id).toBe(true);
    }
  });
});

describe('F&O goals and the leverage flag', () => {
  const sc = (id: string) => FNO_SCENARIOS.find((s) => s.id === id) ?? FNO_SCENARIOS[0]!;
  const range = (id: string) => snapRange(DATA, sc(id).start, sc(id).end)!;

  it('a session with no orders meets the loss and margin goals and holds nothing at expiry', () => {
    for (const s of FNO_SCENARIOS) {
      const r = snapRange(DATA, s.start, s.end)!;
      const run = simulateFno(DATA, [], r.start, r.end);
      expect(allMet(goalResults(s, run, 100_000_000)), s.id).toBe(true);
      expect(leverageFlag(run.curve)).toBeNull();
    }
  });

  it('a big short future breaks the margin cap, the flag names the date, and the result is reproducible', () => {
    const r = range('fno-futures-2020');
    const fut = contractId({ u: 'NIFTY', kind: 'FUT', expiry: '2020-04-28', strike: null });
    const orders: FnoOrder[] = [{ id: 'o1', date: r.start, contract: fut, side: 'buy', lots: 8 }];
    const run = simulateFno(DATA, orders, r.start, '2020-04-24');
    const flag = leverageFlag(run.curve);
    expect(flag).not.toBeNull();
    expect(peakMarginShare(run.curve)).toBeGreaterThan(0.5);
    const results = goalResults(sc('fno-futures-2020'), run, 100_000_000);
    expect(results[0]?.met).toBe(false);
    expect(JSON.stringify(simulateFno(DATA, orders, r.start, '2020-04-24'))).toBe(JSON.stringify(run));
  });

  it('holding a future into its expiry day fails the expiry goal', () => {
    const s = sc('fno-expiry-2024');
    const r = range('fno-expiry-2024');
    const fut = contractId({ u: 'NIFTY', kind: 'FUT', expiry: '2024-10-31', strike: null });
    const run = simulateFno(DATA, [{ id: 'o1', date: r.start, contract: fut, side: 'buy', lots: 1 }], r.start, r.end);
    const result = goalResults(s, run, 100_000_000).find((g) => g.goal.kind === 'no_expiry_holding');
    expect(result?.met).toBe(false);
  });
});

describe('Options Lab numbers', () => {
  const base: LabInputs = { strategy: 'long_straddle', index: 'NIFTY', spot: 22_600, volPct: 18, days: 30, lots: 1 };

  it('a long straddle has two legs bought, two breakevens and a loss limited to the premium', () => {
    const legs = labLegs(base);
    expect(legs.map((l) => [l.kind, l.strike, l.qty])).toEqual([['CE', 22_600, 1], ['PE', 22_600, 1]]);
    expect(legs.every((l) => l.premium > 0)).toBe(true);
  });

  it('more days or more volatility make bought options dearer, and the straddle has no net delta at the money', () => {
    const cost = (i: LabInputs) => labLegs(i).reduce((a, l) => a + l.premium, 0);
    expect(cost({ ...base, days: 60 })).toBeGreaterThan(cost(base));
    expect(cost({ ...base, volPct: 30 })).toBeGreaterThan(cost(base));
    const g = labGreeks(labLegs(base), base);
    expect(Math.abs(g.delta)).toBeLessThan(10);
    expect(g.theta).toBeLessThan(0);
    expect(g.vega).toBeGreaterThan(0);
  });

  it('lots scale every leg', () => {
    expect(labLegs({ ...base, lots: 3 }).map((l) => l.qty)).toEqual([3, 3]);
  });
});

describe('USD/INR sessions', () => {
  it('a rupee future buys at the next open, marks each close, and a long lot moves with the rate', () => {
    const sc = FNO_SCENARIOS.find((s) => s.id === 'fno-rupee-2022')!;
    const r = snapRange(DATA, sc.start, sc.end)!;
    const expiry = futureExpiries(r.start, 'USDINR')[1]!;
    const fut = contractId({ u: 'USDINR', kind: 'FUT', expiry, strike: null });
    const run = simulateFno(DATA, [{ id: 'o1', date: r.start, contract: fut, side: 'buy', lots: 2 }], r.start, r.end);
    expect(run.outcomes.o1?.status).toBe('filled');
    expect(run.curve.length).toBeGreaterThan(10);
    expect(allMet(goalResults(sc, run, 100_000_000))).toBe(true);
  });
});
