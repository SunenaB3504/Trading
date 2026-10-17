import type { KeyValueStore } from './kv';

const STORE = 'kv';

function open(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function request<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

/** Browser storage behind the `KeyValueStore` seam (web release). */
export class IndexedDbKv implements KeyValueStore {
  constructor(private readonly name = 'trading-app') {}

  private async run<T>(
    mode: IDBTransactionMode,
    use: (s: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await open(this.name);
    try {
      return await request(use(db.transaction(STORE, mode).objectStore(STORE)));
    } finally {
      db.close();
    }
  }

  async get(key: string): Promise<string | null> {
    const v = await this.run('readonly', (s) => s.get(key) as IDBRequest<unknown>);
    return typeof v === 'string' ? v : null;
  }

  async set(key: string, value: string): Promise<void> {
    await this.run('readwrite', (s) => s.put(value, key));
  }

  async delete(key: string): Promise<void> {
    await this.run('readwrite', (s) => s.delete(key));
  }

  async keys(): Promise<string[]> {
    const all = await this.run('readonly', (s) => s.getAllKeys());
    return all.map(String).sort();
  }
}
