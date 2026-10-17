import { sessionsAfter } from '../universe/lifecycle';
import type { SecListRow } from './secList';
import type { AsmEntry, GsmEntry } from './surveillanceReports';

export interface SymbolStatus {
  symbol: string;
  asOf: string;
  /** Date of the file the answer comes from; null when none was usable. */
  sourceDate: string | null;
  /** Null when no usable security list exists for the date. */
  inSecurityList: boolean | null;
  series: string | null;
  bandPct: number | null;
  tradeForTrade: boolean | null;
  gsmStage: number | null;
  asm: { kind: AsmEntry['kind']; stage: number } | null;
  /** True only when an ASM snapshot close enough to `asOf` was recorded. ASM has no archive. */
  asmKnown: boolean;
  surveillanceList: 'none' | 'asm' | 'gsm';
  flags: string[];
}

export const DEFAULT_MAX_STALE_SESSIONS = 3;

class Snapshots<T> {
  private readonly byDate = new Map<string, Map<string, T>>();

  add(date: string, items: Map<string, T>): void {
    this.byDate.set(date, items);
  }

  /** The newest snapshot dated on or before `asOf` and no more than `maxStale` sessions older. */
  usable(asOf: string, maxStale: number): { date: string; items: Map<string, T> } | null {
    const dates = [...this.byDate.keys()].filter((d) => d <= asOf).sort();
    const date = dates[dates.length - 1];
    if (date === undefined || sessionsAfter(date, asOf) > maxStale) return null;
    return { date, items: this.byDate.get(date) as Map<string, T> };
  }

  hasBefore(asOf: string): boolean {
    return [...this.byDate.keys()].some((d) => d <= asOf);
  }
}

function listOf(gsmStage: number | null, asm: unknown): SymbolStatus['surveillanceList'] {
  if (gsmStage !== null) return 'gsm';
  return asm === null ? 'none' : 'asm';
}

function stageOf(row: SecListRow | undefined, entry: GsmEntry | undefined): number | null {
  return row?.gsmStage ?? entry?.stage ?? null;
}

function asmOf(entry: AsmEntry | undefined): SymbolStatus['asm'] {
  return entry === undefined ? null : { kind: entry.kind, stage: entry.stage };
}

function fromRow(
  haveList: boolean,
  row: SecListRow | undefined,
): Pick<SymbolStatus, 'inSecurityList' | 'series' | 'bandPct' | 'tradeForTrade'> {
  return {
    inSecurityList: haveList ? row !== undefined : null,
    series: row?.series ?? null,
    bandPct: row?.bandPct ?? null,
    tradeForTrade: row?.tradeForTrade ?? null,
  };
}

const bySymbol = <T extends { symbol: string }>(items: readonly T[]): Map<string, T> =>
  new Map(items.map((i) => [i.symbol, i]));

/**
 * Band, trade-for-trade and surveillance status as it stood on a date, from files recorded on or
 * before it and never later (FR-U7, principle 3). The security list has history; the ASM and GSM
 * reports show only today's list, so they count only for dates a snapshot was actually recorded on.
 */
export class StatusHistory {
  private readonly lists = new Snapshots<SecListRow>();
  private readonly asm = new Snapshots<AsmEntry>();
  private readonly gsm = new Snapshots<GsmEntry>();

  addSecList(date: string, rows: readonly SecListRow[]): void {
    this.lists.add(date, bySymbol(rows));
  }

  addAsm(date: string, entries: readonly AsmEntry[]): void {
    this.asm.add(date, bySymbol(entries));
  }

  addGsm(date: string, entries: readonly GsmEntry[]): void {
    this.gsm.add(date, bySymbol(entries));
  }

  statusOn(
    symbol: string,
    asOf: string,
    maxStaleSessions = DEFAULT_MAX_STALE_SESSIONS,
  ): SymbolStatus {
    const list = this.lists.usable(asOf, maxStaleSessions);
    const row = list?.items.get(symbol);
    const asmSnap = this.asm.usable(asOf, maxStaleSessions);
    const gsmEntry = this.gsm.usable(asOf, maxStaleSessions)?.items.get(symbol);
    const asm = asmOf(asmSnap?.items.get(symbol));
    const gsmStage = stageOf(row, gsmEntry);
    return {
      symbol,
      asOf,
      sourceDate: list?.date ?? null,
      ...fromRow(list !== null, row),
      gsmStage,
      asm,
      asmKnown: asmSnap !== null,
      surveillanceList: listOf(gsmStage, asm),
      flags: this.explain(list !== null, row, asmSnap !== null, asOf),
    };
  }

  private explain(
    haveList: boolean,
    row: SecListRow | undefined,
    haveAsm: boolean,
    asOf: string,
  ): string[] {
    const flags: string[] = [];
    if (!haveList) flags.push(this.lists.hasBefore(asOf) ? 'status_stale' : 'status_unavailable');
    else if (row === undefined) flags.push('not_in_security_list');
    else if (row.bandPct === null) flags.push('no_price_band');
    if (!haveAsm) flags.push('asm_not_recorded');
    return flags;
  }
}
