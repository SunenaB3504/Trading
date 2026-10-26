/**
 * Mutual fund rules the practice account uses (MIP v4.1 Stage 3). These are facts that change, so each carries an
 * as-of date and a plain note; they are approximations of the rules for typical direct plans, not any one fund's
 * offer document. The lessons show "facts as of" the date below.
 */
export const FUND_FACTS_AS_OF = '2026-10-26';

/** What kind of rules a fund follows. `equity` is an equity-oriented fund (index, flexi, large, small, balanced advantage). */
export type FundRules = 'equity' | 'debt' | 'liquid' | 'other';

/** Orders received before this time (IST) on a business day get that day's NAV; later ones get the next business day's. */
export const CUTOFF_HHMM = '15:00';

/** Stamp duty on units bought: 0.005% of the amount, taken out of the amount invested. In parts per hundred thousand. */
export const STAMP_PER_100K = 5;

/** Units are kept to three decimals; a unit count here is a whole number of thousandths. */
export const UNIT_SCALE = 1_000;

/** Smallest purchase or instalment, in paise (₹100). */
export const MIN_AMOUNT_PAISE = 10_000;

/** Equity-oriented funds: STT on redemption, 0.001% of the value, in parts per million. */
export const STT_REDEMPTION_PPM = 10;

/** Exit load of an equity-oriented fund: 1% if redeemed within a year (many funds do this; some differ). */
export const EQUITY_LOAD = { withinDays: 365, ppm: 10_000 } as const;

/**
 * Liquid funds: a load set by SEBI that falls over the first week, in parts per million of the value, by days held
 * (0 = redeemed the day it was bought). From the seventh day there is none.
 */
export const LIQUID_LOAD_PPM: readonly number[] = [70, 65, 60, 55, 50, 45];

/** Exit load in parts per million for units held `daysHeld` calendar days, under a fund's rules. */
export function exitLoadPpm(rules: FundRules, daysHeld: number): number {
  if (rules === 'equity') return daysHeld < EQUITY_LOAD.withinDays ? EQUITY_LOAD.ppm : 0;
  if (rules === 'liquid') return LIQUID_LOAD_PPM[daysHeld] ?? 0;
  return 0;
}

/** Whether redemption attracts STT under a fund's rules. */
export const paysRedemptionStt = (rules: FundRules): boolean => rules === 'equity';
