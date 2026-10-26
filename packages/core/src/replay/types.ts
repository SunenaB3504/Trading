import type { BrokerProfile } from '../costs';
import type { BarUnadj, CorporateAction } from '../domain/market';
import type { Order } from '../domain/trading';
import type { Fill } from '../domain/trading';
import type { FillOptions, Intent } from '../fills';
import type { LedgerReport } from '../ledger';
import type { EntryMeta, LedgerState } from '../ledger';
import type { RiskLimits, RiskReason } from '../risk';
import type { TradeSummary } from '../analytics';

/** A frozen set of market data (FR-D6). Same snapshot + same orders = same report. */
export interface ReplaySnapshot {
  id: string;
  /** Unadjusted daily bars per instrument, ascending by date. */
  bars: Record<string, readonly BarUnadj[]>;
  /** Price band in percent per instrument (null or absent when unknown). */
  bandPct: Record<string, number | null>;
  tickPaise: number;
}

export interface ReplayOrder {
  order: Order;
  intent: Intent;
  /** Stop for a long entry, used for per-trade risk sizing. */
  stopPaise: number | null;
  meta: EntryMeta;
}

export interface ReplayConfig {
  capitalPaise: number;
  startAt: number;
  /** Last date to value the book at. */
  endDate: string;
  actions: readonly CorporateAction[];
  exchange?: 'NSE' | 'BSE';
  broker?: BrokerProfile;
  limits?: RiskLimits;
  fillOptions?: FillOptions;
  /** Instruments that pay no STT (gold, silver and liquid exchange-traded funds). */
  sttExempt?: readonly string[];
}

export type OutcomeStatus = 'filled' | 'expired' | 'rejected';

export interface OrderOutcome {
  orderId: string;
  status: OutcomeStatus;
  reason: string | null;
  requestedQuantity: number;
  filledQuantity: number;
  riskReasons: RiskReason[];
  exitBlockedSessions: number;
  tradingDate: string | null;
}

export interface ReplayResult {
  snapshotId: string;
  state: LedgerState;
  fills: Fill[];
  outcomes: OrderOutcome[];
  report: LedgerReport;
  summary: TradeSummary;
  /** SHA-256 over everything above in canonical form (NFR-1). */
  reportHash: string;
}
