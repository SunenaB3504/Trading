import { istToUtcMillis } from '@trading/core';
import type { CorporateAction } from '@trading/core';
import { parseCsv } from '../providers/csv';
import { ProviderError } from '../providers/rawBar';

/**
 * Corporate actions from the `bc` file inside NSE's daily PR zip (the exchange's own list of actions with
 * their ex-dates, published every day and downloadable for past years). Splits, bonuses and cash dividends
 * become price-adjusting actions; rights issues, mergers, demergers, schemes, capital reductions and
 * buybacks are kept apart for review, because they change prices in ways a ratio does not describe.
 */
export type NseActionType =
  | 'split'
  | 'bonus'
  | 'dividend'
  | 'rights'
  | 'merger'
  | 'demerger'
  | 'arrangement'
  | 'capital_reduction'
  | 'buyback';

export interface Ratio {
  numerator: number;
  denominator: number;
}

export interface NseAction {
  symbol: string;
  series: string;
  /** `YYYY-MM-DD`. */
  exDate: string;
  type: NseActionType;
  /** Shares after over shares before, for a split or bonus. */
  ratio: Ratio | null;
  /** Cash dividend per share in paise; null when the text gives no amount or an unclear one. */
  dividendPaise: number | null;
  purpose: string;
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

function reduced(numerator: number, denominator: number): Ratio {
  const g = gcd(numerator, denominator);
  return { numerator: numerator / g, denominator: denominator / g };
}

/** `10` and `2.5` to hundredths, so a face value like Rs 2.5 still gives whole numbers. */
const hundredths = (text: string): number => Math.round(Number(text) * 100);

const BONUS = /BONUS\s*(\d+)\s*:\s*(\d+)/;
const SPLIT =
  /SPL[A-Z]*\s*(?:FRM|FROM)\s*R[SE]\.?\s*([\d.]+)\s*(?:\/-)?\s*TO\s*R[SE]\.?\s*([\d.]+)/;

function dividendPaise(purpose: string): number | null {
  const at = purpose.indexOf('DIV');
  const amounts = (purpose.slice(at).match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  if (amounts.length === 0 || amounts.length > 2) return null;
  return Math.round(amounts.reduce((a, b) => a + b, 0) * 100);
}

/** Classifies the free-text purpose, or null for anything that does not affect prices or shares. */
export function classify(
  purposeText: string,
): { type: NseActionType; ratio: Ratio | null; dividendPaise: number | null } | null {
  const p = purposeText.toUpperCase().replace(/\s+/g, ' ').trim();
  const bonus = BONUS.exec(p);
  if (bonus !== null)
    return {
      type: 'bonus',
      ratio: reduced(Number(bonus[1]) + Number(bonus[2]), Number(bonus[2])),
      dividendPaise: null,
    };
  const split = SPLIT.exec(p);
  if (split !== null) {
    const from = hundredths(split[1] as string);
    const to = hundredths(split[2] as string);
    return from > 0 && to > 0
      ? { type: 'split', ratio: reduced(from, to), dividendPaise: null }
      : null;
  }
  const other: Array<[RegExp, NseActionType]> = [
    [/\bRI?GHTS?\b|\bRGHTS\b/, 'rights'],
    [/\bDEMERGER\b/, 'demerger'],
    [/\bMERGER\b/, 'merger'],
    [/ARRANGEMENT|AMALGAMATION/, 'arrangement'],
    [/CAPITAL REDUCTION/, 'capital_reduction'],
    [/BUY ?BACK/, 'buyback'],
  ];
  for (const [re, type] of other) if (re.test(p)) return { type, ratio: null, dividendPaise: null };
  if (/DIV/.test(p) && !/REDEMPT|STP|INTEREST/.test(p))
    return { type: 'dividend', ratio: null, dividendPaise: dividendPaise(p) };
  return null;
}

/** `28/10/2024` or `2024-10-28` to `2024-10-28`; null if blank or unreadable. */
export function isoDate(text: string): string | null {
  const t = text.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (iso !== null) return t;
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  return dmy === null
    ? null
    : `${dmy[3]}-${(dmy[2] as string).padStart(2, '0')}-${(dmy[1] as string).padStart(2, '0')}`;
}

export interface ActionsFile {
  actions: NseAction[];
  /** Rows of listed equities with an action that is not a price event (meetings, interest and the like). */
  ignored: number;
  /** Rows with a price-relevant purpose but no readable ex-date. */
  undated: number;
}

export const EQUITY_SERIES: readonly string[] = ['EQ', 'BE', 'BZ'];

const HEADER = ['SERIES', 'SYMBOL', 'SECURITY', 'RECORD_DT', 'BC_STRT_DT', 'BC_END_DT', 'EX_DT'];

type RowResult = NseAction | 'ignored' | 'undated' | 'skipped';

function rowOf(c: readonly string[], series: readonly string[]): RowResult {
  const row = (c[0] ?? '').trim();
  if (!series.includes(row)) return 'skipped';
  const found = classify(c[9] ?? '');
  if (found === null) return 'ignored';
  const exDate = isoDate(c[6] ?? '');
  if (exDate === null) return 'undated';
  return {
    symbol: (c[1] ?? '').trim(),
    series: row,
    exDate,
    ...found,
    purpose: (c[9] ?? '').trim().replace(/\s+/g, ' '),
  };
}

/** Reads one `bc` file. Other series (bonds, ETFs, SME) are left out unless asked for. */
export function parseActionsFile(
  text: string,
  series: readonly string[] = EQUITY_SERIES,
): ActionsFile {
  const table = parseCsv(text);
  const head = (table[0] ?? []).map((h) => h.trim().toUpperCase());
  if (HEADER.some((h, i) => head[i] !== h) || head[9] !== 'PURPOSE')
    throw new ProviderError('malformed', 'unexpected corporate action file header');
  const out: ActionsFile = { actions: [], ignored: 0, undated: 0 };
  for (const c of table.slice(1)) {
    const r = rowOf(c, series);
    if (r === 'ignored') out.ignored += 1;
    else if (r === 'undated') out.undated += 1;
    else if (r !== 'skipped') out.actions.push(r);
  }
  return out;
}

const keyOf = (a: NseAction): string =>
  [a.symbol, a.exDate, a.type, a.ratio?.numerator, a.ratio?.denominator, a.dividendPaise].join('|');

/**
 * Joins the actions of many days into one list. The same action is announced on several days and in
 * several series (for example EQ and BE for one company), so duplicates are dropped.
 */
export function mergeActions(files: ReadonlyArray<readonly NseAction[]>): NseAction[] {
  const seen = new Map<string, NseAction>();
  for (const f of files) for (const a of f) if (!seen.has(keyOf(a))) seen.set(keyOf(a), a);
  return [...seen.values()].sort((a, b) =>
    a.exDate === b.exDate ? (a.symbol < b.symbol ? -1 : 1) : a.exDate < b.exDate ? -1 : 1,
  );
}

export interface Converted {
  /** Splits, bonuses and dividends with a known instrument, ready for the price adjustment. */
  actions: CorporateAction[];
  /** Everything that changes prices but not by a ratio, or that could not be tied to an instrument. */
  needsReview: NseAction[];
}

/** Turns the exchange's actions into the domain's. `resolve` maps a symbol on its ex-date to an instrument id. */
export function toCorporateActions(
  actions: readonly NseAction[],
  resolve: (symbol: string, exDate: string) => string | undefined,
  source = 'NSE PR bc',
): Converted {
  const out: Converted = { actions: [], needsReview: [] };
  for (const a of actions) {
    const instrumentId = resolve(a.symbol, a.exDate);
    const adjusting =
      a.type === 'split' ||
      a.type === 'bonus' ||
      (a.type === 'dividend' && a.dividendPaise !== null);
    if (!adjusting || instrumentId === undefined) {
      out.needsReview.push(a);
      continue;
    }
    out.actions.push({
      id: `${a.symbol}-${a.type}-${a.exDate}`,
      instrumentId,
      type: a.type as 'split' | 'bonus' | 'dividend',
      exDate: a.exDate,
      ratio: a.ratio,
      dividendPaisePerShare: a.type === 'dividend' ? a.dividendPaise : null,
      source,
      effectiveAt: istToUtcMillis(a.exDate, '09:00'),
    });
  }
  return out;
}
