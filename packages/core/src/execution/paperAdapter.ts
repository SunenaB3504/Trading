import { istDateOfInstant } from '../calendar';
import type { Clock } from '../clock';
import { canonicalJson, sha256Hex } from '../hash';
import { cashBalance, positionBasis, quantityHeld } from '../ledger';
import { applyDue, byPlacement, finishRun, newRun, processOrder } from '../replay/run';
import type { Run } from '../replay/run';
import type { ReplayConfig, ReplayResult, ReplaySnapshot } from '../replay/types';
import type {
  CancelResult,
  ExecutionResult,
  IExecutionAdapter,
  OrderRecord,
  OrderRequest,
  Position,
} from './types';

interface Remembered {
  fingerprint: string;
  result: ExecutionResult;
}

const fingerprintOf = (r: OrderRequest): string => sha256Hex(canonicalJson(r));

function structuralProblem(r: OrderRequest): string | null {
  const o = r.order;
  if (!Number.isSafeInteger(o.quantity) || o.quantity <= 0) return 'invalid_quantity';
  if ((o.type === 'limit') !== (o.limitPaise !== null)) return 'limit_price_mismatch';
  return null;
}

function recordOf(r: OrderRequest, state: 'pending' | 'cancelled'): OrderRecord {
  return {
    orderId: r.order.id,
    state,
    reason: state === 'cancelled' ? 'cancelled_by_user' : null,
    requestedQuantity: r.order.quantity,
    filledQuantity: 0,
    tradingDate: null,
    riskReasons: [],
  };
}

/** A next-open order needs a bar after its trading date; a market-on-close order needs the day's own bar. */
function dataReady(snap: ReplaySnapshot, r: OrderRequest): boolean {
  const bars = snap.bars[r.order.instrumentId] ?? [];
  const last = bars[bars.length - 1]?.date;
  if (last === undefined) return false;
  return r.order.fillRuleId.startsWith('moc')
    ? last >= r.order.tradingDate
    : last > r.order.tradingDate;
}

/**
 * Paper trading behind `IExecutionAdapter`. It runs the same ledger, risk, cost and fill code as the
 * replay (the P1 engine), one order at a time, so a paper trade and a replayed trade cannot differ.
 *
 * Placement checks only the order's shape. Cash, position size, risk caps and circuit locks are
 * decided when the fill is simulated, exactly as in the replay, and show up in `getOrders` as a
 * `rejected` or `expired` order with a reason. `settle()` simulates every pending order whose fill
 * session has data in the snapshot; an order whose session has no bar yet stays `pending`. A circuit
 * carry-over that runs past the end of the data would expire early, so settle only when the data
 * reaches well past the order. Reads apply corporate actions due by the clock's date, so orders should
 * be placed in date order (or the book rebuilt from the saved orders, as the app does).
 */
export class PaperExecutionAdapter implements IExecutionAdapter {
  private readonly run: Run;
  private pending: OrderRequest[] = [];
  private readonly cancelled = new Map<string, OrderRequest>();
  private readonly seen = new Map<string, Remembered>();
  private readonly ids = new Set<string>();

  constructor(
    private readonly snapshot: () => ReplaySnapshot,
    config: ReplayConfig,
    private readonly clock: Clock,
  ) {
    this.run = newRun(snapshot(), config);
  }

  placeOrder(request: OrderRequest, idempotencyKey: string): Promise<ExecutionResult> {
    const fingerprint = fingerprintOf(request);
    const earlier = this.seen.get(idempotencyKey);
    if (earlier !== undefined) {
      const same = earlier.fingerprint === fingerprint;
      return Promise.resolve(
        same ? earlier.result : { status: 'rejected', reasonCode: 'idempotency_key_reused' },
      );
    }
    const result = this.accept(request);
    this.seen.set(idempotencyKey, { fingerprint, result });
    return Promise.resolve(result);
  }

  private accept(request: OrderRequest): ExecutionResult {
    const problem = structuralProblem(request);
    if (problem !== null) return { status: 'rejected', reasonCode: problem };
    if (this.ids.has(request.order.id))
      return { status: 'rejected', reasonCode: 'duplicate_order_id' };
    if ((this.snapshot().bars[request.order.instrumentId] ?? []).length === 0)
      return { status: 'rejected', reasonCode: 'unknown_instrument' };
    this.ids.add(request.order.id);
    this.pending.push(request);
    return { status: 'accepted', orderId: request.order.id };
  }

  cancelOrder(orderId: string): Promise<CancelResult> {
    const found = this.pending.find((p) => p.order.id === orderId);
    if (found === undefined) {
      const reasonCode = this.ids.has(orderId) ? 'already_final' : 'unknown_order';
      return Promise.resolve({ status: 'not_cancellable', orderId, reasonCode });
    }
    this.pending = this.pending.filter((p) => p !== found);
    this.cancelled.set(orderId, found);
    return Promise.resolve({ status: 'cancelled', orderId });
  }

  /** Simulates every pending order that has data to fill against; returns how many were settled. */
  settle(): number {
    const snap = this.snapshot();
    const ready = this.pending.filter((p) => dataReady(snap, p)).sort(byPlacement);
    this.run.snapshot = snap;
    for (const r of ready) processOrder(this.run, r);
    this.pending = this.pending.filter((p) => !ready.includes(p));
    return ready.length;
  }

  getOrders(): Promise<OrderRecord[]> {
    const done: OrderRecord[] = this.run.outcomes.map((o) => ({
      orderId: o.orderId,
      state: o.status,
      reason: o.reason,
      requestedQuantity: o.requestedQuantity,
      filledQuantity: o.filledQuantity,
      tradingDate: o.tradingDate,
      riskReasons: o.riskReasons,
    }));
    const open = this.pending.map((p) => recordOf(p, 'pending'));
    const gone = [...this.cancelled.values()].map((p) => recordOf(p, 'cancelled'));
    return Promise.resolve([...done, ...open, ...gone]);
  }

  /** Corporate actions with an ex-date up to the clock's date (idempotent). */
  private catchUp(): void {
    applyDue(this.run, istDateOfInstant(this.clock.now()));
  }

  getPositions(): Promise<Position[]> {
    this.catchUp();
    const ids = [...new Set(this.run.state.lots.map((l) => l.instrumentId))].sort();
    return Promise.resolve(
      ids
        .map((id) => ({
          instrumentId: id,
          quantity: quantityHeld(this.run.state, id),
          basisPaise: positionBasis(this.run.state, id),
        }))
        .filter((p) => p.quantity > 0),
    );
  }

  getCashBalance(): Promise<number> {
    this.catchUp();
    return Promise.resolve(cashBalance(this.run.state));
  }

  /** The reconciled report and its hash, identical to a replay of the same orders (NFR-1). */
  result(): ReplayResult {
    this.run.snapshot = this.snapshot();
    return finishRun(this.run);
  }
}
