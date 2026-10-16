/** Differential test: core's pure-TypeScript SHA-256 must equal Node's crypto on random input. */
import { createHash } from 'node:crypto';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { sha256Bytes, toHex, utf8Encode } from '../packages/core/src/hash';

describe('core sha256 vs node:crypto', () => {
  it('agrees on random byte arrays of many lengths', () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 700 }), (bytes) => {
        const expected = createHash('sha256').update(bytes).digest('hex');
        expect(toHex(sha256Bytes(bytes))).toBe(expected);
      }),
      { numRuns: 500 },
    );
  });

  it('agrees on random unicode text through the UTF-8 encoder', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary', maxLength: 200 }), (text) => {
        const expected = createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
        expect(toHex(sha256Bytes(utf8Encode(text)))).toBe(expected);
      }),
      { numRuns: 300 },
    );
  });
});
