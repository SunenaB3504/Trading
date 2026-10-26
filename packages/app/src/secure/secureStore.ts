/**
 * The secure-store seam (SSD v4.1 §9): PIN hashes now, AI provider keys in Stage 5. Android keeps values in the
 * Keystore through `expo-secure-store`; the web encrypts them with a key the page cannot read back (WebCrypto).
 * Nothing kept here is ever written into a backup.
 */
export interface SecureStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

/** Keys allowed by every backend (`expo-secure-store` accepts letters, digits, `.`, `-` and `_`). */
export const SECURE_KEY = /^[A-Za-z0-9._-]+$/;

export function checkSecureKey(key: string): void {
  if (!SECURE_KEY.test(key)) throw new RangeError(`not a valid secure-store key: ${key}`);
}

export class MemorySecureStore implements SecureStore {
  private readonly map = new Map<string, string>();

  get(key: string): Promise<string | null> {
    return Promise.resolve().then(() => {
      checkSecureKey(key);
      return this.map.get(key) ?? null;
    });
  }

  set(key: string, value: string): Promise<void> {
    return Promise.resolve().then(() => {
      checkSecureKey(key);
      this.map.set(key, value);
    });
  }

  delete(key: string): Promise<void> {
    return Promise.resolve().then(() => {
      checkSecureKey(key);
      this.map.delete(key);
    });
  }
}
