import { describe, expect, it } from 'vitest';
import { canonicalJson, sha256Hex, toHex, sha256Bytes, utf8Encode } from './index';

describe('sha256 (FIPS 180-4 / NIST vectors)', () => {
  it('hashes the empty string', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('hashes "abc"', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('hashes the 448-bit message', () => {
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  it('hashes one million "a" (multi-block)', () => {
    expect(sha256Hex('a'.repeat(1_000_000))).toBe(
      'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0',
    );
  });

  it('handles every length around the block boundary', () => {
    const seen = new Set<string>();
    for (let n = 54; n <= 66; n += 1) seen.add(sha256Hex('x'.repeat(n)));
    expect(seen.size).toBe(13);
    expect(toHex(sha256Bytes(new Uint8Array(55)))).toHaveLength(64);
  });
});

describe('utf8Encode', () => {
  it('encodes 1-, 2-, 3- and 4-byte characters', () => {
    expect(Array.from(utf8Encode('A'))).toEqual([0x41]);
    expect(Array.from(utf8Encode('é'))).toEqual([0xc3, 0xa9]);
    expect(Array.from(utf8Encode('₹'))).toEqual([0xe2, 0x82, 0xb9]);
    expect(Array.from(utf8Encode('😀'))).toEqual([0xf0, 0x9f, 0x98, 0x80]);
  });

  it('replaces a lone surrogate with U+FFFD', () => {
    expect(Array.from(utf8Encode('\ud800'))).toEqual([0xef, 0xbf, 0xbd]);
  });

  it('hashes non-ASCII text via UTF-8', () => {
    expect(sha256Hex('₹')).toBe(toHex(sha256Bytes(Uint8Array.from([0xe2, 0x82, 0xb9]))));
  });
});

describe('canonicalJson', () => {
  it('sorts keys and drops whitespace', () => {
    expect(canonicalJson({ b: 1, a: [true, null, 'x'], c: { z: 2, y: 1 } })).toBe(
      '{"a":[true,null,"x"],"b":1,"c":{"y":1,"z":2}}',
    );
  });

  it('is independent of key insertion order', () => {
    expect(canonicalJson({ a: 1, b: 2 })).toBe(canonicalJson({ b: 2, a: 1 }));
  });

  it('writes negative zero as 0 and rejects non-finite or unsupported values', () => {
    expect(canonicalJson(-0)).toBe('0');
    expect(() => canonicalJson(Number.NaN)).toThrow(TypeError);
    expect(() => canonicalJson(Infinity)).toThrow(TypeError);
    expect(() => canonicalJson(undefined)).toThrow(TypeError);
    expect(() => canonicalJson({ a: undefined })).toThrow(TypeError);
  });
});
