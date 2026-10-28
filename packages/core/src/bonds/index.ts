/**
 * Bond calculator (MIP v4.1 Stage 9): price from yield, yield from price, current yield, duration and the effect of a
 * change in yield. Plain numbers for teaching, for bonds bought on a coupon date (no accrued interest). A coupon is
 * paid `frequency` times a year; yields are yearly rates compounded at that frequency.
 */
export interface Bond {
  /** Face value in rupees, 100 or 1,000 as the issue states. */
  face: number;
  /** Yearly coupon rate as a fraction, 0.07 for 7%. */
  coupon: number;
  /** Years left to maturity; a whole number of coupon periods. */
  years: number;
  /** Coupons a year: 1 or 2. */
  frequency: 1 | 2;
}

/** Why the bond cannot be worked out, or null. */
export function bondProblem(b: Bond): string | null {
  if (!(b.face > 0)) return 'The face value must be above zero.';
  if (!(b.coupon >= 0 && b.coupon <= 0.5)) return 'The coupon rate must be between 0% and 50%.';
  const n = b.years * b.frequency;
  if (!Number.isInteger(n) || n < 1 || n > 100 * b.frequency) return 'Years left must be a whole number of coupon periods, up to 100 years.';
  return null;
}

/** Cash flows by period (1-based), the last including the face value. */
export function cashFlows(b: Bond): number[] {
  const n = b.years * b.frequency;
  const c = (b.face * b.coupon) / b.frequency;
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? c + b.face : c));
}

/** Price in rupees for a yearly yield (fraction). */
export function priceFromYield(b: Bond, ytm: number): number {
  const r = ytm / b.frequency;
  return cashFlows(b).reduce((a, cf, i) => a + cf / (1 + r) ** (i + 1), 0);
}

/** Yearly yield that gives `price`; null when the price is outside 0.01% to 100% yield. */
export function yieldFromPrice(b: Bond, price: number): number | null {
  let lo = 0.0001;
  let hi = 1;
  if (price > priceFromYield(b, lo) || price < priceFromYield(b, hi)) return null;
  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2;
    if (priceFromYield(b, mid) > price) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export const currentYield = (b: Bond, price: number): number => (b.face * b.coupon) / price;

/** Macaulay duration in years: the average time to the cash flows, weighted by their present value. */
export function macaulay(b: Bond, ytm: number): number {
  const r = ytm / b.frequency;
  const p = priceFromYield(b, ytm);
  const w = cashFlows(b).reduce((a, cf, i) => a + ((i + 1) * cf) / (1 + r) ** (i + 1), 0);
  return w / p / b.frequency;
}

/** Modified duration: the fall in price, as a fraction, for a 1.00 (100 percentage point) rise in yield. */
export const modified = (b: Bond, ytm: number): number => macaulay(b, ytm) / (1 + ytm / b.frequency);

export interface Shock {
  /** Yield change as a fraction, 0.01 for one percentage point. */
  change: number;
  price: number;
  /** Exact change in price, as a fraction of today's price. */
  exact: number;
  /** The change estimated from modified duration alone. */
  estimated: number;
}

/** What a rise or fall in yield does to the price, exactly and as estimated by duration. */
export function shock(b: Bond, ytm: number, change: number): Shock {
  const p0 = priceFromYield(b, ytm);
  const p1 = priceFromYield(b, Math.max(0.0001, ytm + change));
  return { change, price: p1, exact: p1 / p0 - 1, estimated: -modified(b, ytm) * change };
}
