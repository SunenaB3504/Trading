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
export function parseAsmReport(json: unknown): { entries: AsmEntry[]; skipped: number } {
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
  return { entries, skipped };
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
export function parseGsmReport(json: unknown): { entries: GsmEntry[]; skipped: number } {
  if (!Array.isArray(json)) throw new ProviderError('malformed', 'GSM report is not a list');
  const entries: GsmEntry[] = [];
  let skipped = 0;
  for (const raw of json as Raw[]) {
    const e = gsmEntry(raw);
    if (e === null) skipped += 1;
    else entries.push(e);
  }
  return { entries, skipped };
}
