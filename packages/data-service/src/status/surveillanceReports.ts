import { ProviderError } from '../providers/rawBar';
import { stageFromRoman } from './secList';

export interface AsmEntry {
  symbol: string;
  isin: string;
  kind: 'long_term' | 'short_term';
  stage: number;
  /** NSE's own surveillance code, kept verbatim. */
  code: string;
}

export interface GsmEntry {
  symbol: string;
  isin: string;
  /** 0 means shortlisted only. */
  stage: number;
  /** Also under another measure: LTASM, ESM or an IBC stage, as written in the code. */
  alsoUnder: string | null;
  code: string;
}

type Raw = Record<string, unknown>;

export interface ReportResult<T> {
  entries: T[];
  skipped: number;
  /** The day the report says it is for (`YYYY-MM-DD`), or null. A report with a different day is stale. */
  asOf: string | null;
}

const MONTHS: Readonly<Record<string, string>> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

/** `16-Oct-2026` or `16-Oct-2026 08:08:02` to `2026-10-16`. */
export function reportDate(text: unknown): string | null {
  const m = typeof text === 'string' ? /^(\d{1,2})-([A-Za-z]{3})-(\d{4})/.exec(text.trim()) : null;
  const month = m?.[2] === undefined ? undefined : MONTHS[m[2].toLowerCase()];
  return m === null || month === undefined
    ? null
    : `${m[3]}-${month}-${(m[1] as string).padStart(2, '0')}`;
}
const text = (v: unknown): string => (typeof v === 'string' ? v : '');

function asmEntry(raw: Raw, kind: AsmEntry['kind']): AsmEntry | null {
  const code = text(raw.survCode);
  const m = /(?:LT|ST)ASM\s*-\s*(I{1,3}|IV)\b/i.exec(code);
  const stage = m?.[1] === undefined ? null : stageFromRoman(m[1]);
  const symbol = text(raw.symbol);
  return stage === null || symbol === ''
    ? null
    : { symbol, isin: text(raw.isin), kind, stage, code };
}

/** NSE `/api/reportASM`: the list in force now, long term and short term. There is no history behind it. */
export function parseAsmReport(json: unknown): ReportResult<AsmEntry> {
  const root = json as { longterm?: { data?: Raw[] }; shortterm?: { data?: Raw[] } } | null;
  if (root === null || typeof root !== 'object' || root.longterm === undefined)
    throw new ProviderError('malformed', 'ASM report has no longterm list');
  const entries: AsmEntry[] = [];
  let skipped = 0;
  const add = (list: Raw[] | undefined, kind: AsmEntry['kind']): void => {
    for (const raw of list ?? []) {
      const e = asmEntry(raw, kind);
      if (e === null) skipped += 1;
      else entries.push(e);
    }
  };
  add(root.longterm.data, 'long_term');
  add(root.shortterm?.data, 'short_term');
  const first = [...(root.longterm.data ?? []), ...(root.shortterm?.data ?? [])][0];
  return { entries, skipped, asOf: reportDate(first?.asmTime) };
}

const GSM_CODE = /GSM\s*-?\s*(0|I{1,3}|IV|V|VI)\b/i;

function gsmEntry(raw: Raw): GsmEntry | null {
  const code = text(raw.survCode);
  const stage = GSM_CODE.exec(code)?.[1];
  const symbol = text(raw.symbol);
  if (stage === undefined || symbol === '') return null;
  const other = /^(.*?)\s*&\s*GSM/i.exec(code)?.[1]?.trim();
  return {
    symbol,
    isin: text(raw.isin),
    stage: stageFromRoman(stage) ?? 0,
    alsoUnder: other === undefined || other === '' ? null : other,
    code,
  };
}

/** NSE `/api/reportGSM`: the list in force now. Some names are also under LTASM, ESM or an IBC stage. */
export function parseGsmReport(json: unknown): ReportResult<GsmEntry> {
  if (!Array.isArray(json)) throw new ProviderError('malformed', 'GSM report is not a list');
  const entries: GsmEntry[] = [];
  let skipped = 0;
  for (const raw of json as Raw[]) {
    const e = gsmEntry(raw);
    if (e === null) skipped += 1;
    else entries.push(e);
  }
  return { entries, skipped, asOf: reportDate((json[0] as Raw | undefined)?.gsmTime) };
}
