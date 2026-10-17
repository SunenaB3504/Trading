import { parsePaise } from '@trading/core';
import { columnIndex, parseCsv } from './csv';
import { ProviderError, isConsistent } from './rawBar';
import type { ParseResult, RawBarRow, SkippedRow } from './rawBar';

const MONTHS: Record<string, string> = {
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

/** `03-JUN-2024` to `2024-06-03`. */
export function legacyDate(text: string): string {
  const m = /^(\d{2})-([A-Z]{3})-(\d{4})$/.exec(text.trim().toUpperCase());
  const month = m === null ? undefined : MONTHS[m[2] as string];
  if (m === null || month === undefined) throw new Error(`bad legacy date "${text}"`);
  return `${m[3] as string}-${month}-${m[1] as string}`;
}

interface Columns {
  symbol: string;
  series: string;
  isin: string;
  date: string;
  open: string;
  high: string;
  low: string;
  close: string;
  prev: string;
  volume: string;
}

const UDIFF: Columns = {
  symbol: 'TckrSymb',
  series: 'SctySrs',
  isin: 'ISIN',
  date: 'TradDt',
  open: 'OpnPric',
  high: 'HghPric',
  low: 'LwPric',
  close: 'ClsPric',
  prev: 'PrvsClsgPric',
  volume: 'TtlTradgVol',
};
const LEGACY: Columns = {
  symbol: 'SYMBOL',
  series: 'SERIES',
  isin: 'ISIN',
  date: 'TIMESTAMP',
  open: 'OPEN',
  high: 'HIGH',
  low: 'LOW',
  close: 'CLOSE',
  prev: 'PREVCLOSE',
  volume: 'TOTTRDQTY',
};

function toRow(
  cells: readonly string[],
  ix: Record<string, number>,
  c: Columns,
  legacy: boolean,
): RawBarRow {
  const cell = (name: string): string => (cells[ix[name] as number] ?? '').trim();
  const open = parsePaise(cell(c.open));
  const high = parsePaise(cell(c.high));
  const low = parsePaise(cell(c.low));
  const close = parsePaise(cell(c.close));
  if (!isConsistent(open, high, low, close)) throw new Error('inconsistent open/high/low/close');
  const prev = cell(c.prev);
  const volume = Number(cell(c.volume));
  if (!Number.isSafeInteger(volume) || volume < 0) throw new Error('bad volume');
  const isin = cell(c.isin);
  return {
    provider: 'nse-bhavcopy',
    symbol: cell(c.symbol),
    series: cell(c.series) || null,
    isin: isin || null,
    date: legacy ? legacyDate(cell(c.date)) : cell(c.date),
    open,
    high,
    low,
    close,
    prevClose: prev === '' ? null : parsePaise(prev),
    volume,
    adjusted: false,
  };
}

function parseWith(
  text: string,
  c: Columns,
  legacy: boolean,
  series?: readonly string[],
): ParseResult {
  const table = parseCsv(text);
  const header = table[0];
  if (header === undefined) throw new ProviderError('malformed', 'empty bhavcopy file');
  let ix: Record<string, number>;
  try {
    ix = columnIndex(header, Object.values(c));
  } catch (e) {
    throw new ProviderError('malformed', e instanceof Error ? e.message : 'bad header');
  }
  const rows: RawBarRow[] = [];
  const skipped: SkippedRow[] = [];
  table.slice(1).forEach((cells, i) => {
    const seriesCell = (cells[ix[c.series] as number] ?? '').trim();
    if (series !== undefined && !series.includes(seriesCell)) return;
    try {
      rows.push(toRow(cells, ix, c, legacy));
    } catch (e) {
      skipped.push({ line: i + 2, reason: e instanceof Error ? e.message : 'unreadable row' });
    }
  });
  return { rows, skipped };
}

/** NSE capital-market bhavcopy in the UDiFF format (the only format published from 2024-07-08). */
export function parseBhavcopyUdiff(text: string, series?: readonly string[]): ParseResult {
  return parseWith(text, UDIFF, false, series);
}

/** NSE capital-market bhavcopy in the legacy `cmDDMONYYYYbhav.csv` format (published to 2024-07-05). */
export function parseBhavcopyLegacy(text: string, series?: readonly string[]): ParseResult {
  return parseWith(text, LEGACY, true, series);
}

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Which file format holds `date`. Checked against nsearchives.nseindia.com on 2026-10-17: legacy
 * files exist to 2024-07-05 and return 404 from 2024-07-08; UDiFF files exist from at least
 * 2024-01-02 (so January to July 2024 is available in both, a free cross-check) but not for 2023.
 */
export function bhavcopyFormatFor(date: string): 'legacy' | 'udiff' {
  return date <= '2024-07-05' ? 'legacy' : 'udiff';
}

export function bhavcopyUrl(
  date: string,
  format: 'legacy' | 'udiff' = bhavcopyFormatFor(date),
): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  if (format === 'udiff') {
    return `https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_${String(y)}${pad(m)}${pad(d)}_F_0000.csv.zip`;
  }
  const mon = Object.keys(MONTHS)[m - 1] as string;
  return `https://nsearchives.nseindia.com/content/historical/EQUITIES/${String(y)}/${mon}/cm${pad(d)}${mon}${String(y)}bhav.csv.zip`;
}
