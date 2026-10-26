import { parsePaise } from '@trading/core';
import type { CompactBar, LearningMarket } from '@trading/core';

/** One equity row of a day's NSE file, reduced to what the learning market keeps. */
export interface DayRow {
  isin: string;
  symbol: string;
  bar: CompactBar;
}

const UDIFF_COLUMNS = ['TckrSymb', 'SctySrs', 'ISIN', 'TradDt', 'OpnPric', 'HghPric', 'LwPric', 'ClsPric', 'TtlTradgVol'];

/** The NSE archive file for a trading day (UDiFF format, the only one published since July 2024). */
export function dayFileUrl(date: string): string {
  return `https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_${date.replaceAll('-', '')}_F_0000.csv.zip`;
}

type Columns = [number, number, number, number, number, number, number, number, number];

const isDate = (t: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(t);

const isSane = (b: CompactBar): boolean =>
  b[2] >= Math.max(b[1], b[4]) && b[3] <= Math.min(b[1], b[4]) && Number.isSafeInteger(b[5]) && b[5] >= 0 && isDate(b[0]);

/** One line as a row, or null when it is not an EQ row or its prices do not read cleanly. */
function readLine(f: readonly string[], c: Columns): DayRow | null {
  const cell = (i: number): string => (f[i] ?? '').trim();
  const [sym, ser, isin, dt, o, h, l, cl, v] = c;
  if (cell(ser) !== 'EQ') return null;
  try {
    const bar: CompactBar = [cell(dt), parsePaise(cell(o)), parsePaise(cell(h)), parsePaise(cell(l)), parsePaise(cell(cl)), Number(cell(v)), 0];
    return isSane(bar) ? { isin: cell(isin), symbol: cell(sym), bar } : null;
  } catch {
    return null;
  }
}

/** Equity (EQ series) rows of one day's UDiFF file; rows that do not read cleanly are left out. */
export function parseDay(csv: string): DayRow[] {
  const lines = csv.split(/\r?\n/);
  const header = (lines[0] ?? '').split(',').map((h) => h.trim());
  const at = UDIFF_COLUMNS.map((c) => header.indexOf(c));
  if (at.some((i) => i < 0)) return [];
  return lines
    .slice(1)
    .map((line) => readLine(line.split(','), at as Columns))
    .filter((r): r is DayRow => r !== null);
}

/** Weekdays after `last` up to and including `today`, oldest first. Holidays are found by the missing file. */
export function missingWeekdays(last: string, today: string): string[] {
  const out: string[] = [];
  const d = new Date(`${last}T00:00:00Z`);
  for (d.setUTCDate(d.getUTCDate() + 1); d.toISOString().slice(0, 10) <= today; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/**
 * Adds one or more days of rows to a market. A stock is matched by ISIN, so a renamed company keeps its history; a day
 * a stock has no row for is simply a day without a bar. Days not later than the market's end are ignored, so running
 * it twice changes nothing. Corporate actions after the build date are not known here.
 */
export function addDays(m: LearningMarket, days: ReadonlyMap<string, DayRow[]>): LearningMarket {
  const dates = [...days.keys()].filter((d) => d > m.to).sort();
  if (dates.length === 0) return m;
  const bars: LearningMarket['bars'] = { ...m.bars };
  const instruments = m.instruments.map((inst) => {
    if (inst.isin === null) return inst;
    const added: CompactBar[] = [];
    let symbol = inst.symbol;
    for (const d of dates) {
      const row = (days.get(d) ?? []).find((r) => r.isin === inst.isin);
      if (row === undefined) continue;
      added.push(row.bar);
      symbol = row.symbol;
    }
    if (added.length === 0) return inst;
    bars[inst.id] = [...(m.bars[inst.id] ?? []), ...added];
    return { ...inst, symbol, lastDate: added[added.length - 1]![0] };
  });
  return { ...m, instruments, bars, to: dates[dates.length - 1]! };
}
