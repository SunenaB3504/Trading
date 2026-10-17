import { parseCsv } from '../providers/csv';
import { ProviderError } from '../providers/rawBar';

export interface McapRow {
  /** `YYYY-MM-DD`. */
  date: string;
  symbol: string;
  series: string;
  /** Equity shares outstanding on the date, as issued (never adjusted for later events). */
  sharesOutstanding: number;
  closePaise: number;
  /** Rs, as the exchange publishes it (close times shares). */
  marketCapRupees: number;
}

const MONTHS: Readonly<Record<string, string>> = {
  JAN: '01',
  FEB: '02',
  MAR: '03',
  APR: '04',
  MAY: '05',
  JUN: '06',
  JUL: '07',
  AUG: '08',
  SEP: '09',
  OCT: '10',
  NOV: '11',
  DEC: '12',
};

function isoDate(text: string): string | null {
  const m = /^(\d{1,2}) ([A-Z]{3}) (\d{4})$/.exec(text.trim().toUpperCase());
  const month = m?.[2] === undefined ? undefined : MONTHS[m[2]];
  return m === null || month === undefined
    ? null
    : `${m[3]}-${month}-${(m[1] as string).padStart(2, '0')}`;
}

function rowOf(c: readonly string[]): McapRow | null {
  const date = isoDate(c[0] ?? '');
  const [shares, close, cap] = [7, 8, 9].map((i) => Number((c[i] ?? '').trim()));
  if (date === null || ![shares, close, cap].every((n) => Number.isFinite(n))) return null;
  return {
    date,
    symbol: (c[1] ?? '').trim(),
    series: (c[2] ?? '').trim(),
    sharesOutstanding: shares as number,
    closePaise: Math.round((close as number) * 100),
    marketCapRupees: cap as number,
  };
}

/**
 * `mcapDDMMYYYY.csv` from NSE's daily PR zip (available from 2024-02-01): shares outstanding and
 * market cap for every security. Unreadable rows are counted and skipped.
 */
export function parseMcapFile(text: string): { rows: McapRow[]; skipped: number } {
  const table = parseCsv(text);
  const head = (table[0] ?? []).map((h) => h.trim().toLowerCase());
  if (head[1] !== 'symbol' || head[7] !== 'issue size')
    throw new ProviderError('malformed', 'unexpected mcap header');
  const rows = table.slice(1).flatMap((c) => {
    const row = rowOf(c);
    return row === null ? [] : [row];
  });
  return { rows, skipped: table.length - 1 - rows.length };
}
