import { istToUtcMillis } from '../calendar';
import { adjustSeries } from '../corporate';
import type { BarAdj, BarUnadj, CorporateAction } from '../domain/market';
import type { Order } from '../domain/trading';
import { cashBalance, quantityHeld } from '../ledger';
import { DEFAULT_RISK_LIMITS } from '../risk';
import { applyDue, byPlacement, newRun, processOrder } from '../replay/run';
import type { Run } from '../replay/run';
import type { ReplayOrder, ReplaySnapshot } from '../replay/types';
import { breakoutRatio, coolOffOver, exitReason } from './rules';
import type { ExitReason, StrategyParams } from './rules';

/** Room kept for a gap up between the decision close and the next open, and for charges, when sizing a buy. */
export const SIZING_BUFFER_BPS = 350;

export interface StrategySetup {
  snapshot: ReplaySnapshot;
  actions: readonly CorporateAction[];
  /** Instruments the rules may buy. */
  universe: readonly string[];
  params: StrategyParams;
  capitalPaise: number;
  /** `hold` buys this instrument on the first day and keeps it (the index benchmark account). */
  hold?: string;
  /** Instruments that pay no STT. */
  sttExempt?: readonly string[];
}

export interface StrategyHolding {
  entryDate: string;
  /** Adjusted open of the entry day, the price the stops are measured from. */
  entryRef: number;
}

/** What the runner remembers; the orders are enough to rebuild everything else. */
export interface SavedRun {
  lastDate: string;
  orders: ReplayOrder[];
  curve: Array<[string, number]>;
}

export interface DayNote {
  date: string;
  instrumentId: string;
  what: string;
}

interface Series {
  bars: BarAdj[];
  at: Map<string, number>;
}

const SOURCE = 'rule:breakout@3.0';

function seriesOf(snapshot: ReplaySnapshot, actions: readonly CorporateAction[], ids: readonly string[]): Map<string, Series> {
  const out = new Map<string, Series>();
  for (const id of ids) {
    const raw = snapshot.bars[id];
    if (raw === undefined || raw.length === 0) continue;
    const bars = adjustSeries(raw, actions, { includeDividends: false });
    out.set(id, { bars, at: new Map(bars.map((b, i) => [b.date, i])) });
  }
  return out;
}

function sessionList(snapshot: ReplaySnapshot, ids: readonly string[]): string[] {
  const all = new Set<string>();
  for (const id of ids) for (const b of snapshot.bars[id] ?? []) all.add(b.date);
  return [...all].sort();
}

function dayBars(snapshot: ReplaySnapshot, id: string): Map<string, BarUnadj> {
  return new Map((snapshot.bars[id] ?? []).map((b) => [b.date, b]));
}

/**
 * Runs the strategy one session at a time against a frozen snapshot, through the replay engine, so fills,
 * charges, risk limits and the ledger are exactly those of practice trading. A decision on a date is made after
 * that date's close from bars up to and including it; the order fills at the next session's open. The runner
 * can be rebuilt from its saved orders (`resume`) and carry on, which is how the Robo accounts catch up.
 */
export class StrategyRunner {
  readonly run: Run;
  readonly orders: ReplayOrder[] = [];
  readonly curve: Array<[string, number]> = [];
  readonly notes: DayNote[] = [];
  readonly holdings = new Map<string, StrategyHolding>();
  private readonly lastExit = new Map<string, string>();
  private readonly series: Map<string, Series>;
  private readonly sessions: string[];
  private readonly sessionAt: Map<string, number>;
  private readonly unadj = new Map<string, Map<string, BarUnadj>>();
  private pending: ReplayOrder[] = [];
  private seq = 0;
  lastDate: string | null = null;

  constructor(readonly setup: StrategySetup, startAt: number) {
    const ids = [...new Set([...setup.universe, ...(setup.hold === undefined ? [] : [setup.hold])])];
    this.series = seriesOf(setup.snapshot, setup.actions, ids);
    this.sessions = sessionList(setup.snapshot, ids);
    this.sessionAt = new Map(this.sessions.map((d, i) => [d, i]));
    const cap = Math.max(10_000, setup.params.positionBps);
    this.run = newRun(setup.snapshot, {
      capitalPaise: setup.capitalPaise,
      startAt,
      endDate: this.sessions[this.sessions.length - 1] ?? '2020-04-01',
      actions: setup.actions,
      limits: { ...DEFAULT_RISK_LIMITS, maxPositionBps: setup.hold === undefined ? Math.max(DEFAULT_RISK_LIMITS.maxPositionBps, setup.params.positionBps) : cap },
      ...(setup.sttExempt === undefined ? {} : { sttExempt: setup.sttExempt }),
    });
    for (const id of ids) this.unadj.set(id, dayBars(setup.snapshot, id));
  }

