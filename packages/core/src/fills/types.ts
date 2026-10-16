import type { BlockedReason, OrderStatus } from '../domain/enums';
import type { BarUnadj } from '../domain/market';
import type { UtcMillis } from '../domain/primitives';

/** Everything the simulator knows about one instrument on one session date. */
export interface FillContext {
  /** The day's unadjusted bar, or null when none exists (data gap or closed). */
  bar: BarUnadj | null;
  /** Previous session's unadjusted close, for price-band prices. */
  prevClosePaise: number | null;
  /** Price band in percent (2, 5, 10, 20) from the point-in-time status, or null if unknown. */
  bandPct: number | null;
  suspended: boolean;
  eligible: boolean;
  /** Minimum price step in paise (5 for most NSE equities). */
  tickPaise: number;
}

export type ContextProvider = (instrumentId: string, date: string) => FillContext;

/** `trade-through` is the default (D22); `touch` is the sensitivity variant. */
export type LimitRule = 'trade-through' | 'touch';

export interface FillOptions {
  limitRule: LimitRule;
  /** How many further sessions a circuit-blocked exit may wait before the order expires (D19). */
  maxCarrySessions: number;
}

export const DEFAULT_FILL_OPTIONS: FillOptions = {
  limitRule: 'trade-through',
  maxCarrySessions: 20,
};

export type Intent = 'entry' | 'exit';

export interface FillRecord {
  pricePaise: number;
  quantity: number;
  filledAt: UtcMillis;
  tradingDate: string;
}

export interface Attempt {
  date: string;
  result: 'filled' | 'blocked' | 'not-filled' | 'rejected';
  reason: BlockedReason | null;
}

export interface FillResult {
  status: OrderStatus;
  fill: FillRecord | null;
  blockedReason: BlockedReason | null;
  attempts: Attempt[];
  /** Sessions an exit waited behind a circuit lock (SSD §11.1 "exit-blocked sessions"). */
  exitBlockedSessions: number;
}

export class FillError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FillError';
  }
}
