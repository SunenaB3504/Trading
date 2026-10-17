import { FixedClock } from '@trading/core';
import { describe, expect, it } from 'vitest';
import type { FrozenSeries } from '../index';
import { SnapshotStore, createSnapshot, verifySnapshot } from '../index';
import { buildFixture, idOf } from './testFixture';

const { store } = buildFixture();
const TATA = idOf('TATASTEEL');
const make = (over: Partial<Parameters<typeof createSnapshot>[0]> = {}) =>
  createSnapshot({ store, clock: new FixedClock(1_000), asOf: '2024-12-31', ...over });

describe('creating and hashing a snapshot (FR-D6)', () => {
  it('gives the same id for the same inputs, whatever the clock or the order asked for', () => {
    const a = make();
    const b = make({ clock: new FixedClock(999_999) });
    const reversed = make({ instruments: [...store.instruments()].reverse() });
    expect(b.snapshot.id).toBe(a.snapshot.id);
    expect(reversed.snapshot.id).toBe(a.snapshot.id);
    expect(a.snapshot.id).toMatch(/^[0-9a-f]{64}$/);
    expect(b.snapshot.createdAt).not.toBe(a.snapshot.createdAt);
  });

  it('does not depend on the snapshot tag the bars were built with', () => {
    const other = buildFixture('another-tag').store;
    const x = createSnapshot({ store: other, clock: new FixedClock(1), asOf: '2024-12-31' });
    expect(x.snapshot.id).toBe(make().snapshot.id);
  });

  it('changes when the date, the set of instruments or a single price changes', () => {
    const base = make().snapshot.id;
    expect(make({ asOf: '2024-01-01' }).snapshot.id).not.toBe(base);
    expect(make({ instruments: [TATA] }).snapshot.id).not.toBe(base);
    const edited = buildFixture().store;
    const bars = edited.unadjusted(TATA);
    (bars[3] as { close: number }).close += 1;
    edited.putUnadjusted(TATA, bars);
    const y = createSnapshot({ store: edited, clock: new FixedClock(1), asOf: '2024-12-31' });
    expect(y.snapshot.id).not.toBe(base);
  });

  it('leaves out later bars and actions (point in time) and stamps what it keeps', () => {
    const before = make({ instruments: [TATA], asOf: '2022-07-27' });
    const f = before.frozen[0] as FrozenSeries;
    expect(before.snapshot.series[0]?.lastDate).toBe('2022-07-27');
    expect(f.actions).toEqual([]); // the 2022-07-28 split is not yet known
    expect(f.adjusted.map((b) => b.close)).toEqual(f.bars.map((b) => b.close));
    expect(f.bars.map((b) => b.snapshotId)).toEqual(f.bars.map(() => before.snapshot.id));
  });

  it('applies a split known by the snapshot date to the adjusted series only', () => {
    const after = make({ instruments: [TATA], asOf: '2022-08-05' });
    const f = after.frozen[0] as FrozenSeries;
    expect(f.actions).toHaveLength(1);
    expect((f.adjusted[0]?.close ?? 0) * 10).toBeCloseTo(f.bars[0]?.close ?? 0, 6);
  });

  it('is verified when clean and unverified when a bar is disputed', () => {
    expect(make().snapshot.status).toBe('verified');
    const disputed = buildFixture().store;
    const bars = disputed.unadjusted(TATA);
    (bars[2] as { disputed: boolean }).disputed = true;
    disputed.putUnadjusted(TATA, bars);
    const s = createSnapshot({ store: disputed, clock: new FixedClock(1), asOf: '2024-12-31' });
    expect(s.snapshot.status).toBe('unverified');
    expect(s.snapshot.series.find((e) => e.instrumentId === TATA)?.disputedBars).toBe(1);
  });
});

describe('verifying and storing snapshots', () => {
  it('passes an untouched snapshot and catches an edited price, a dropped series or a forged hash', () => {
    const { snapshot, frozen } = make();
    expect(verifySnapshot(snapshot, frozen)).toEqual([]);
    const edited = structuredClone(frozen);
    (edited[0]?.bars[0] as { close: number }).close += 1;
    expect(verifySnapshot(snapshot, edited).length).toBeGreaterThan(0);
    expect(verifySnapshot(snapshot, frozen.slice(1))).toContain('series count differs');
    const forged = {
      ...snapshot,
      series: snapshot.series.map((e) => ({ ...e, barsHash: '0'.repeat(64) })),
    };
    expect(verifySnapshot(forged, frozen).length).toBeGreaterThan(0);
  });

  it('refuses a tampered snapshot, ignores a repeat store and returns copies', () => {
    const snaps = new SnapshotStore();
    const { snapshot, frozen } = make();
    const bad = structuredClone(frozen);
    (bad[0]?.bars[0] as { close: number }).close += 1;
    expect(() => snaps.put({ snapshot, series: bad })).toThrow(/snapshot refused/);
    snaps.put({ snapshot, series: frozen });
    snaps.put({ snapshot: { ...snapshot, createdAt: 5 }, series: frozen });
    expect(snaps.list()).toHaveLength(1);
    expect(snaps.list()[0]?.createdAt).toBe(1_000); // the first store wins
    const got = snaps.get(snapshot.id);
    (got?.series[0]?.bars[0] as { close: number }).close = 1;
    expect(snaps.get(snapshot.id)?.series[0]?.bars[0]?.close).not.toBe(1);
    expect(snaps.get('nope')).toBeUndefined();
  });
});
