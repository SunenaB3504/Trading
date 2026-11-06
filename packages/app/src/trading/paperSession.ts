import {
  FixedClock,
  equityAt,
  marksAsOf,
  checkMistakes,
  PaperExecutionAdapter,
  computeLedgerB,
  createRng,
  istToUtcMillis,
  winLossReport,
} from '@trading/core';
import type { Fill, Flag, MistakeLimits, OrderRecord, Position, ReplayConfig, Trade, WinLossReport } from '@trading/core';
import { REQUESTS_KEY } from '../backup/backupService';
import type { StoredOrder } from '../backup/backupService';
import { formatPaise } from '../format/rupees';
import { getStamped, putStamped } from '../store/kv';
import type { KeyValueStore } from '../store/kv';
import { toComparisonView } from '../viewModels/comparisonView';
import type { ComparisonView } from '../viewModels/comparisonView';
import { demoMarket, requestsKey } from './market';
import type { Market } from './market';
import { exitEvent, exitRequest, loadExitPlans, readExitPlan, saveExitPlans } from './exitPlans';
import type { ExitPlan, ExitPlanInput } from './exitPlans';
import { makeOrderRequest } from './orderRequest';
import { describeOrder, reasonText } from './orderText';
import { shareNoteLines } from './shareNote';
import type { OrderForm } from './orderRequest';

export { REQUESTS_KEY } from '../backup/backupService';
const REPORT_SEED = 'win-loss-report-v1';

type Stored = StoredOrder;

/**
 * One open position as the person needs it before selling: how many, what they cost on average, what they are worth at
 * the last close, and the profit or loss so far (before selling charges). Paise throughout; null mark with no price.
 */
export interface Holding {
  instrumentId: string;
  symbol: string;
  quantity: number;
  /** What the shares still held cost, charges on buying included. */
  basis: string;
  basisPaise: number;
  averagePaise: number;
  /** Close on the market's last date, adjusted for later splits and bonuses; null when the stock has no price then. */
  markPaise: number | null;
  valuePaise: number | null;
  pnlPaise: number | null;
  pnlRatio: number | null;
  /** Its exit plan, while one is waiting or has been reached. */
  plan: ExitPlan | null;
}

export interface SessionView {
  cash: string;
  positions: Holding[];
  orders: Array<{ id: string; line: string; state: OrderRecord['state']; reason: string | null; note: Array<[string, string]> | null }>;
}

export type PlaceOutcome =
  | { ok: true; orderId: string; state: OrderRecord['state']; dataEnds: string }
  | { ok: false; error: string };

export { demoMarket } from './market';

/**
 * The owner's paper book. Every order goes through `IExecutionAdapter`. The accepted requests are saved
 * on the device, and the book is rebuilt from them in placement order whenever it changes: the engine
 * is deterministic (NFR-1), so the book always equals a replay of the same orders, whatever order they
 * were entered in. The demo book lives at the end of the demo data, so its clock stands there.
 */
export class PaperSession {
  private adapter: PaperExecutionAdapter;
  private plans: ExitPlan[] = [];

  private constructor(
    private readonly stored: Stored[],
    private readonly kv: KeyValueStore,
    private readonly now: () => number,
    private readonly market: Market,
  ) {
    this.adapter = PaperSession.rebuild(stored, market);
  }

  private static rebuild(stored: readonly Stored[], market: Market): PaperExecutionAdapter {
    const clock = new FixedClock(istToUtcMillis(market.lastDate, '16:00'));
    const adapter = new PaperExecutionAdapter(() => market.snapshot, market.config, clock);
    const inOrder = [...stored].sort(
      (a, b) =>
        a.request.order.placedAt - b.request.order.placedAt ||
        (a.request.order.id < b.request.order.id ? -1 : 1),
    );
    // The adapter takes requests synchronously inside its promises, so queueing them here is safe.
    for (const item of inOrder) {
      void adapter.placeOrder(item.request, item.key);
      if (item.cancelled === true) void adapter.cancelOrder(item.request.order.id);
    }
    adapter.settle();
    return adapter;
  }

  /** Opens the profile's book for one market (the demo market when none is given). */
  static async open(
    kv: KeyValueStore,
    now: () => number,
    market: Market = demoMarket(),
  ): Promise<PaperSession> {
    const saved = await getStamped<Stored[]>(kv, requestsKey(market.id, REQUESTS_KEY));
    const session = new PaperSession([...(saved?.value ?? [])], kv, now, market);
    session.plans = await loadExitPlans(kv, market.id);
    await session.runExitPlans();
    return session;
  }

  private async saveBook(): Promise<void> {
    await putStamped(this.kv, requestsKey(this.market.id, REQUESTS_KEY), this.stored, this.now());
    this.adapter = PaperSession.rebuild(this.stored, this.market);
  }

