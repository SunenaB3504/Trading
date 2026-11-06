import type { BarAdj, BarUnadj, CorporateAction } from '../domain/market';
import { mulDiv } from '../money';
import { normalizeActions } from './actions';
import { CorporateActionError } from './errors';
import { multiplyRatios, priceFactor } from './ratio';
import type { Ratio } from './ratio';

export interface AdjustOptions {
  /** Also adjust prices for cash dividends (total-return style). Splits and bonuses always apply. */
  includeDividends: boolean;
  /** Ignore actions with an ex-date after this date (`YYYY-MM-DD`), for point-in-time views. */
  asOf?: string;
}

/** A price-affecting event, applied to every bar dated strictly before its ex-date. */
interface AdjustEvent {
  exDate: string;
  factor: number;
  volume: Ratio | null;
}

function assertSeries(bars: readonly BarUnadj[]): string {
  const first = bars[0];
  if (first === undefined) return '';
  for (let i = 0; i < bars.length; i += 1) {
    const bar = bars[i] as BarUnadj;
    if (bar.instrumentId !== first.instrumentId) {
      throw new CorporateActionError('series mixes instruments');
    }
    if (i > 0 && (bars[i - 1] as BarUnadj).date >= bar.date) {
      throw new CorporateActionError('bars must be strictly ascending by date');
    }
    if (bar.open <= 0 || bar.high <= 0 || bar.low <= 0 || bar.close <= 0) {
      throw new CorporateActionError(`non-positive price on ${bar.date}`);
    }
  }
  return first.instrumentId;
}

function lastCloseBefore(bars: readonly BarUnadj[], exDate: string): BarUnadj | undefined {
  let found: BarUnadj | undefined;
  for (const b of bars) if (b.date < exDate) found = b;
  return found;
}

function toEvent(
  a: CorporateAction,
  bars: readonly BarUnadj[],
  includeDividends: boolean,
): AdjustEvent | null {
  if ((a.type === 'split' || a.type === 'bonus') && a.ratio !== null) {
    return { exDate: a.exDate, factor: priceFactor(a.ratio), volume: a.ratio };
  }
  if (a.type === 'dividend' && includeDividends && a.dividendPaisePerShare !== null) {
    const prev = lastCloseBefore(bars, a.exDate);
    if (prev === undefined) return null;
    if (a.dividendPaisePerShare >= prev.close) {
      throw new CorporateActionError(`dividend ${a.id} is not below the prior close`);
    }
    return {
      exDate: a.exDate,
      factor: (prev.close - a.dividendPaisePerShare) / prev.close,
      volume: null,
    };
  }
  return null;
}

/** Actions grouped by instrument once per list: a market of a thousand stocks is adjusted daily, stock by stock. */
const byInstrument = new WeakMap<readonly CorporateAction[], Map<string, CorporateAction[]>>();

function actionsOf(actions: readonly CorporateAction[], id: string | undefined): CorporateAction[] {
  let grouped = byInstrument.get(actions);
  if (grouped === undefined) {
    grouped = new Map();
    for (const a of actions) {
      const list = grouped.get(a.instrumentId);
      if (list === undefined) grouped.set(a.instrumentId, [a]);
      else list.push(a);
    }
    byInstrument.set(actions, grouped);
  }
  return id === undefined ? [] : (grouped.get(id) ?? []);
}

function buildEvents(
  bars: readonly BarUnadj[],
  actions: readonly CorporateAction[],
  opts: AdjustOptions,
): AdjustEvent[] {
  const mine = actionsOf(actions, bars[0]?.instrumentId);
  const events: AdjustEvent[] = [];
  for (const a of normalizeActions(mine)) {
    if (opts.asOf !== undefined && a.exDate > opts.asOf) continue;
    const e = toEvent(a, bars, opts.includeDividends);
    if (e !== null) events.push(e);
  }
  return events.reverse(); // latest ex-date first, for a single backwards sweep
}

/**
 * Builds the adjusted series for one instrument (FR-D3, FR-U3). The unadjusted series is never
 * modified. Bars dated before an ex-date are scaled; the ex-date bar itself is not. Volume is
 * scaled inversely to price for splits and bonuses, rounded half-up in exact integer arithmetic.
 */
export function adjustSeries(
  bars: readonly BarUnadj[],
  actions: readonly CorporateAction[],
  opts: AdjustOptions,
): BarAdj[] {
  assertSeries(bars);
  const events = buildEvents(bars, actions, opts);
  let factor = 1;
  let volumeRatio: Ratio = { numerator: 1, denominator: 1 };
  let next = 0;
  const out: BarAdj[] = [];
  for (let i = bars.length - 1; i >= 0; i -= 1) {
    const bar = bars[i] as BarUnadj;
    for (let e = events[next]; e !== undefined && e.exDate > bar.date; e = events[next]) {
      factor *= e.factor;
      if (e.volume !== null) volumeRatio = multiplyRatios(volumeRatio, e.volume);
      next += 1;
    }
    out.push({
      instrumentId: bar.instrumentId,
      date: bar.date,
      open: bar.open * factor,
      high: bar.high * factor,
      low: bar.low * factor,
      close: bar.close * factor,
      volume: mulDiv(bar.volume, volumeRatio.numerator, volumeRatio.denominator, 'half_up'),
      snapshotId: bar.snapshotId,
    });
  }
  return out.reverse();
}
