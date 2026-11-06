import { WebSecureStore, browserSealingKey } from '../secure/webSecure';
import type { SecureStore } from '../secure/secureStore';
import { IndexedDbKv } from '../store/indexedDbKv';
import type { KeyValueStore } from '../store/kv';

/**
 * The web build's platform pieces (SSD v4.1 §9). Android has its own file, `device.native.ts`, with the same
 * exports; the bundler picks one by platform, and the type checker checks both.
 */
export const PLATFORM: 'web' | 'android' = 'web';

export interface DeviceStores {
  kv: KeyValueStore;
  secure: SecureStore;
}

/** The device's stores: IndexedDB for data, WebCrypto-sealed values for secrets. */
export function openDeviceStores(): DeviceStores {
  const kv = new IndexedDbKv();
  return { kv, secure: new WebSecureStore(kv, browserSealingKey) };
}

/** Removes what the retired astro layer kept outside the main store: its own key database (D42). */
export function removeRetiredStores(): Promise<void> {
  const db = (globalThis as { indexedDB?: IDBFactory }).indexedDB;
  if (db === undefined) return Promise.resolve();
  return new Promise((resolve) => {
    const req = db.deleteDatabase('trading-app-keys');
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

/** 32 random bytes as hex from the platform's secure generator (WebCrypto on web). */
export function secureRandomHex(): string {
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (c?.getRandomValues === undefined) throw new Error('no secure random source on this device');
  const bytes = c.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export type Persistence = 'granted' | 'refused' | 'unsupported';

/** Asks the browser to keep this site's storage from being cleared under pressure (FR-X4). */
export async function requestPersistence(): Promise<Persistence> {
  const s = (globalThis as { navigator?: { storage?: { persist?: () => Promise<boolean> } } })
    .navigator?.storage;
  if (s?.persist === undefined) return 'unsupported';
  try {
    return (await s.persist()) ? 'granted' : 'refused';
  } catch {
    return 'unsupported';
  }
}

/** Offers the text as a downloaded file; false where there is no browser to do it. */
export function offerFile(filename: string, text: string): Promise<boolean> {
  const g = globalThis as {
    document?: { createElement: (t: string) => Record<string, unknown> & { click: () => void } };
    URL?: { createObjectURL: (b: unknown) => string; revokeObjectURL: (u: string) => void };
    Blob?: new (parts: string[], o: { type: string }) => unknown;
  };
  if (g.document === undefined || g.URL === undefined || g.Blob === undefined)
    return Promise.resolve(false);
  const url = g.URL.createObjectURL(new g.Blob([text], { type: filename.endsWith('.csv') ? 'text/csv' : 'application/json' }));
  const a = g.document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  g.URL.revokeObjectURL(url);
  return Promise.resolve(true);
}

/** Lets the person choose a backup file and returns its text, or null if they cancel. */
export function pickFileText(): Promise<string | null> {
  const doc = (globalThis as { document?: Document }).document;
  if (doc === undefined) return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file === undefined) resolve(null);
      else void file.text().then(resolve, () => resolve(null));
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
