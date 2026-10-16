import type { TradingDate } from '../domain/primitives';

/**
 * Effective-dated rate tables for equity cash trades (FR-T4). Source: the owner-supplied
 * research file docs/data-sources/india_equity_cost_rates_2020-04-01_to_2026-10-16.csv.
 * Rates are in parts per billion of turnover: Rs 10 per crore = 1_000 ppb; 0.1% = 1_000_000 ppb.
 * `unverified` carries the reason when the research file marks the value UNVERIFIED or inferred.
 */
export const SCHEDULE_VERSION = 'costs-2026-10-16.1';

export interface DatedRate {
  from: TradingDate;
  /** Inclusive; null means still in force. */
  to: TradingDate | null;
  ratePpb: number;
  unverified?: string;
}

/** First date with any schedule; earlier trades are rejected. */
export const SCHEDULE_START: TradingDate = '2020-04-01';

/**
 * Securities Transaction Tax (unchanged for equity cash). Delivery: both legs 0.1%.
 * Intraday: sell leg 0.025% only. Exchanges may round STT to the nearest rupee per trade; that is
 * not modelled (unverified).
 */
export const STT_DELIVERY: DatedRate[] = [
  {
    from: '2020-04-01',
    to: '2024-09-30',
    ratePpb: 1_000_000,
    unverified: 'stt.pre-2024-10-inferred',
  },
  { from: '2024-10-01', to: null, ratePpb: 1_000_000 },
];
export const STT_INTRADAY_SELL: DatedRate[] = [
  {
    from: '2020-04-01',
    to: '2024-09-30',
    ratePpb: 250_000,
    unverified: 'stt.pre-2024-10-inferred',
  },
  { from: '2024-10-01', to: null, ratePpb: 250_000 },
];

/**
 * NSE transaction charge plus IPFT contribution, first slab (monthly turnover far below the
 * Rs 1,250 crore tier boundary for a Rs 10 lakh account). Combined into one line.
 */
export const EXCHANGE_NSE: DatedRate[] = [
  { from: '2020-04-01', to: '2020-12-31', ratePpb: 32_501 },
  { from: '2021-01-01', to: '2023-03-31', ratePpb: 34_501 },
  { from: '2023-04-01', to: '2024-03-31', ratePpb: 33_500 },
  {
    from: '2024-04-01',
    to: '2024-09-30',
    ratePpb: 33_200,
    unverified: 'exchange.nse-ipft-2024-inferred',
  },
  { from: '2024-10-01', to: null, ratePpb: 30_700 },
];

/** BSE cash, including its investor-protection contribution. Rates before 2022-12 are unknown. */
export const EXCHANGE_BSE: DatedRate[] = [{ from: '2022-12-01', to: null, ratePpb: 37_500 }];

export const SEBI_FEE: DatedRate[] = [{ from: '2020-04-01', to: null, ratePpb: 1_000 }];

/** Stamp duty on the buy leg. Before 2020-07-01 the regime was state-wise (rate unverified). */
export const STAMP_DELIVERY_BUY: DatedRate[] = [
  {
    from: '2020-04-01',
    to: '2020-06-30',
    ratePpb: 150_000,
    unverified: 'stamp.pre-2020-07-state-wise',
  },
  { from: '2020-07-01', to: null, ratePpb: 150_000 },
];
export const STAMP_INTRADAY_BUY: DatedRate[] = [
  {
    from: '2020-04-01',
    to: '2020-06-30',
    ratePpb: 30_000,
    unverified: 'stamp.pre-2020-07-state-wise',
  },
  { from: '2020-07-01', to: null, ratePpb: 30_000 },
];

/** GST as numerator over 100, applied to brokerage, exchange charges, SEBI fee and DP charges. */
export const GST_PERCENT = 18;

/** Depository's own charge per scrip per delivery-sell day, in paise. */
export interface DatedAmount {
  from: TradingDate;
  to: TradingDate | null;
  paise: number;
  unverified?: string;
}
export const DP_DEPOSITORY: DatedAmount[] = [
  {
    from: '2020-04-01',
    to: '2024-09-30',
    paise: 550,
    unverified: 'dp.cdsl-pre-2024-10-slab-undated',
  },
  { from: '2024-10-01', to: null, paise: 350 },
];

function covers(entry: { from: TradingDate; to: TradingDate | null }, date: TradingDate): boolean {
  return date >= entry.from && (entry.to === null || date <= entry.to);
}

/** The entry in force on `date`, or undefined when the table has no entry for it. */
export function entryAt<T extends { from: TradingDate; to: TradingDate | null }>(
  table: readonly T[],
  date: TradingDate,
): T | undefined {
  return table.find((e) => covers(e, date));
}
