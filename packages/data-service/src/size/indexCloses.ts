import { parseCsv } from '../providers/csv';
import { ProviderError } from '../providers/rawBar';

export interface IndexClose {
  indexName: string;
  /** `YYYY-MM-DD`. */
  date: string;
  close: number;
}

/**
 * NSE `ind_close_all_DDMMYYYY.csv`: one row per index per day (price indices, not total return). Index
 * dates are written `DD-MM-YYYY`. Rows that cannot be read are skipped.
 */
function rowOf(c: readonly string[]): IndexClose | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec((c[1] ?? '').trim());
  const close = Number((c[5] ?? '').trim());
  if (m === null || !Number.isFinite(close) || close <= 0) return null;
  return { indexName: (c[0] ?? '').trim(), date: `${m[3]}-${m[2]}-${m[1]}`, close };
}

export function parseIndexCloseAll(text: string): IndexClose[] {
  const table = parseCsv(text);
  const head = (table[0] ?? []).map((h) => h.trim().toLowerCase());
  if (head[0] !== 'index name' || head[1] !== 'index date' || head[5] !== 'closing index value')
    throw new ProviderError('malformed', 'unexpected index close header');
  return table.slice(1).flatMap((c) => {
    const row = rowOf(c);
    return row === null ? [] : [row];
  });
}

export const indexCloseAllUrl = (date: string): string => {
  const [y, m, d] = date.split('-');
  return `https://nsearchives.nseindia.com/content/indices/ind_close_all_${d}${m}${y}.csv`;
};

export const prZipUrl = (date: string): string => {
  const [y, m, d] = date.split('-');
  return `https://nsearchives.nseindia.com/archives/equities/bhavcopy/pr/PR${d}${m}${(y as string).slice(2)}.zip`;
};