  /**
   * Checks every waiting exit plan against the prices since it was set. In `auto` mode the first event becomes the one
   * sell order that carries it out (so there are never two competing exits); in `ask` mode the plan is marked reached
   * and waits for the person. A plan whose shares are gone (sold by hand) ends quietly.
   */
  private async runExitPlans(): Promise<void> {
    const held = new Map((await this.adapter.getPositions()).map((p) => [p.instrumentId, p.quantity]));
    let changed = false;
    for (const plan of this.plans.filter((p) => p.status === 'active'))
      changed = this.stepPlan(plan, held.get(plan.instrumentId) ?? 0) || changed;
    if (!changed) return;
    await this.saveBook();
    await saveExitPlans(this.kv, this.market.id, this.plans, this.now());
  }

  /** One waiting plan against the prices: true when it changed (reached, carried out, or ended with its shares). */
  private stepPlan(plan: ExitPlan, held: number): boolean {
    const quantity = Math.min(plan.quantity, held);
    if (quantity <= 0) {
      plan.status = 'done';
      return true;
    }
    const bars = this.market.snapshot.bars[plan.instrumentId] ?? [];
    const event = exitEvent(plan, bars);
    if (event === null) return false;
    plan.event = event;
    plan.status = plan.mode === 'auto' ? 'done' : 'reached';
    if (plan.mode === 'auto') {
      const previous = [...bars].reverse().find((b) => b.date < event.date)?.date ?? event.date;
      const id = `x-${String(this.stored.filter((x) => x.request.order.id.startsWith('x-')).length + 1).padStart(4, '0')}`;
      this.stored.push({ key: `exit-${plan.id}`, request: exitRequest(plan, event, quantity, previous, id) });
      plan.orderId = id;
    }
    return true;
  }

  /** Sets or replaces the exit plan of a holding; it counts from the market's last date on, never looking back. */
  async setExitPlan(instrumentId: string, input: ExitPlanInput): Promise<{ ok: true } | { ok: false; error: string }> {
    const held = (await this.adapter.getPositions()).find((p) => p.instrumentId === instrumentId)?.quantity ?? 0;
    const bars = this.market.snapshot.bars[instrumentId] ?? [];
    const close = bars[bars.length - 1]?.close ?? 0;
    const read = readExitPlan(input, held, close, this.market.lastDate);
    if (!read.ok) return read;
    const plan: ExitPlan = {
      id: `${instrumentId}@${String(this.now())}`,
      instrumentId,
      quantity: read.quantity,
      stopPaise: read.stopPaise,
      targetPaise: read.targetPaise,
      exitDate: read.exitDate,
      mode: input.mode,
      startDate: this.market.lastDate,
      status: 'active',
    };
    this.plans = [...this.plans.filter((p) => p.instrumentId !== instrumentId || p.status === 'done'), plan];
    await saveExitPlans(this.kv, this.market.id, this.plans, this.now());
    return { ok: true };
  }

  /** Takes a waiting or reached plan away: the shares are simply kept. */
  async removeExitPlan(instrumentId: string): Promise<void> {
    this.plans = this.plans.filter((p) => p.instrumentId !== instrumentId || p.status === 'done');
    await saveExitPlans(this.kv, this.market.id, this.plans, this.now());
  }

  /** A reached plan in `ask` mode, confirmed: a market sell at the next open, since the moment itself has passed. */
  async sellReached(instrumentId: string): Promise<PlaceOutcome> {
    const plan = this.plans.find((p) => p.instrumentId === instrumentId && p.status === 'reached');
    const held = (await this.adapter.getPositions()).find((p) => p.instrumentId === instrumentId)?.quantity ?? 0;
    if (plan === undefined || held === 0) return { ok: false, error: 'There is nothing to sell for this plan.' };
    const form: OrderForm = { instrumentId, side: 'sell', type: 'market', quantity: String(Math.min(plan.quantity, held)), limit: '', stop: '', date: this.market.lastDate };
    const placed = await this.place(form);
    if (!placed.ok) return placed;
    plan.status = 'done';
    plan.orderId = placed.orderId;
    await saveExitPlans(this.kv, this.market.id, this.plans, this.now());
    return placed;
  }

  async place(form: OrderForm): Promise<PlaceOutcome> {
    const built = makeOrderRequest(form, this.stored.length + 1);
    if (!built.ok) return built;
    const key = `ui-${built.request.order.id}`;
    if (form.date < this.market.firstTradeDate)
      return {
        ok: false,
        error: `Orders can be placed from ${this.market.firstTradeDate}: the charges table starts then.`,
      };
    const probe = PaperSession.rebuild(this.stored, this.market);
    const result = await probe.placeOrder(built.request, key);
    if (result.status === 'rejected')
      return { ok: false, error: `Order rejected: ${result.reasonCode}` };
    this.stored.push({ key, request: built.request });
    await putStamped(this.kv, requestsKey(this.market.id, REQUESTS_KEY), this.stored, this.now());
    this.adapter = PaperSession.rebuild(this.stored, this.market);
    const placed = (await this.adapter.getOrders()).find((o) => o.orderId === result.orderId);
    return {
      ok: true,
      orderId: result.orderId,
      state: placed?.state ?? 'pending',
      dataEnds: this.market.lastDate,
    };
  }

