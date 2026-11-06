/**
 * A record whose values are worked out on first read and then kept. A market of over a thousand stocks decodes and
 * adjusts only the stocks a screen or a book actually touches, so opening the app stays light on a phone (D44).
 */
export function lazyRecord<T>(keys: readonly string[], compute: (key: string) => T): Record<string, T> {
  const out: Record<string, T> = {};
  for (const key of keys) {
    Object.defineProperty(out, key, {
      enumerable: true,
      configurable: true,
      get() {
        const value = compute(key);
        Object.defineProperty(out, key, { value, enumerable: true, writable: true, configurable: true });
        return value;
      },
    });
  }
  return out;
}
