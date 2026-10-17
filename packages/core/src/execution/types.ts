import type { Paise } from '../domain/primitives';
import type { Order } from '../domain/trading';
import type { Intent } from '../fills';
import type { EntryMeta } from '../ledger';
import type { RiskReason } from '../risk';

/**
 * What a caller asks for. (The owner's draft called this a `TradeTicket`; "ticket" already means the
 * experimental arm output of SSD §5.9, so it is `OrderRequest`.)
 */
export interface OrderRequest {
  order: Order;
  intent: Intent;
  /** Stop for a long entry, used for per-trade risk sizing. */
  stopPaise: number | null;
  meta: EntryMeta;
}

export type ExecutionResult =
  { status: 'accepted'; orderId: string } | { status: 'rejected'; reasonCode: string };

export type CancelResult =
  | { status: 'cancelled'; orderId: string }
  | { status: 'not_cancellable'; orderId: string; reasonCode: 'already_final' | 'unknown_order' };

export type OrderState = 'pending' | 'filled' | 'expired' | 'rejected' | 'cancelled';

export interface OrderRecord {
  orderId: string;
  state: OrderState;
  /** Why an order was not filled (circuit, limit, risk, ledger, ...). */
  reason: string | null;
  requestedQuantity: number;
  filledQuantity: number;
  tradingDate: string | null;
  riskReasons: RiskReason[];
}

export interface Position {
  instrumentId: string;
  quantity: number;
  basisPaise: Paise;
}

/**
 * The one seam through which the UI and the rule arms place orders (SSD §9.4, FR-P8). Balances are
 * integer paise as safe-integer numbers, never BigInt. `placeOrder` accepts or rejects; a fill
 * arrives later (next open, D3) and is read back through `getOrders`.
 */
export interface IExecutionAdapter {
  placeOrder(request: OrderRequest, idempotencyKey: string): Promise<ExecutionResult>;
  cancelOrder(orderId: string): Promise<CancelResult>;
  getOrders(): Promise<OrderRecord[]>;
  getPositions(): Promise<Position[]>;
  getCashBalance(): Promise<Paise>;
}
