import type { BarUnadj } from '../domain/market';

/**
 * F&O facts (SSD v4.1 §3): every rate or rule that can change is here once, with its date and source. The values are
 * the ones Investor Guide 3 reports for 2026 and are labelled approximate on screen.
 */
export const FNO_FACTS_AS_OF = '2026-10-24';

export type UnderlyingId = 'NIFTY' | 'BANKNIFTY';

export interface UnderlyingSpec {
  id: UnderlyingId;
  label: string;
  lot: number;
  /** Gap between strikes in rupees. */
  step: number;
  /** The exchange-traded fund whose price stands in for the index, and the multiple to turn it into index points. */
  etf: string;
  factor: number;
  /** Weekly contracts expire on this weekday (0 = Sunday); monthly contracts on its last one in the month. */
  weekly: boolean;
}

export const UNDERLYINGS: Readonly<Record<UnderlyingId, UnderlyingSpec>> = {
  NIFTY: { id: 'NIFTY', label: 'Nifty 50', lot: 65, step: 50, etf: 'NIFTYBEES', factor: 100, weekly: true },
  BANKNIFTY: { id: 'BANKNIFTY', label: 'Bank Nifty', lot: 30, step: 100, etf: 'BANKBEES', factor: 100, weekly: false },
};

/** Tuesday: the expiry weekday reported for 2026. */
export const EXPIRY_WEEKDAY = 2;

export const FNO_FACTS = {
  /** Yearly interest rate used for futures prices and option values, in basis points. */
  rateBps: 650,
  /** Approximate margin blocked: share of the contract value (the underlying times the lot size). */
  futuresMarginBps: 1_200,
  shortOptionMarginBps: 1_000,
  /** Capital of an F&O practice account. */
  capitalPaise: 100_000_000,
  /** Charges, in parts per million of turnover unless a flat amount. */
  costs: {
    brokeragePaise: 2_000,
    futuresSttSellPpm: 500,
    optionsSttSellPpm: 1_500,
    exerciseSttPpm: 1_500,
    futuresExchangePpm: 20,
    optionsExchangePpm: 350,
    gstPct: 18,
    futuresStampBuyPpm: 20,
    optionsStampBuyPpm: 30,
  },
} as const;

export const FNO_CAVEATS =
  'Prices here are modelled from the closing and opening price of the Nifty and Bank Nifty exchange-traded funds with a volatility taken from recent moves. They are not exchange prices. Lot sizes, margins and charges are approximate values as of ' +
  FNO_FACTS_AS_OF +
  '.';

/** Index points, in paise, from the fund's price in paise. */
export const indexPaise = (u: UnderlyingSpec, etfPaise: number): number => etfPaise * u.factor;

export type SpotField = 'open' | 'close';

/** Read access to an underlying's history: the model needs only open and close prices and the earlier closes. */
export interface FnoData {
  /** Session dates, ascending, on which every underlying has a price. */
  dates: readonly string[];
  /** Index level in paise on a date at the open or the close, or null with no price. */
  spot(u: UnderlyingId, date: string, field: SpotField): number | null;
  /** Closing levels up to and including `date`, newest last, at most `count` of them. */
  closes(u: UnderlyingId, date: string, count: number): number[];
}

/** Builds the data view from the bars of each underlying's fund. */
export function fnoDataFrom(bars: Readonly<Record<UnderlyingId, readonly BarUnadj[]>>): FnoData {
  const index = (u: UnderlyingId): Map<string, number> => new Map((bars[u] ?? []).map((b, i) => [b.date, i]));
  const at = { NIFTY: index('NIFTY'), BANKNIFTY: index('BANKNIFTY') };
  const dates = (bars.NIFTY ?? []).map((b) => b.date).filter((d) => at.BANKNIFTY.has(d));
  return {
    dates,
    spot(u, date, field) {
      const i = at[u].get(date);
      const bar = i === undefined ? undefined : bars[u][i];
      return bar === undefined ? null : indexPaise(UNDERLYINGS[u], bar[field]);
    },
    closes(u, date, count) {
      const list = bars[u];
      let hi = list.length;
      let lo = 0;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if ((list[mid] as BarUnadj).date <= date) lo = mid + 1;
        else hi = mid;
      }
      return list.slice(Math.max(0, lo - count), lo).map((b) => indexPaise(UNDERLYINGS[u], b.close));
    },
  };
}
