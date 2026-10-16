import { MoneyError } from './errors';
import { assertPaise } from './paise';

/**
 * Rounding applied to the magnitude of a result:
 * - `half_up`: half away from zero (the registered default for cost lines, FR-T4)
 * - `half_even`: banker's rounding
 * - `down`: toward zero
 * - `up`: away from zero
 */
export type RoundingMode = 'half_up' | 'half_even' | 'down' | 'up';

function assertPositiveDivisor(d: number): void {
  if (!Number.isSafeInteger(d) || d <= 0) {
    throw new MoneyError(`divisor must be a positive safe integer, got ${String(d)}`);
  }
}

/** True when the discarded remainder `r` (0 <= r < d) should add one to the magnitude. */
function shouldIncrement(
  r: number,
  d: number,
  mode: RoundingMode,
  quotientIsOdd: boolean,
): boolean {
  if (r === 0 || mode === 'down') return false;
  if (mode === 'up') return true;
  const other = d - r;
  if (r !== other) return r > other;
  return mode === 'half_up' ? true : quotientIsOdd;
}

/**
 * Integer division `n / d` rounded per `mode`, in exact integer arithmetic.
 * `evenBase` is added to the quotient when judging parity for `half_even`, so that a
 * caller splitting a larger product keeps the parity of the whole result.
 */
export function roundDiv(n: number, d: number, mode: RoundingMode, evenBase = 0): number {
  assertPaise(n, 'numerator');
  assertPositiveDivisor(d);
  const magnitude = Math.abs(n);
  const q = Math.floor(magnitude / d);
  const r = magnitude - q * d;
  const odd = ((q % 2) + (evenBase % 2)) % 2 === 1;
  const rounded = q + (shouldIncrement(r, d, mode, odd) ? 1 : 0);
  return n < 0 && rounded !== 0 ? -rounded : rounded;
}

/**
 * Computes `amount × num / den` rounded per `mode` without BigInt or float error.
 * The split `amount = q·den + r` keeps every intermediate within safe integers
 * whenever `r × num` and `q × num` are themselves safe; otherwise it throws.
 */
export function mulDiv(amount: number, num: number, den: number, mode: RoundingMode): number {
  assertPaise(amount, 'amount');
  assertPaise(num, 'numerator');
  assertPositiveDivisor(den);
  if (num < 0) throw new MoneyError('numerator must not be negative');
  const magnitude = Math.abs(amount);
  const q = Math.floor(magnitude / den);
  const r = magnitude - q * den;
  const whole = q * num;
  const part = r * num;
  if (!Number.isSafeInteger(whole) || !Number.isSafeInteger(part)) {
    throw new MoneyError('mulDiv overflow: operands too large for exact integer arithmetic');
  }
  const total = whole + roundDiv(part, den, mode, whole);
  if (!Number.isSafeInteger(total)) throw new MoneyError('mulDiv result overflowed');
  return amount < 0 && total !== 0 ? -total : total;
}

/**
 * Applies a rate in parts per billion (1% = 10_000_000 ppb; Rs 10 per crore = 1_000 ppb) to an
 * amount in paise. Exchange charges are quoted per crore, which ppm cannot express exactly.
 */
export function applyRatePpb(amountPaise: number, ratePpb: number, mode: RoundingMode): number {
  return mulDiv(amountPaise, ratePpb, 1_000_000_000, mode);
}

/** Applies a rate expressed in parts per million (1% = 10_000 ppm) to an amount. */
export function applyRatePpm(amountPaise: number, ratePpm: number, mode: RoundingMode): number {
  return mulDiv(amountPaise, ratePpm, 1_000_000, mode);
}
