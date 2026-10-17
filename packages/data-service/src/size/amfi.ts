import { addDays } from '@trading/core';
import { parseCsv } from '../providers/csv';
import { ProviderError } from '../providers/rawBar';

export interface AmfiRow {
  rank: number;
  name: string;
  isin: string;
  nseSymbol: string;
  bseSymbol: string;
  /** Average of the exchanges' six-month average market cap, in Rs crore; null if unreadable. */
  avgMcapCr: number | null;
  category: string;
}

export interface AmfiList {
  /** For example `2025H1`: the six months ended 30 June 2025. */
  period: string;
  periodEnd: string;
  /** First date the list may be used: the period end plus a publication lag. */
  usableFrom: string;
  rows: AmfiRow[];
}

/** AMFI publishes after the period closes and the dates were not verified, so a month is assumed. */
export const AMFI_LAG_DAYS = 31;
/** A list is used for at most this many days after it becomes usable (six months and a margin). */
export const AMFI_MAX_AGE_DAYS = 190;

export function periodEndOf(period: string): string {
  const m = /^(\d{4})H([12])$/.exec(period);
  if (m === null) throw new ProviderError('malformed', `bad AMFI period ${period}`);
  return `${m[1]}-${m[2] === '1' ? '06-30' : '12-31'}`;
}

const HEAD = ['rank', 'name', 'isin', 'bse_symbol', 'nse_symbol', 'avg_mcap_cr', 'category'];

/** Reads a CSV written by `tools/amfi_extract.py` (the AMFI PDF tables, one row per company). */
export function parseAmfiCsv(period: string, text: string): AmfiList {
  const table = parseCsv(text);
  if (HEAD.some((h, i) => table[0]?.[i] !== h))
    throw new ProviderError('malformed', 'unexpected AMFI csv header');
  const periodEnd = periodEndOf(period);
  const rows = table.slice(1).map((c): AmfiRow => {
    const avg = Number(c[5]);
    return {
      rank: Number(c[0]),
      name: c[1] ?? '',
      isin: c[2] ?? '',
      nseSymbol: c[4] ?? '',
      bseSymbol: c[3] ?? '',
      avgMcapCr: c[5] === undefined || c[5] === '' || !Number.isFinite(avg) ? null : avg,
      category: c[6] ?? '',
    };
  });
  return { period, periodEnd, usableFrom: addDays(periodEnd, AMFI_LAG_DAYS), rows };
}

/** AMFI rank by ISIN as it stood on a date, from the newest list already usable and not too old. */
export class AmfiRanks {
  private readonly lists: AmfiList[];

  constructor(lists: readonly AmfiList[]) {
    this.lists = [...lists].sort((a, b) => (a.usableFrom < b.usableFrom ? -1 : 1));
  }

  listOn(asOf: string): AmfiList | null {
    const usable = this.lists.filter((l) => l.usableFrom <= asOf);
    const list = usable[usable.length - 1];
    return list !== undefined && asOf <= addDays(list.usableFrom, AMFI_MAX_AGE_DAYS) ? list : null;
  }

  /**
   * Rank by ISIN. Where the PDF's ISIN cell was unreadable the row has none, so the exchange symbol is
   * used as a second key (a renamed stock then misses its older list, which is reported as unknown).
   */
  rankOn(isin: string, asOf: string, symbol?: string): number | null {
    const rows = this.listOn(asOf)?.rows ?? [];
    const byIsin = rows.find((r) => r.isin !== '' && r.isin === isin);
    const bySymbol =
      symbol === undefined
        ? undefined
        : rows.find((r) => r.isin === '' && (r.nseSymbol === symbol || r.bseSymbol === symbol));
    return (byIsin ?? bySymbol)?.rank ?? null;
  }
}
