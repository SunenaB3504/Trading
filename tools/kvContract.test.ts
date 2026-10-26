import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { MemoryKv } from '../packages/app/src/store/kv';
import type { KeyValueStore } from '../packages/app/src/store/kv';
import { ScopedKv, profilePrefix } from '../packages/app/src/store/scopedKv';
import { SqliteKv } from '../packages/app/src/store/sqliteKv';
import type { SqlDb } from '../packages/app/src/store/sqliteKv';

// SSD v4.1 §9 / MIP Stage 1.7: every store behind the `KeyValueStore` seam keeps the same contract. The SQLite
// store runs here on Node's built-in SQLite, behind the same methods `expo-sqlite` offers on Android.
function nodeSqlite(): SqlDb {
  const db = new DatabaseSync(':memory:');
  return {
    execAsync: (sql) => Promise.resolve(void db.exec(sql)),
    runAsync: (sql, params) => Promise.resolve(db.prepare(sql).run(...params)),
    getFirstAsync: <T>(sql: string, params: Array<string | number | null>) =>
      Promise.resolve((db.prepare(sql).get(...params) as T | undefined) ?? null),
    getAllAsync: <T>(sql: string, params: Array<string | number | null>) =>
      Promise.resolve(db.prepare(sql).all(...params) as T[]),
  };
}

const stores: Array<[string, () => KeyValueStore]> = [
  ['memory', () => new MemoryKv()],
  ['sqlite', () => new SqliteKv(() => Promise.resolve(nodeSqlite()))],
  ['scoped over memory', () => new ScopedKv(new MemoryKv(), profilePrefix('a'))],
  [
    'scoped over sqlite',
    () => new ScopedKv(new SqliteKv(() => Promise.resolve(nodeSqlite())), profilePrefix('a')),
  ],
];

describe.each(stores)('key-value contract: %s', (_name, make) => {
  it('reads back what was set, null for a missing key, and replaces on set', async () => {
    const kv = make();
    expect(await kv.get('missing')).toBeNull();
    await kv.set('a', '1');
    await kv.set('a', '2');
    expect(await kv.get('a')).toBe('2');
  });

  it('deletes, and deleting a missing key is not an error', async () => {
    const kv = make();
    await kv.set('a', '1');
    await kv.delete('a');
    await kv.delete('never');
    expect(await kv.get('a')).toBeNull();
  });

  it('lists keys sorted, including ones with slashes and unicode values', async () => {
    const kv = make();
    await kv.set('paper/requests', '[]');
    await kv.set('b', '₹1,00,000');
    await kv.set('a/b/c', '"x"');
    expect(await kv.keys()).toEqual(['a/b/c', 'b', 'paper/requests']);
    expect(await kv.get('b')).toBe('₹1,00,000');
  });
});

describe('profile scopes', () => {
  it('keep two profiles apart on one store and never show the prefix', async () => {
    const base = new MemoryKv();
    const a = new ScopedKv(base, profilePrefix('a'));
    const b = new ScopedKv(base, profilePrefix('b'));
    await a.set('paper/requests', 'A');
    await b.set('paper/requests', 'B');
    expect(await a.get('paper/requests')).toBe('A');
    expect(await b.keys()).toEqual(['paper/requests']);
    expect(await base.keys()).toEqual(['p/a/paper/requests', 'p/b/paper/requests']);
  });

  it('clear removes one profile and leaves the rest of the device alone', async () => {
    const base = new MemoryKv();
    await base.set('device/key', 'k');
    const a = new ScopedKv(base, profilePrefix('a'));
    await a.set('x', '1');
    await new ScopedKv(base, profilePrefix('ab')).set('x', '2');
    await a.clear();
    expect(await base.keys()).toEqual(['device/key', 'p/ab/x']);
  });

  it('refuses a prefix that could run into another key', () => {
    expect(() => new ScopedKv(new MemoryKv(), 'p/a')).toThrow(RangeError);
  });
});
