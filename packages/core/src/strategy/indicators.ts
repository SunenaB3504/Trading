/**
 * Chart indicators (MIP v4.1 Stage 7). Plain functions over a list of numbers; each returns a list of the same
 * length with `null` where there are not yet enough values. They look only backwards, so a value on a day never
 * depends on a later day.
 */

/** Simple moving average of the last `period` values. */
export function sma(values: readonly number[], period: number): Array<number | null> {
  if (!Number.isInteger(period) || period < 1) throw new RangeError('period must be a whole number, at least 1');
  const out: Array<number | null> = [];
  let sum = 0;
  values.forEach((v, i) => {
    sum += v;
    if (i >= period) sum -= values[i - period] as number;
    out.push(i >= period - 1 ? sum / period : null);
  });
  return out;
}

/** Exponential moving average, started from the simple average of the first `period` values. */
export function ema(values: readonly number[], period: number): Array<number | null> {
  if (!Number.isInteger(period) || period < 1) throw new RangeError('period must be a whole number, at least 1');
  const k = 2 / (period + 1);
  const out: Array<number | null> = [];
  let prev: number | null = null;
  values.forEach((v, i) => {
    if (i < period - 1) {
      out.push(null);
    } else if (prev === null) {
      prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
      out.push(prev);
    } else {
      prev = v * k + prev * (1 - k);
      out.push(prev);
    }
  });
  return out;
}

const rsiOf = (gain: number, loss: number): number => (loss === 0 ? (gain === 0 ? 50 : 100) : 100 - 100 / (1 + gain / loss));

/** Relative strength index (Wilder's smoothing), 0 to 100; the first value needs `period` price changes. */
export function rsi(closes: readonly number[], period = 14): Array<number | null> {
  if (!Number.isInteger(period) || period < 1) throw new RangeError('period must be a whole number, at least 1');
  const out: Array<number | null> = closes.map(() => null);
  if (closes.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i += 1) {
    const d = (closes[i] as number) - (closes[i - 1] as number);
    if (d > 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  out[period] = rsiOf(gain, loss);
  for (let i = period + 1; i < closes.length; i += 1) {
    const d = (closes[i] as number) - (closes[i - 1] as number);
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = rsiOf(gain, loss);
  }
  return out;
}
