import { adjustSeries } from '@trading/core';
import type { AdjustOptions, BarAdj, BarUnadj, CorporateAction } from '@trading/core';

export interface AdjustmentMismatch {
  date: string;
  field: 'close' | 'volume';
  expected: number;
  actual: number;
}

/** Splits and bonuses after `date`, as price multiplier and share multiplier (shares after / before). */
function laterFactors(
  date: string,
  actions: readonly CorporateAction[],
): { price: number; shares: number } {
  let price = 1;
  let shares = 1;
  for (const a of actions) {
    if (a.exDate > date && (a.type === 'split' || a.type === 'bonus') && a.ratio !== null) {
      price *= a.ratio.denominator / a.ratio.numerator;
      shares *= a.ratio.numerator / a.ratio.denominator;
    }
  }
  return { price, shares };
}

/**
 * Independent check that an adjusted series equals the unadjusted one times the cumulative factor
 * of the splits and bonuses after each date (no dividends). It recomputes every factor from the
 * action table with a plain loop, sharing no code with the series builder. Empty means it holds.
 */
export function verifyAdjustment(
  unadjusted: readonly BarUnadj[],
  adjusted: readonly BarAdj[],
  actions: readonly CorporateAction[],
): AdjustmentMismatch[] {
  const out: AdjustmentMismatch[] = [];
  unadjusted.forEach((u, i) => {
    const a = adjusted[i];
    const f = laterFactors(u.date, actions);
    const expectedClose = u.close * f.price;
    const expectedVolume = Math.floor(u.volume * f.shares + 0.5);
    if (a === undefined || a.date !== u.date)
      out.push({ date: u.date, field: 'close', expected: expectedClose, actual: NaN });
    else {
      if (Math.abs(a.close - expectedClose) > 1e-9 * Math.max(1, expectedClose))
        out.push({ date: u.date, field: 'close', expected: expectedClose, actual: a.close });
      if (a.volume !== expectedVolume)
        out.push({ date: u.date, field: 'volume', expected: expectedVolume, actual: a.volume });
    }
  });
  return out;
}

/** The two series kept apart: this returns a new adjusted array and never touches the unadjusted bars. */
export function buildAdjusted(
  unadjusted: readonly BarUnadj[],
  actions: readonly CorporateAction[],
  options: AdjustOptions,
): BarAdj[] {
  return adjustSeries(unadjusted, actions, options);
}
