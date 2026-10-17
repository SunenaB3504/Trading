import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Bundle, Row } from './shared/data';
import type { Store } from './shared/store';

// SQLite compiled to WebAssembly, held in memory; the database file image is kept in IndexedDB so a
// stored bundle can be reopened. (OPFS persistence needs a worker; see the verdict.)
type Sqlite = Awaited<ReturnType<typeof sqlite3InitModule>>;
let sqlite: Promise<Sqlite> | undefined;
const init = (): Promise<Sqlite> => (sqlite ??= sqlite3InitModule());

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('spike-sqlite-image', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('image');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putImage(bytes: Uint8Array | null): Promise<void> {
  const db = await idb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('image', 'readwrite');
    if (bytes === null) tx.objectStore('image').clear();
    else tx.objectStore('image').put(bytes, 'db');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function getImage(): Promise<Uint8Array | null> {
  const db = await idb();
  const bytes = await new Promise<Uint8Array | undefined>((resolve, reject) => {
    const r = db.transaction('image').objectStore('image').get('db');
    r.onsuccess = () => resolve(r.result as Uint8Array | undefined);
    r.onerror = () => reject(r.error);
  });
  db.close();
  return bytes ?? null;
}

export const sqliteWasmStore: Store = {
  name: 'SQLite-WASM',
  async save(bundle: Bundle) {
    const s = await init();
    const db = new s.oo1.DB(':memory:');
    db.exec(
      'CREATE TABLE rows(id INTEGER PRIMARY KEY, symbol TEXT, date TEXT, open INT, high INT, low INT, close INT, volume INT, pnl INT)',
    );
    db.exec('CREATE TABLE meta(k TEXT PRIMARY KEY, v TEXT)');
    db.transaction(() => {
      const stmt = db.prepare('INSERT INTO rows VALUES(?,?,?,?,?,?,?,?,?)');
      for (const r of bundle.rows)
        stmt
          .bind([r.id, r.symbol, r.date, r.open, r.high, r.low, r.close, r.volume, r.pnl])
          .stepReset();
      stmt.finalize();
      db.exec({ sql: 'INSERT INTO meta VALUES(?,?)', bind: ['series', JSON.stringify(bundle.series)] });
    });
    await putImage(s.capi.sqlite3_js_db_export(db));
    db.close();
  },
  async load() {
    const s = await init();
    const bytes = await getImage();
    if (bytes === null) return null;
    const db = new s.oo1.DB(':memory:');
    const p = s.wasm.allocFromTypedArray(bytes);
    const rc = s.capi.sqlite3_deserialize(
      db.pointer!,
      'main',
      p,
      bytes.length,
      bytes.length,
      s.capi.SQLITE_DESERIALIZE_FREEONCLOSE | s.capi.SQLITE_DESERIALIZE_RESIZEABLE,
    );
    db.checkRc(rc);
    const rows = db.selectObjects('SELECT * FROM rows ORDER BY id') as unknown as Row[];
    const series = JSON.parse(String(db.selectValue("SELECT v FROM meta WHERE k='series'"))) as number[];
    db.close();
    return { rows, series };
  },
  async clear() {
    await putImage(null);
  },
};
