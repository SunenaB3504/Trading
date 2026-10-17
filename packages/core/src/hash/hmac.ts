import { sha256Bytes, toHex } from './sha256';
import { utf8Encode } from './utf8';

const BLOCK = 64;

/** HMAC-SHA256 (RFC 2104) of bytes, built on the pure SHA-256 so it runs on every JavaScript engine. */
export function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  const k = new Uint8Array(BLOCK);
  k.set(key.length > BLOCK ? sha256Bytes(key) : key);
  const inner = new Uint8Array(BLOCK + message.length);
  const outer = new Uint8Array(BLOCK + 32);
  for (let i = 0; i < BLOCK; i += 1) {
    inner[i] = (k[i] as number) ^ 0x36;
    outer[i] = (k[i] as number) ^ 0x5c;
  }
  inner.set(message, BLOCK);
  outer.set(sha256Bytes(inner), BLOCK);
  return sha256Bytes(outer);
}

/** Lower-case hex HMAC-SHA256 of text, with a key given as hex. */
export function hmacSha256Hex(keyHex: string, text: string): string {
  if (!/^(?:[0-9a-f]{2})+$/i.test(keyHex)) throw new RangeError('key must be hex');
  const key = Uint8Array.from(keyHex.match(/../g) ?? [], (h) => parseInt(h, 16));
  return toHex(hmacSha256(key, utf8Encode(text)));
}
