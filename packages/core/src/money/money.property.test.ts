import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { addPaise, formatPaise, mulDiv, parsePaise, roundDiv, subPaise, sumPaise } from './index';
import type { RoundingMode } from './index';

const modes: RoundingMode[] = ['half_up', 'half_even', 'down', 'up'];
const modeArb = fc.constantFrom(...modes);
const smallPaise = fc.integer({ min: -1_000_000_000_000, max: 1_000_000_000_000 });

/** Independent oracle using BigInt: exact a·m/d with the same rounding rules. */
function oracle(a: number, m: number, d: number, mode: RoundingMode): number {
  const neg = a < 0;
  const num = BigInt(Math.abs(a)) * BigInt(m);
  const den = BigInt(d);
  const q = num / den;
  const r = num % den;
  const twice = 2n * r;
  let inc = false;
  if (r !== 0n && mode !== 'down') {
    if (mode === 'up') inc = true;
    else if (twice > den) inc = true;
    else if (twice === den) inc = mode === 'half_up' ? true : q % 2n === 1n;
  }
  const mag = Number(q + (inc ? 1n : 0n));
  return neg && mag !== 0 ? -mag : mag;
}

describe('money properties', () => {
  it('add and subtract are inverses and sum is order-independent', () => {
    fc.assert(
      fc.property(smallPaise, smallPaise, (a, b) => {
        expect(subPaise(addPaise(a, b), b)).toBe(a);
        expect(sumPaise([a, b])).toBe(sumPaise([b, a]));
      }),
    );
  });

  it('a split into parts sums back to the whole', () => {
    fc.assert(
      fc.property(fc.array(smallPaise, { maxLength: 50 }), (xs) => {
        const total = sumPaise(xs);
        const half = Math.floor(xs.length / 2);
        expect(addPaise(sumPaise(xs.slice(0, half)), sumPaise(xs.slice(half)))).toBe(total);
      }),
    );
  });

  it('mulDiv matches an exact BigInt oracle for every rounding mode', () => {
    fc.assert(
      fc.property(
        // |a| x m stays below 2^53 so the exact result is representable; larger products must throw.
        fc.integer({ min: -1_000_000_000, max: 1_000_000_000 }),
        fc.integer({ min: 0, max: 5_000_000 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        modeArb,
        (a, m, d, mode) => {
          expect(mulDiv(a, m, d, mode)).toBe(oracle(a, m, d, mode));
        },
      ),
      { numRuns: 2_000 },
    );
  });

  it('throws rather than returning an inexact result when the product is unsafe', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4_000_000_000_000, max: 9_000_000_000_000_000 }),
        fc.integer({ min: 4_000, max: 5_000_000 }),
        (a, m) => {
          expect(() => mulDiv(a, m, 1, 'half_up')).toThrow();
        },
      ),
    );
  });

  it('roundDiv with identity numerator reproduces the integer', () => {
    fc.assert(
      fc.property(smallPaise, modeArb, (a, mode) => {
        expect(roundDiv(a, 1, mode)).toBe(a);
      }),
    );
  });

  it('down never exceeds half_up, which never exceeds up (on magnitude)', () => {
    fc.assert(
      fc.property(smallPaise, fc.integer({ min: 1, max: 100_000 }), (n, d) => {
        const lo = Math.abs(roundDiv(n, d, 'down'));
        const mid = Math.abs(roundDiv(n, d, 'half_up'));
        const hi = Math.abs(roundDiv(n, d, 'up'));
        expect(lo <= mid && mid <= hi && hi - lo <= 1).toBe(true);
      }),
    );
  });

  it('format then parse round-trips', () => {
    fc.assert(
      fc.property(fc.integer({ min: -9_999_999_999_999, max: 9_999_999_999_999 }), (p) => {
        expect(parsePaise(formatPaise(p))).toBe(p);
      }),
    );
  });
});