  /** The sessions the runner knows prices for, in order. */
  get dates(): readonly string[] {
    return this.sessions;
  }

  /** Rebuilds a runner from saved orders, as if it had run to `saved.lastDate`. */
  static resume(setup: StrategySetup, startAt: number, saved: SavedRun): StrategyRunner {
    const r = new StrategyRunner(setup, startAt);
    const settled = [...saved.orders].sort(byPlacement);
    for (const ro of settled) {
      r.orders.push(ro);
      r.seq = Math.max(r.seq, Number(ro.order.id.slice(2)) || 0);
      if (ro.order.tradingDate < saved.lastDate) r.settleOne(ro);
      else r.pending.push(ro);
    }
    applyDue(r.run, saved.lastDate);
    r.curve.push(...saved.curve);
    r.lastDate = saved.lastDate;
    return r;
  }

  saved(): SavedRun {
    return { lastDate: this.lastDate ?? '', orders: [...this.orders], curve: [...this.curve] };
  }

  /** Takes the session at `date`: settles yesterday's orders, values the account, then decides today's orders. */
  step(date: string): void {
    if (this.lastDate !== null && date <= this.lastDate) throw new RangeError(`session ${date} is not after ${this.lastDate}`);
    this.settlePending(date);
    applyDue(this.run, date);
    this.curve.push([date, this.equityAt(date)]);
    this.decide(date);
    this.lastDate = date;
  }

  /** Steps through the sessions from `from` to `to` that come after the last one taken. */
  stepRange(from: string, to: string): void {
    for (const d of this.sessions) {
      if (d > to) break;
      if (d >= from && (this.lastDate === null || d > this.lastDate)) this.step(d);
    }
  }

  /** Steps through every known session after the last one taken, up to and including `to`. */
  stepTo(to: string): void {
    for (const d of this.sessions) {
      if (d > to) break;
      if (this.lastDate === null || d > this.lastDate) this.step(d);
    }
  }

  /** Value of cash and holdings at `date`'s close (the last close known for a share with no bar that day). */
  equityAt(date: string): number {
    let total = cashBalance(this.run.state);
    for (const id of this.holdings.keys()) total += quantityHeld(this.run.state, id) * (this.closeOnOrBefore(id, date) ?? 0);
    return total;
  }

