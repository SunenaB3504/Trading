import { parseCsv } from '../providers/csv';
import { ProviderError } from '../providers/rawBar';

export interface SecListRow {
  symbol: string;
  series: string;
  name: string;
  /** Price band in percent, or null where NSE lists "No Band" (derivatives names and index constituents). */
  bandPct: number | null;
  /** Series BE and BZ trade for trade (no intraday netting). */
  tradeForTrade: boolean;
  /** Graded Surveillance Measure stage from the remarks (0 means shortlisted only), or null. */
  gsmStage: number | null;
  remarks: string;
}

export interface SecListResult {
  rows: SecListRow[];
  skipped: Array<{ line: number; reason: string }>;
}

const ROMAN: Readonly<Record<string, number>> = { '0': 0, I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };

/** Stage written as 0 or a Roman numeral up to VI; null for anything else. */
export function stageFromRoman(text: string): number | null {
  return ROMAN[text.trim().toUpperCase()] ?? null;
}

const GSM_REMARK = /GSM\s+STAGE\s*-\s*(0|I{1,3}|IV|V|VI)\b/i;
const HEADER = ['symbol', 'series', 'security name', 'band', 'remarks'];

function parseBand(text: string): number | null | undefined {
  const t = text.trim();
  if (t.toLowerCase() === 'no band') return null;
  const n = Number(t);
  return /^\d+(\.\d+)?$/.test(t) && n > 0 ? n : undefined;
}

function gsmStageOf(remarks: string): number | null {
  const stage = GSM_REMARK.exec(remarks)?.[1];
  return stage === undefined ? null : stageFromRoman(stage);
}

function rowOf(cells: readonly string[]): SecListRow | string {
  const [symbol = '', series = '', name = '', band = '', remarks = ''] = cells.map((c) => c.trim());
  const bandPct = parseBand(band);
  if (symbol === '' || series === '') return 'missing symbol or series';
  if (bandPct === undefined) return `unreadable band "${band}"`;
  const tradeForTrade = series === 'BE' || series === 'BZ';
  return { symbol, series, name, bandPct, tradeForTrade, gsmStage: gsmStageOf(remarks), remarks };
}

/**
 * NSE `sec_list_DDMMYYYY.csv`: every security open for trading that day with its price band, series and
 * remarks (checked 2026-10-17: files exist from late 2019-12 on). Remarks carry the GSM stage only;
 * ASM is not in this file. Remarks may end in a stray tab, so they are trimmed.
 */
export function parseSecList(text: string): SecListResult {
  const table = parseCsv(text);
  const head = (table[0] ?? []).map((h) => h.trim().toLowerCase());
  if (HEADER.some((h, i) => head[i] !== h))
    throw new ProviderError('malformed', `unexpected sec_list header: ${head.join(',')}`);
  const out: SecListResult = { rows: [], skipped: [] };
  table.slice(1).forEach((cells, i) => {
    const row = rowOf(cells);
    if (typeof row === 'string') out.skipped.push({ line: i + 2, reason: row });
    else out.rows.push(row);
  });
  return out;
}

export function secListUrl(date: string): string {
  const [y, m, d] = date.split('-');
  return `https://nsearchives.nseindia.com/content/equities/sec_list_${d}${m}${y}.csv`;
}
