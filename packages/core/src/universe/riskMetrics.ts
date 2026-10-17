/** Simple daily returns from consecutive closes; a non-positive close ends the series with a gap error. */
export function simpleReturns(closes: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    const prev = closes[i - 1] as number;
    const next = closes[i] as number;
    if (!(prev > 0) || !(next > 0)) throw new RangeError('closes must be positive');
    out.push(next / prev - 1);
  }
  return out;
}

const meanOf = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Sample standard deviation of returns scaled to a year; null with fewer than two observations. */
export function annualisedVolatility(
  returns: readonly number[],
  periodsPerYear = 252,
): number | null {
  if (returns.length < 2) return null;
  const m = meanOf(returns);
  const ss = returns.reduce((a, r) => a + (r - m) * (r - m), 0);
  return Math.sqrt(ss / (returns.length - 1)) * Math.sqrt(periodsPerYear);
}

/**
 * Slope of the stock's returns on the market's over the same dates: covariance over variance.
 * The two series must be aligned and of equal length; null if the market did not move.
 */
export function beta(stock: readonly number[], market: readonly number[]): number | null {
  if (stock.length !== market.length) throw new RangeError('series must be aligned');
  if (stock.length < 2) return null;
  const ms = meanOf(stock);
  const mm = meanOf(market);
  let cov = 0;
  let varM = 0;
  for (let i = 0; i < stock.length; i += 1) {
    const dm = (market[i] as number) - mm;
    cov += ((stock[i] as number) - ms) * dm;
    varM += dm * dm;
  }
  return varM === 0 ? null : cov / varM;
}
