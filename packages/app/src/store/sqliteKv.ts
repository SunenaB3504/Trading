import type { KeyValueStore } from './kv';

/**
 * The part of a SQLite connection the store uses. `expo-sqlite`'s database has exactly these methods on
 * Android; tests pass Node's built-in SQLite behind the same shape, so one contract test covers both.
 */
export interface SqlDb {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: Array<string | number | null>): Promise<unknown>;
  getFirstAsync<T>(source: string, params: Array<string | number | null>): Promise<T | null>;
  getAllAsync<T>(source: string, params: Array<string | number | null>): Promise<T[]>;
}

const CREATE = 'CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)';

/** Android storage behind the `KeyValueStore` seam (SSD v4.1 §9): one table of JSON text values. */
export class SqliteKv implements KeyValueStore {
  private ready: Promise<SqlDb> | null = null;

  constructor(private readonly open: () => Promise<SqlDb>) {}

  private db(): Promise<SqlDb> {
    this.ready ??= this.open().then(async (db) => {
      await db.execAsync(CREATE);
      return db;
    });
    return this.ready;
  }

  async get(key: string): Promise<string | null> {
    const row = await (
      await this.db()
    ).getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key]);
    return row?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    await (
      await this.db()
    ).runAsync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [key, value]);
  }

  async delete(key: string): Promise<void> {
    await (await this.db()).runAsync('DELETE FROM kv WHERE key = ?', [key]);
  }

  async keys(): Promise<string[]> {
    const rows = await (
      await this.db()
    ).getAllAsync<{ key: string }>('SELECT key FROM kv ORDER BY key', []);
    return rows.map((r) => r.key);
  }
}
