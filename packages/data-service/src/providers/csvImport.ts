import { parsePaise } from '@trading/core';
import { legacyDate } from './bhavcopy';
import { columnIndex, parseCsv } from './csv';
import { ProviderError, isConsistent } from './rawBar';
import type { ParseResult, RawBarRow, SkippedRow } from './rawBar';

export interface CsvMapping {
  /** Header name of each field. `symbol` may be omitted when `defaultSymbol` is given. */
  columns: {
    date: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
    symbol?: string;
  };
  defaultSymbol?: string;
  dateFormat: 'YYYY-MM-DD' | 'DD-MM-YYYY' | 'DD-MON-YYYY';
  /** Whether the file's prices are already adjusted for splits and bonuses. */
  adjusted: boolean;
}

function isoDate(text: string, format: CsvMapping['dateFormat']): string {
  const t = text.trim();
  if (format === 'DD-MON-YYYY') return legacyDate(t);
  if (format === 'YYYY-MM-DD') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) throw new Error(`bad date "${text}"`);
    return t;
  }
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(t);
  if (m === null) throw new Error(`bad date "${text}"`);
  return `${m[3] as string}-${m[2] as string}-${m[1] as string}`;
}

/** Generic daily-bar CSV import (FR-D1). Prices are parsed as exact decimal text. */
export function parseCsvBars(text: string, mapping: CsvMapping): ParseResult {
  const table = parseCsv(text);
  const header = table[0];
  if (header === undefined) throw new ProviderError('malformed', 'empty CSV file');
  const names = Object.values(mapping.columns);
  let ix: Record<string, number>;
  try {
    ix = columnIndex(header, names);
  } catch (e) {
    throw new ProviderError('malformed', e instanceof Error ? e.message : 'bad header');
  }
  const c = mapping.columns;
  const rows: RawBarRow[] = [];
  const skipped: SkippedRow[] = [];
  table.slice(1).forEach((cells, i) => {
    const cell = (name: string): string => (cells[ix[name] as number] ?? '').trim();
    try {
      const [open, high, low, close] = [c.open, c.high, c.low, c.close].map((n) =>
        parsePaise(cell(n)),
      ) as [number, number, number, number];
      if (!isConsistent(open, high, low, close))
        throw new Error('inconsistent open/high/low/close');
      const volume = Number(cell(c.volume));
      if (!Number.isSafeInteger(volume) || volume < 0) throw new Error('bad volume');
      const symbol = c.symbol === undefined ? (mapping.defaultSymbol ?? '') : cell(c.symbol);
      if (symbol === '') throw new Error('no symbol');
      rows.push({
        provider: 'csv',
        symbol,
        series: null,
        isin: null,
        date: isoDate(cell(c.date), mapping.dateFormat),
        open,
        high,
        low,
        close,
        prevClose: null,
        volume,
        adjusted: mapping.adjusted,
      });
    } catch (e) {
      skipped.push({ line: i + 2, reason: e instanceof Error ? e.message : 'unreadable row' });
    }
  });
  return { rows, skipped };
}
