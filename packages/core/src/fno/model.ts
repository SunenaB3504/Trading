/**
 * Option pricing (MIP v4.1 Stage 8): the Black-Scholes model for European options on a futures-like underlying with
 * a continuous interest rate and no dividends. Prices and Greeks are plain numbers for teaching and charts; the
 * book works in whole paise and rounds a model price once, at the point of use.
 */

export type OptionKind = 'CE' | 'PE';

/** Standard normal density. */
const pdf = (x: number): number => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

/** Standard normal distribution function (Numerical Recipes erfc; error under 1.2e-7). */
export function normCdf(x: number): number {
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.5 * z);
  const poly =
    -z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))));
  const erfc = t * Math.exp(poly);
  return x >= 0 ? 1 - 0.5 * erfc : 0.5 * erfc;
}

export interface Inputs {
  spot: number;
  strike: number;
  /** Years to expiry (calendar days / 365). */
  years: number;
  /** Yearly interest rate as a fraction, 0.065 for 6.5%. */
  rate: number;
  /** Yearly volatility as a fraction, 0.2 for 20%. */
  vol: number;
}

export const intrinsic = (kind: OptionKind, spot: number, strike: number): number => Math.max(0, kind === 'CE' ? spot - strike : strike - spot);

function d1d2(i: Inputs): { d1: number; d2: number } {
  const s = i.vol * Math.sqrt(i.years);
  const d1 = (Math.log(i.spot / i.strike) + (i.rate + 0.5 * i.vol * i.vol) * i.years) / s;
  return { d1, d2: d1 - s };
}

/** Model value of one unit. At or after expiry, or with no volatility, it is the intrinsic value. */
export function price(kind: OptionKind, i: Inputs): number {
  if (i.years <= 0 || i.vol <= 0) return intrinsic(kind, i.spot, i.strike);
  const { d1, d2 } = d1d2(i);
  const disc = Math.exp(-i.rate * i.years);
  return kind === 'CE' ? i.spot * normCdf(d1) - i.strike * disc * normCdf(d2) : i.strike * disc * normCdf(-d2) - i.spot * normCdf(-d1);
}

export interface Greeks {
  delta: number;
  gamma: number;
  /** Change in value per calendar day passing. */
  theta: number;
  /** Change in value for one percentage point of volatility. */
  vega: number;
  /** Change in value for one percentage point of interest rate. */
  rho: number;
}

/** The Greeks of one unit. At expiry delta is 1, -1 or 0 and the rest are 0. */
export function greeks(kind: OptionKind, i: Inputs): Greeks {
  if (i.years <= 0 || i.vol <= 0) {
    const itm = kind === 'CE' ? i.spot > i.strike : i.spot < i.strike;
    return { delta: itm ? (kind === 'CE' ? 1 : -1) : 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
  }
  const { d1, d2 } = d1d2(i);
  const root = Math.sqrt(i.years);
  const disc = Math.exp(-i.rate * i.years);
  const decay = -(i.spot * pdf(d1) * i.vol) / (2 * root);
  const carry = i.rate * i.strike * disc;
  const theta = kind === 'CE' ? decay - carry * normCdf(d2) : decay + carry * normCdf(-d2);
  return {
    delta: kind === 'CE' ? normCdf(d1) : normCdf(d1) - 1,
    gamma: pdf(d1) / (i.spot * i.vol * root),
    theta: theta / 365,
    vega: (i.spot * pdf(d1) * root) / 100,
    rho: ((kind === 'CE' ? 1 : -1) * i.strike * i.years * disc * normCdf(kind === 'CE' ? d2 : -d2)) / 100,
  };
}

/**
 * The volatility that makes the model value equal `target`, found by bisection between 1% and 500%; null when the
 * target is below the intrinsic value or above what any volatility can give.
 */
export function impliedVol(kind: OptionKind, target: number, i: Omit<Inputs, 'vol'>): number | null {
  if (i.years <= 0) return null;
  let lo = 0.01;
  let hi = 5;
  const at = (v: number): number => price(kind, { ...i, vol: v });
  if (target < at(lo) - 1e-9 || target > at(hi) + 1e-9) return null;
  for (let n = 0; n < 80; n += 1) {
    const mid = (lo + hi) / 2;
    if (at(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