  private closeOnOrBefore(id: string, date: string): number | null {
    const bars = this.setup.snapshot.bars[id] ?? [];
    let lo = 0;
    let hi = bars.length - 1;
    let found: number | null = null;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const b = bars[mid] as BarUnadj;
      if (b.date <= date) {
        found = b.close;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return found;
  }

  private settlePending(date: string): void {
    const todays = this.pending;
    this.pending = [];
    for (const ro of todays) this.settleOne(ro, date);
  }

  private settleOne(ro: ReplayOrder, date?: string): void {
    processOrder(this.run, ro);
    const out = this.run.outcomes[this.run.outcomes.length - 1];
    const id = ro.order.instrumentId;
    if (out?.status === 'filled' && out.tradingDate !== null) {
      this.record(ro.order.side, id, out.tradingDate);
    } else if (date !== undefined) {
      this.notes.push({ date, instrumentId: id, what: `${ro.order.side} not filled${out?.reason ? `: ${out.reason}` : ''}` });
    }
  }

  private record(side: 'buy' | 'sell', id: string, filledOn: string): void {
    if (side === 'sell') {
      this.holdings.delete(id);
      this.lastExit.set(id, filledOn);
      return;
    }
    const s = this.series.get(id);
    this.holdings.set(id, { entryDate: filledOn, entryRef: s?.bars[s.at.get(filledOn) ?? -1]?.open ?? 0 });
  }

  private nextId(): string {
    this.seq += 1;
    return `s-${String(this.seq).padStart(5, '0')}`;
  }

  private place(date: string, id: string, side: 'buy' | 'sell', quantity: number, limit: number | null, why: string): ReplayOrder {
    const oid = this.nextId();
    const order: Order = {
      id: oid,
      decisionId: `d-${oid}`,
      instrumentId: id,
      side,
      type: limit === null ? 'market' : 'limit',
      quantity,
      limitPaise: limit,
      triggerPaise: null,
      triggerWhen: null,
      validity: 'day',
      validUntil: null,
      placedAt: istToUtcMillis(date, '16:00'),
      tradingDate: date,
      status: 'open',
      source: SOURCE,
      rationale: why,
      fillRuleId: 'next-open@1',
      blockedReason: null,
    };
    const ro: ReplayOrder = { order, intent: side === 'buy' ? 'entry' : 'exit', stopPaise: null, meta: { source: SOURCE, bucket: null, tags: [why] } };
    this.orders.push(ro);
    this.pending.push(ro);
    return ro;
  }

  private decide(date: string): void {
    if (this.setup.hold !== undefined) {
      this.decideHold(date, this.setup.hold);
      return;
    }
    this.decideExits(date);
    this.decideEntries(date);
  }

  private decideHold(date: string, id: string): void {
    if (this.orders.length > 0) return;
    const close = this.unadj.get(id)?.get(date)?.close;
    if (close === undefined || close <= 0) return;
    const budget = (cashBalance(this.run.state) * 10_000) / (10_000 + SIZING_BUFFER_BPS);
    const qty = Math.floor(budget / close);
    if (qty >= 1) this.place(date, id, 'buy', qty, null, 'buy and hold');
  }

  private sessionsSince(entryDate: string, date: string): number {
    return (this.sessionAt.get(date) ?? 0) - (this.sessionAt.get(entryDate) ?? 0);
  }

  private highestClose(id: string, entryDate: string, upTo: number): number {
    const s = this.series.get(id);
    let top = 0;
    for (let k = s?.at.get(entryDate) ?? 0; k <= upTo; k += 1) top = Math.max(top, s?.bars[k]?.close ?? 0);
    return top;
  }

  private decideExits(date: string): void {
    for (const [id, h] of [...this.holdings].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
      const s = this.series.get(id);
      const i = s?.at.get(date);
      const bar = i === undefined ? undefined : s?.bars[i];
      if (i === undefined || bar === undefined) {
        this.notes.push({ date, instrumentId: id, what: 'no price today, so no exit decision' });
        continue;
      }
      const why: ExitReason | null = exitReason(
        { entryRef: h.entryRef, highestClose: this.highestClose(id, h.entryDate, i), sessionsHeld: this.sessionsSince(h.entryDate, date) },
        bar.close,
        this.setup.params,
      );
      const qty = quantityHeld(this.run.state, id);
      if (why !== null && qty > 0) this.place(date, id, 'sell', qty, null, why);
    }
  }

  private candidates(date: string): Array<{ id: string; ratio: number }> {
    const today = this.sessionAt.get(date) ?? 0;
    const out: Array<{ id: string; ratio: number }> = [];
    for (const id of this.setup.universe) {
      const s = this.series.get(id);
      const i = s?.at.get(date);
      if (s === undefined || i === undefined || this.holdings.has(id)) continue;
      const exited = this.lastExit.get(id);
      if (!coolOffOver(exited === undefined ? undefined : this.sessionAt.get(exited), today, this.setup.params)) continue;
      const ratio = breakoutRatio(s.bars, i, this.setup.params);
      if (ratio !== null) out.push({ id, ratio });
    }
    return out.sort((a, b) => b.ratio - a.ratio || (a.id < b.id ? -1 : 1));
  }

  private decideEntries(date: string): void {
    const p = this.setup.params;
    let slots = p.maxPositions - this.holdings.size;
    let cash = cashBalance(this.run.state);
    const target = Math.floor((this.equityAt(date) * p.positionBps) / 10_000);
    for (const c of this.candidates(date)) {
      if (slots <= 0) break;
      const close = this.unadj.get(c.id)?.get(date)?.close ?? 0;
      const qty = close > 0 ? Math.floor((Math.min(target, cash) * 10_000) / (close * (10_000 + SIZING_BUFFER_BPS))) : 0;
      if (qty < 1) {
        this.notes.push({ date, instrumentId: c.id, what: 'breakout skipped: not enough cash for a position' });
        continue;
      }
      this.place(date, c.id, 'buy', qty, p.entry === 'limit_prev_close' ? close : null, 'breakout');
      cash -= Math.ceil((qty * close * (10_000 + SIZING_BUFFER_BPS)) / 10_000);
      slots -= 1;
    }
  }
}
