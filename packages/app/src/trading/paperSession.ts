import {
  FixedClock,
  PaperExecutionAdapter,
  buildFixtureScenario,
  computeLedgerB,
  createRng,
  istToUtcMillis,
  winLossReport,
} from '@trading/core';
import type { OrderRecord, Position, ReplaySnapshot, WinLossReport } from '@trading/core';
import { REQUESTS_KEY } from '../backup/backupService';
import type { StoredOrder } from '../backup/backupService';
import { formatPaise } from '../format/rupees';
import { getStamped, putStamped } from '../store/kv';
import type { KeyValueStore } from '../store/kv';
import { toComparisonView } from '../viewModels/comparisonView';
import type { ComparisonView } from '../viewModels/comparisonView';
import { makeOrderRequest } from './orderRequest';
import { describeOrder, reasonText } from './orderText';
import type { OrderForm } from './orderRequest';

export { REQUESTS_KEY } from '../backup/backupService';
const REPORT_SEED = 'win-loss-report-v1';

type Stored = StoredOrder;

export interface SessionView {
  cash: string;
  positions: Array<{ instrumentId: string; quantity: number; basis: string }>;
  orders: Array<{ id: string; line: string; state: OrderRecord['state']; reason: string | null }>;
}

export type PlaceOutcome =
  | { ok: true; orderId: string; state: OrderRecord['state']; dataEnds: string }
  | { ok: false; error: string };

/** The instruments and prices the demo book trades: the core's frozen demo snapshot. */
export function demoMarket(): {
  snapshot: ReplaySnapshot;
  instruments: string[];
  lastDate: string;
} {
  const s = buildFixtureScenario();
  const instruments = Object.keys(s.snapshot.bars).sort();
  const dates = Object.values(s.snapshot.bars).flatMap((b) => b.map((x) => x.date));
  return { snapshot: s.snapshot, instruments, lastDate: dates.reduce((a, b) => (a > b ? a : b)) };
}

/**
 * The owner's paper book. Every order goes through `IExecutionAdapter`. The accepted requests are saved
 * on the device, and the book is rebuilt from them in placement order whenever it changes: the engine
 * is deterministic (NFR-1), so the book always equals a replay of the same orders, whatever order they
 * were entered in. The demo book lives at the end of the demo data, so its clock stands there.
 */
export class PaperSession {
  private adapter: PaperExecutionAdapter;

  private constructor(
    private readonly stored: Stored[],
    private readonly kv: KeyValueStore,
    private readonly now: () => number,
  ) {
    this.adapter = PaperSession.rebuild(stored);
  }

  private static rebuild(stored: readonly Stored[]): PaperExecutionAdapter {
    const { snapshot, lastDate } = demoMarket();
    const clock = new FixedClock(istToUtcMillis(lastDate, '16:00'));
    const adapter = new PaperExecutionAdapter(() => snapshot, buildFixtureScenario().config, clock);
    const inOrder = [...stored].sort(
      (a, b) =>
        a.request.order.placedAt - b.request.order.placedAt ||
        (a.request.order.id < b.request.order.id ? -1 : 1),
    );
    // The adapter takes requests synchronously inside its promises, so queueing them here is safe.
    for (const item of inOrder) void adapter.placeOrder(item.request, item.key);
    adapter.settle();
    return adapter;
  }

  static async open(kv: KeyValueStore, now: () => number): Promise<PaperSession> {
    const saved = await getStamped<Stored[]>(kv, REQUESTS_KEY);
    return new PaperSession([...(saved?.value ?? [])], kv, now);
  }

  async place(form: OrderForm): Promise<PlaceOutcome> {
    const built = makeOrderRequest(form, this.stored.length + 1);
    if (!built.ok) return built;
    const key = `ui-${built.request.order.id}`;
    const probe = PaperSession.rebuild(this.stored);
    const result = await probe.placeOrder(built.request, key);
    if (result.status === 'rejected')
      return { ok: false, error: `Order rejected: ${result.reasonCode}` };
    this.stored.push({ key, request: built.request });
    await putStamped(this.kv, REQUESTS_KEY, this.stored, this.now());
    this.adapter = PaperSession.rebuild(this.stored);
    const placed = (await this.adapter.getOrders()).find((o) => o.orderId === result.orderId);
    return {
      ok: true,
      orderId: result.orderId,
      state: placed?.state ?? 'pending',
      dataEnds: demoMarket().lastDate,
    };
  }

  /** Ledger A beside Ledger B for this book, from the same snapshot (FR-L3). */
  comparison(): ComparisonView {
    const { snapshot } = demoMarket();
    const cfg = buildFixtureScenario().config;
    const result = this.adapter.result();
    return toComparisonView(
      computeLedgerB(result, snapshot, cfg.actions, cfg.endDate, cfg.capitalPaise),
    );
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
    return {
      cash: formatPaise(cash),
      positions: positions.map((p) => ({
        instrumentId: p.instrumentId,
        quantity: p.quantity,
        basis: formatPaise(p.basisPaise),
      })),
      orders: orders
        .map((o) => ({
          id: o.orderId,
          line: describeOrder(o, byId.get(o.orderId)),
          state: o.state,
          reason: reasonText(o.reason),
        }))
        .reverse(),
    };
  }
}
