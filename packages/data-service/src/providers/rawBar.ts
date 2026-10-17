/**
 * One provider's daily bar for one instrument, before it is checked, reconciled with other
 * providers or given an instrument id. Prices are integer paise, parsed exactly from text (never
 * through floating point where the source gives text).
 */
export type ProviderName = 'nse-bhavcopy' | 'nse-pr' | 'nse-status' | 'yahoo' | 'csv';

export interface RawBarRow {
  provider: ProviderName;
  /** Exchange symbol without any provider suffix, for example `RELIANCE`. */
  symbol: string;
  /** NSE series (EQ, BE, SM ...) when the provider reports it. */
  series: string | null;
  isin: string | null;
  /** Session date, `YYYY-MM-DD`. */
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  prevClose: number | null;
  volume: number;
  /**
   * True when the provider has already adjusted these prices for later splits or bonuses.
   * Yahoo does (its `close` is split-adjusted); NSE bhavcopy never does. Only unadjusted rows may
   * be stored as the unadjusted series (SSD FR-D3).
   */
  adjusted: boolean;
}

export interface SkippedRow {
  line: number;
  reason: string;
}

export interface ParseResult {
  rows: RawBarRow[];
  /** Rows that were read but not usable, with why. Never silently dropped. */
  skipped: SkippedRow[];
}

/** A provider response that cannot be used (not found, malformed, wrong shape). */
export class ProviderError extends Error {
  constructor(
    readonly kind: 'not-found' | 'malformed' | 'unsupported',
    message: string,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

/** True when low <= open, close <= high and all prices are positive. */
export function isConsistent(o: number, h: number, l: number, c: number): boolean {
  return o > 0 && h > 0 && l > 0 && c > 0 && l <= h && l <= o && o <= h && l <= c && c <= h;
}
