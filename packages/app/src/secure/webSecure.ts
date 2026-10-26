import type { KeyValueStore } from '../store/kv';
import { checkSecureKey } from './secureStore';
import type { SecureStore } from './secureStore';

/** Encrypted values live in the ordinary store under this prefix; only ciphertext is ever written there. */
export const SECURE_PREFIX = 'secure/';

type Subtle = SubtleCrypto;

const toB64 = (bytes: Uint8Array): string => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
const fromB64 = (text: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

interface Sealed {
  iv: string;
  data: string;
}

/**
 * The web backend of the secure store. Values are sealed with AES-GCM under a key that is created
 * non-extractable, so page code can use it but never read it out. This is weaker than an OS keystore
 * (anyone with this browser profile can still use the key), and the app says so where keys are typed.
 */
export class WebSecureStore implements SecureStore {
  constructor(
    private readonly kv: KeyValueStore,
    private readonly key: () => Promise<CryptoKey>,
    private readonly subtle: Subtle = globalThis.crypto.subtle,
  ) {}

  async get(key: string): Promise<string | null> {
    checkSecureKey(key);
    const raw = await this.kv.get(SECURE_PREFIX + key);
    if (raw === null) return null;
    try {
      const sealed = JSON.parse(raw) as Sealed;
      const plain = await this.subtle.decrypt(
        { name: 'AES-GCM', iv: fromB64(sealed.iv) },
        await this.key(),
        fromB64(sealed.data),
      );
      return new TextDecoder().decode(plain);
    } catch {
      return null; // a value sealed by a key this browser no longer has is as good as gone
    }
  }

  async set(key: string, value: string): Promise<void> {
    checkSecureKey(key);
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const data = await this.subtle.encrypt(
      { name: 'AES-GCM', iv },
      await this.key(),
      new TextEncoder().encode(value),
    );
    const sealed: Sealed = { iv: toB64(iv), data: toB64(new Uint8Array(data)) };
    await this.kv.set(SECURE_PREFIX + key, JSON.stringify(sealed));
  }

  async delete(key: string): Promise<void> {
    checkSecureKey(key);
    await this.kv.delete(SECURE_PREFIX + key);
  }
}

/** A fresh non-extractable AES-GCM key (tests, and the first run on a browser). */
export function newSealingKey(subtle: Subtle = globalThis.crypto.subtle): Promise<CryptoKey> {
  return subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

const KEY_DB = 'trading-app-secure';
const KEY_STORE = 'keys';
const KEY_ID = 'sealing';

function openKeyDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(KEY_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(KEY_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idb<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

/** The browser's sealing key, kept as a CryptoKey object in its own IndexedDB database; made on first use. */
export async function browserSealingKey(): Promise<CryptoKey> {
  const db = await openKeyDb();
  try {
    const found = await idb(db.transaction(KEY_STORE).objectStore(KEY_STORE).get(KEY_ID));
    if (found instanceof CryptoKey) return found;
    const fresh = await newSealingKey();
    await idb(db.transaction(KEY_STORE, 'readwrite').objectStore(KEY_STORE).put(fresh, KEY_ID));
    return fresh;
  } finally {
    db.close();
  }
}
