import type { Bundle, Row } from './data';
import type { Store } from './store';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('spike-store', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('rows', { keyPath: 'id' });
      req.result.createObjectStore('meta');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const done = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

const request = <T>(r: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

export const idbStore: Store = {
  name: 'IndexedDB',
  async save(bundle: Bundle) {
    const db = await open();
    const tx = db.transaction(['rows', 'meta'], 'readwrite');
    for (const row of bundle.rows) tx.objectStore('rows').put(row);
    tx.objectStore('meta').put(bundle.series, 'series');
    await done(tx);
    db.close();
  },
  async load() {
    const db = await open();
    const tx = db.transaction(['rows', 'meta'], 'readonly');
    const rows = await request<Row[]>(tx.objectStore('rows').getAll());
    const series = await request<number[] | undefined>(tx.objectStore('meta').get('series'));
    db.close();
    return rows.length === 0 ? null : { rows, series: series ?? [] };
  },
  async clear() {
    const db = await open();
    const tx = db.transaction(['rows', 'meta'], 'readwrite');
    tx.objectStore('rows').clear();
    tx.objectStore('meta').clear();
    await done(tx);
    db.close();
  },
};
