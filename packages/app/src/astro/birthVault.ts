import type { KeyValueStore } from '../store/kv';

/**
 * Encrypted local storage of birth details (FR-P4, NFR-4). The record in the key-value store is AES-GCM
 * ciphertext only: no name, date or place appears in it. The key is made on the device, is not
 * extractable, and is kept apart from the record. Removing the details also destroys the key, so even a
 * copy of the old ciphertext can no longer be read. Nothing here touches the network.
 */
export const BIRTH_KEY = 'profile/birth';

/** What the owner types on the birth-details screen. */
export interface BirthProfile {
  name: string;
  date: string;
  time: string;
  /** A place from the offline gazetteer, written as "Name, CC". */
  place: string;
}

/** Shown beside the birth-details form on the web build (FR-P4). */
export const WEB_PROTECTION_NOTICE =
  'Your birth details are encrypted on this device, but on the web the key is kept in this browser, ' +
  'so anyone who can use this browser profile may be able to read them. The Android app keeps the key ' +
  "in the phone's secure storage, which is stronger.";

/** Where the encryption key lives: IndexedDB on the web, the platform keystore on Android. */
export interface KeyProvider {
  /** The key; made on first use when `create` is true, otherwise null if there is none. */
  getKey(create: boolean): Promise<CryptoKey | null>;
  deleteKey(): Promise<void>;
}

export type LoadResult =
  | { state: 'none' }
  | { state: 'ok'; profile: BirthProfile }
  | { state: 'unreadable'; reason: 'no-key' | 'corrupt' };

interface Sealed {
  v: 1;
  iv: string;
  ct: string;
}

const AAD = new TextEncoder().encode('birth-v1');
const IV_BYTES = 12;

const toHex = (b: Uint8Array): string =>
  Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const fromHex = (s: string): Uint8Array<ArrayBuffer> => {
  if (!/^([0-9a-f]{2})*$/.test(s)) throw new Error('not hex');
  return Uint8Array.from(s.match(/../g) ?? [], (h) => parseInt(h, 16));
};

function isProfile(x: unknown): x is BirthProfile {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return ['name', 'date', 'time', 'place'].every((k) => typeof o[k] === 'string');
}

export class BirthVault {
  constructor(
    private readonly kv: KeyValueStore,
    private readonly keys: KeyProvider,
    private readonly random: (n: number) => Uint8Array<ArrayBuffer> = (n) =>
      crypto.getRandomValues(new Uint8Array(n)),
  ) {}

  async save(profile: BirthProfile): Promise<void> {
    const key = (await this.keys.getKey(true)) as CryptoKey;
    const iv = this.random(IV_BYTES);
    const plain = new TextEncoder().encode(JSON.stringify(profile));
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: AAD },
      key,
      plain,
    );
    const sealed: Sealed = { v: 1, iv: toHex(iv), ct: toHex(new Uint8Array(ct)) };
    await this.kv.set(BIRTH_KEY, JSON.stringify(sealed));
  }

  async has(): Promise<boolean> {
    return (await this.kv.get(BIRTH_KEY)) !== null;
  }

  async load(): Promise<LoadResult> {
    const raw = await this.kv.get(BIRTH_KEY);
    if (raw === null) return { state: 'none' };
    const key = await this.keys.getKey(false);
    if (key === null) return { state: 'unreadable', reason: 'no-key' };
    try {
      const sealed = JSON.parse(raw) as Sealed;
      const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fromHex(sealed.iv), additionalData: AAD },
        key,
        fromHex(sealed.ct),
      );
      const profile: unknown = JSON.parse(new TextDecoder().decode(plain));
      return isProfile(profile)
        ? { state: 'ok', profile }
        : { state: 'unreadable', reason: 'corrupt' };
    } catch {
      return { state: 'unreadable', reason: 'corrupt' };
    }
  }

  /** Deletes the details and the key (NFR-4). Safe to call when nothing is stored. */
  async remove(): Promise<void> {
    await this.kv.delete(BIRTH_KEY);
    await this.keys.deleteKey();
  }
}

const KEY_DB = 'trading-app-keys';
const KEY_STORE = 'keys';
const KEY_ID = 'birth';

function openKeyDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(KEY_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(KEY_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, use: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openKeyDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const r = use(db.transaction(KEY_STORE, mode).objectStore(KEY_STORE));
        r.onsuccess = () => {
          db.close();
          resolve(r.result);
        };
        r.onerror = () => {
          db.close();
          reject(r.error);
        };
      }),
  );
}

/** Web key store: a non-extractable AES-GCM key held as an object in its own IndexedDB database. */
export class IndexedDbKeyProvider implements KeyProvider {
  async getKey(create: boolean): Promise<CryptoKey | null> {
    const have = (await run('readonly', (s) => s.get(KEY_ID) as IDBRequest<unknown>)) as
      CryptoKey | undefined;
    if (have !== undefined) return have;
    if (!create) return null;
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ]);
    await run('readwrite', (s) => s.put(key, KEY_ID));
    return key;
  }

  async deleteKey(): Promise<void> {
    await run('readwrite', (s) => s.delete(KEY_ID));
  }
}

/** In-memory key store for tests and previews; the key is still non-extractable. */
export class MemoryKeyProvider implements KeyProvider {
  private key: CryptoKey | null = null;

  async getKey(create: boolean): Promise<CryptoKey | null> {
    if (this.key === null && create) {
      this.key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
        'encrypt',
        'decrypt',
      ]);
    }
    return this.key;
  }

  deleteKey(): Promise<void> {
    this.key = null;
    return Promise.resolve();
  }
}
