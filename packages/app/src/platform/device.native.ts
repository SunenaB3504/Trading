import { getRandomBytes } from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { openDatabaseAsync } from 'expo-sqlite';
import { NativeSecureStore } from '../secure/nativeSecure';
import type { SecureStore } from '../secure/secureStore';
import type { KeyValueStore } from '../store/kv';
import { SqliteKv } from '../store/sqliteKv';

/** The Android build's platform pieces; same exports as `device.ts` (SSD v4.1 §9). */
export const PLATFORM: 'web' | 'android' = 'android';

export interface DeviceStores {
  kv: KeyValueStore;
  secure: SecureStore;
}

/** The device's stores: SQLite for data, the Android Keystore for secrets. */
export function openDeviceStores(): DeviceStores {
  return {
    kv: new SqliteKv(() => openDatabaseAsync('trading-app.db')),
    secure: new NativeSecureStore(),
  };
}

/** Nothing of the retired astro layer was ever stored on Android. */
export function removeRetiredStores(): Promise<void> {
  return Promise.resolve();
}

/** 32 random bytes as hex from the platform's secure generator. */
export function secureRandomHex(): string {
  return Array.from(getRandomBytes(32), (b) => b.toString(16).padStart(2, '0')).join('');
}

export type Persistence = 'granted' | 'refused' | 'unsupported';

/** App storage on Android is not cleared under pressure, so there is nothing to ask for. */
export function requestPersistence(): Promise<Persistence> {
  return Promise.resolve('granted');
}

/** Writes the text to a file and opens the share sheet so it can be saved or sent to the laptop. */
export async function offerFile(filename: string, text: string): Promise<boolean> {
  if (!(await isAvailableAsync())) return false;
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(text);
  await shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: filename });
  return true;
}

/** Lets the person choose a backup file and returns its text, or null if they cancel. */
export async function pickFileText(): Promise<string | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json', '*/*'] });
  if (picked.canceled) return null;
  return picked.result.text();
}
