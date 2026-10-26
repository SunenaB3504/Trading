import type { KeyValueStore } from './kv';

/** Where a profile's own data lives: every key of profile `id` is stored under this prefix. */
export const profilePrefix = (id: string): string => `p/${id}/`;

/**
 * One profile's view of the device store (SSD v4.1 §2). Keys are stored under a prefix and handed back
 * without it, so code written for a single book (the paper session, backup) works unchanged per profile.
 */
export class ScopedKv implements KeyValueStore {
  constructor(
    private readonly base: KeyValueStore,
    private readonly prefix: string,
  ) {
    if (prefix === '' || !prefix.endsWith('/')) throw new RangeError('a scope prefix ends with /');
  }

  get(key: string): Promise<string | null> {
    return this.base.get(this.prefix + key);
  }

  set(key: string, value: string): Promise<void> {
    return this.base.set(this.prefix + key, value);
  }

  delete(key: string): Promise<void> {
    return this.base.delete(this.prefix + key);
  }

  async keys(): Promise<string[]> {
    const all = await this.base.keys();
    return all.filter((k) => k.startsWith(this.prefix)).map((k) => k.slice(this.prefix.length));
  }

  /** Removes every key of this scope, for deleting a profile. */
  async clear(): Promise<void> {
    for (const k of await this.keys()) await this.delete(k);
  }
}
