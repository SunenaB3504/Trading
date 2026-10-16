import { MoneyError } from './errors';

/** Collapses -0 to 0 so that results hash and serialise identically. */
function normalizeZero(n: number): number {
  return n === 0 ? 0 : n;
}

/**
 * Returns `n` if it is a safe integer, otherwise throws. Every ledger write must pass
 * through this check (SSD §5.2). Safe up to about ₹90 lakh crore in paise.
 */
export function assertPaise(n: number, label = 'amount'): number {
  if (!Number.isSafeInteger(n)) {
    throw new MoneyError(`${label} must be a safe integer number of paise, got ${String(n)}`);
  }
  return normalizeZero(n);
}

/** Like `assertPaise` for a computed result: an unsafe value means an overflow happened. */
function checked(n: number, op: string): number {
  if (!Number.isSafeInteger(n)) {
    throw new MoneyError(`${op} overflowed or lost precision: ${String(n)}`);
  }
  return normalizeZero(n);
}

export function addPaise(a: number, b: number): number {
  return checked(assertPaise(a) + assertPaise(b), 'addPaise');
}

export function subPaise(a: number, b: number): number {
  return checked(assertPaise(a) - assertPaise(b), 'subPaise');
}

export function negatePaise(a: number): number {
  return normalizeZero(-assertPaise(a));
}

/** Multiplies an amount by an integer count (for example price × quantity). */
export function mulPaise(amount: number, count: number): number {
  return checked(assertPaise(amount) * assertPaise(count, 'count'), 'mulPaise');
}

export function sumPaise(values: readonly number[]): number {
  let total = 0;
  for (const v of values) total = addPaise(total, v);
  return total;
}