  /** Cancels an order that is still waiting; a filled, expired or rejected order cannot be cancelled. */
  async cancel(orderId: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const item = this.stored.find((s) => s.request.order.id === orderId);
    const state = (await this.adapter.getOrders()).find((o) => o.orderId === orderId)?.state;
    if (item === undefined || state !== 'pending')
      return { ok: false, error: 'Only an order that is still waiting can be cancelled.' };
    item.cancelled = true;
    await putStamped(this.kv, requestsKey(this.market.id, REQUESTS_KEY), this.stored, this.now());
    this.adapter = PaperSession.rebuild(this.stored, this.market);
    return { ok: true };
  }

  /**
   * The mistake checker over this book (SSD v4.1 §6.2): every order that was not cancelled or refused, and every fill.
   * `journalExit` holds the ids of orders whose journal note names an exit plan.
   */
  async mistakes(journalExit: ReadonlySet<string>, limits: MistakeLimits): Promise<Flag[]> {
    const states = new Map((await this.adapter.getOrders()).map((o) => [o.orderId, o.state]));
    const orders = this.stored
      .filter((s) => s.cancelled !== true && states.get(s.request.order.id) !== 'rejected')
      .map((s) => ({ id: s.request.order.id, instrumentId: s.request.order.instrumentId, side: s.request.order.side, type: s.request.order.type, date: s.request.order.tradingDate }));
    const fills = this.adapter.result().fills.map((f) => ({ orderId: f.orderId, instrumentId: f.instrumentId, side: f.side, quantity: f.quantity, pricePaise: f.pricePaise, date: f.tradingDate }));
    return checkMistakes({ orders, fills, journalExit, capitalPaise: this.market.config.capitalPaise, limits });
  }

  /** Ledger A beside Ledger B for this book, from the same snapshot (FR-L3). */
  comparison(): ComparisonView {
    const { snapshot, config: cfg } = this.market;
    const result = this.adapter.result();
    return toComparisonView(
      computeLedgerB(result, snapshot, cfg.actions, cfg.endDate, cfg.capitalPaise),
    );
  }

  /** Cash plus the holdings at the adjusted close on the last date of the market, in whole paise. */
  equityPaise(): number {
    const { state } = this.adapter.result();
    return equityAt(state, marksAsOf(this.market.snapshot, this.market.config.actions, state, this.market.lastDate));
  }

  /** Round trips that have been closed, for the tax report. */
  closedTrades(): Trade[] {
    return this.adapter.result().state.trades.filter((t) => t.closedOn !== null);
  }

  /** Win/loss report with bootstrap intervals; the seed is fixed so the same book gives the same numbers. */
  report(): WinLossReport {
    return winLossReport(this.adapter.result().state.trades, createRng(REPORT_SEED));
  }

  async view(): Promise<SessionView> {
    const [orders, positions, cash]: [OrderRecord[], Position[], number] = await Promise.all([
      this.adapter.getOrders(),
      this.adapter.getPositions(),
      this.adapter.getCashBalance(),
    ]);
    const byId = new Map(this.stored.map((s) => [s.request.order.id, s.request]));
    const fills = new Map(this.adapter.result().fills.map((f) => [f.orderId, f]));
    const symbolOf = (id: string): string => this.market.symbols[id] ?? id;
    const marks = marksAsOf(this.market.snapshot, this.market.config.actions, this.adapter.result().state, this.market.lastDate);
    return {
      cash: formatPaise(cash),
      positions: positions.map((p) => ({
        ...holdingOf(p, symbolOf(p.instrumentId), marks[p.instrumentId] ?? null),
        plan: this.plans.find((x) => x.instrumentId === p.instrumentId && x.status !== 'done') ?? null,
      })),
      orders: orders
        .map((o) => ({
          id: o.orderId,
          line: describeOrder(o, byId.get(o.orderId), (id) => this.market.symbols[id] ?? id),
          state: o.state,
          reason: reasonText(o.reason),
          note: noteOf(fills.get(o.orderId), symbolOf, this.market.config),
        }))
        .reverse(),
    };
  }
}

function holdingOf(p: Position, symbol: string, mark: number | null): Omit<Holding, 'plan'> {
  const value = mark === null ? null : mark * p.quantity;
  const pnl = value === null ? null : value - p.basisPaise;
  return {
    instrumentId: p.instrumentId,
    symbol,
    quantity: p.quantity,
    basis: formatPaise(p.basisPaise),
    basisPaise: p.basisPaise,
    averagePaise: p.quantity > 0 ? Math.round(p.basisPaise / p.quantity) : 0,
    markPaise: mark,
    valuePaise: value,
    pnlPaise: pnl,
    pnlRatio: pnl === null || p.basisPaise === 0 ? null : pnl / p.basisPaise,
  };
}

function noteOf(fill: Fill | undefined, symbolOf: (id: string) => string, cfg: ReplayConfig): Array<[string, string]> | null {
  return fill === undefined ? null : shareNoteLines(fill, symbolOf(fill.instrumentId), cfg);
}
