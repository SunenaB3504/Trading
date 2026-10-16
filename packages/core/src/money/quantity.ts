import { MoneyError } from './errors';

/** A share quantity must be a positive safe integer. */
export function assertQuantity(n: number, label = 'quantity'): number {
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw new MoneyError(`${label} must be a positive safe integer, got ${String(n)}`);
  }
  return n;
}

/** Remaining or delta quantities may be zero (and deltas negative); they must still be integers. */
export function assertWholeShares(n: number, label = 'quantity'): number {
  if (!Number.isSafeInteger(n)) {
    throw new MoneyError(`${label} must be a safe integer, got ${String(n)}`);
  }
  return n === 0 ? 0 : n;
}
