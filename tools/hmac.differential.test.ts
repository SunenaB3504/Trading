/** Differential test: core's pure-TypeScript HMAC-SHA256 must equal Node's crypto on random keys and messages. */
import { createHmac } from 'node:crypto';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { hmacSha256, toHex } from '../packages/core/src/hash';

describe('core hmacSha256 vs node:crypto', () => {
  it('agrees for keys shorter than, equal to and longer than the 64-byte block', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ maxLength: 200 }),
        fc.uint8Array({ maxLength: 400 }),
        (key, message) => {
          const expected = createHmac('sha256', key).update(message).digest('hex');
          expect(toHex(hmacSha256(key, message))).toBe(expected);
        },
      ),
      { numRuns: 500 },
    );
  });
});
