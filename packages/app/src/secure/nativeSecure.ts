import { deleteItemAsync, getItemAsync, setItemAsync } from 'expo-secure-store';
import { checkSecureKey } from './secureStore';
import type { SecureStore } from './secureStore';

/** The Android backend of the secure store: values sit in the Android Keystore through `expo-secure-store`. */
export class NativeSecureStore implements SecureStore {
  get(key: string): Promise<string | null> {
    checkSecureKey(key);
    return getItemAsync(key);
  }

  set(key: string, value: string): Promise<void> {
    checkSecureKey(key);
    return setItemAsync(key, value);
  }

  delete(key: string): Promise<void> {
    checkSecureKey(key);
    return deleteItemAsync(key);
  }
}
