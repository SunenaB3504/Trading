import { mulPaise } from '../money';
import { CorporateActionError } from './errors';

/** Shares after / shares before (see `corporateActionSchema`). */
export interface Ratio {
  numerator: number;
  denominator: number;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

export function assertRatio(r: Ratio): Ratio {
  const ok = (n: number) => Number.isSafeInteger(n) && n > 0;
  if (!ok(r.numerator) || !ok(r.denominator)) {
    throw new CorporateActionError('ratio parts must be positive safe integers');
  }
  return r;
}

export function reduceRatio(r: Ratio): Ratio {
  assertRatio(r);
  const g = gcd(r.numerator, r.denominator);
  return { numerator: r.numerator / g, denominator: r.denominator / g };
}

/** Exact product of two ratios in lowest terms; throws on overflow rather than rounding. */
export function multiplyRatios(a: Ratio, b: Ratio): Ratio {
  const x = reduceRatio(a);
  const y = reduceRatio(b);
  // Cross-reduce first so intermediate products stay as small as possible.
  const g1 = gcd(x.numerator, y.denominator);
  const g2 = gcd(y.numerator, x.denominator);
  return reduceRatio({
    numerator: mulPaise(x.numerator / g1, y.numerator / g2),
    denominator: mulPaise(x.denominator / g2, y.denominator / g1),
  });
}

/** Multiplier for prices before the ex-date: shares-before / shares-after. */
export function priceFactor(r: Ratio): number {
  return r.denominator / r.numerator;
}
