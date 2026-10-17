import * as SQLite from 'expo-sqlite';
import type { Bundle, Row } from './shared/data';
import type { Store } from './shared/store';

// expo-sqlite: the same package that serves Android and iOS; on web it runs a WebAssembly SQLite.
const open = (): Promise<SQLite.SQLiteDatabase> => SQLite.openDatabaseAsync('spike.db');

export const expoSqliteStore: Store = {
  name: 'expo-sqlite',
  async save(bundle: Bundle) {
    const db = await open();
    await db.execAsync(
      'DROP TABLE IF EXISTS rows; DROP TABLE IF EXISTS meta;' +
        'CREATE TABLE rows(id INTEGER PRIMARY KEY, symbol TEXT, date TEXT, open INT, high INT, low INT, close INT, volume INT, pnl INT);' +
        'CREATE TABLE meta(k TEXT PRIMARY KEY, v TEXT);',
    );
    await db.withTransactionAsync(async () => {
      const stmt = await db.prepareAsync('INSERT INTO rows VALUES(?,?,?,?,?,?,?,?,?)');
      for (const r of bundle.rows)
        await stmt.executeAsync([r.id, r.symbol, r.date, r.open, r.high, r.low, r.close, r.volume, r.pnl]);
      await stmt.finalizeAsync();
      await db.runAsync('INSERT INTO meta VALUES(?,?)', 'series', JSON.stringify(bundle.series));
    });
    await db.closeAsync();
  },
  async load() {
    const db = await open();
    try {
      const rows = await db.getAllAsync<Row>('SELECT * FROM rows ORDER BY id');
      const meta = await db.getFirstAsync<{ v: string }>("SELECT v FROM meta WHERE k='series'");
      return rows.length === 0 ? null : { rows, series: meta ? (JSON.parse(meta.v) as number[]) : [] };
    } catch {
      return null;
    } finally {
      await db.closeAsync();
    }
  },
  async clear() {
    const db = await open();
    await db.execAsync('DROP TABLE IF EXISTS rows; DROP TABLE IF EXISTS meta;');
    await db.closeAsync();
  },
};
