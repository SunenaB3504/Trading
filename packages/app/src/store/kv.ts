/**
 * The storage seam of SSD §7.5. Web uses IndexedDB, Android will use SQLite, tests use memory; the app
 * only ever sees this interface. Values are JSON text so every backend stores the same thing.
 */
export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

export class MemoryKv implements KeyValueStore {
  private readonly map = new Map<string, string>();

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.map.get(key) ?? null);
  }

  set(key: string, value: string): Promise<void> {
    this.map.set(key, value);
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.map.delete(key);
    return Promise.resolve();
  }

  keys(): Promise<string[]> {
    return Promise.resolve([...this.map.keys()].sort());
  }
}

/** Value saved with the time it was saved, so a stale copy can say how old it is. */
export interface Stamped<T> {
  savedAt: number;
  value: T;
}

export async function putStamped<T>(
  kv: KeyValueStore,
  key: string,
  value: T,
  now: number,
): Promise<void> {
  const stamped: Stamped<T> = { savedAt: now, value };
  await kv.set(key, JSON.stringify(stamped));
}

export async function getStamped<T>(kv: KeyValueStore, key: string): Promise<Stamped<T> | null> {
  const text = await kv.get(key);
  if (text === null) return null;
  try {
    return JSON.parse(text) as Stamped<T>;
  } catch {
    return null;
  }
}
