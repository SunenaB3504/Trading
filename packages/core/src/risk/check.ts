import {
  DEFAULT_RISK_LIMITS,
  dailyLossHalted,
  quantityWithinPositionCap,
  quantityWithinTradeRisk,
} from './limits';
import type { RiskLimits } from './limits';

export type RiskReason =
  'daily_loss_halt' | 'position_cap' | 'trade_risk' | 'no_stop_trade_risk_unchecked';

export interface PreTradeInput {
  side: 'buy' | 'sell';
  requestedQuantity: number;
  pricePaise: number;
  /** Stop price for a long entry, or null when none is set. */
  stopPaise: number | null;
  equityPaise: number;
  startOfDayEquityPaise: number;
  /** Market value already held in this instrument. */
  heldValuePaise: number;
}

export interface PreTradeResult {
  allowed: boolean;
  /** Quantity after the caps; never more than requested. */
  quantity: number;
  reasons: RiskReason[];
}

/**
 * FR-T8. Sells and other exits are never limited here (the ledger rejects oversells). A buy is
 * refused during a daily-loss halt, and otherwise cut down to the tightest of the position cap and
 * the per-trade risk budget. A buy with no stop is checked against the position cap only and says so.
 */
export function preTradeCheck(
  input: PreTradeInput,
  limits: RiskLimits = DEFAULT_RISK_LIMITS,
): PreTradeResult {
  if (input.side === 'sell')
    return { allowed: true, quantity: input.requestedQuantity, reasons: [] };
  if (dailyLossHalted(input.startOfDayEquityPaise, input.equityPaise, limits)) {
    return { allowed: false, quantity: 0, reasons: ['daily_loss_halt'] };
  }
  const reasons: RiskReason[] = [];
  const byPosition = quantityWithinPositionCap(
    input.equityPaise,
    input.heldValuePaise,
    input.pricePaise,
    limits,
  );
  let quantity = Math.min(input.requestedQuantity, byPosition);
  if (byPosition < input.requestedQuantity) reasons.push('position_cap');
  if (input.stopPaise === null) {
    reasons.push('no_stop_trade_risk_unchecked');
  } else {
    const byRisk = quantityWithinTradeRisk(
      input.equityPaise,
      input.pricePaise,
      input.stopPaise,
      limits,
    );
    if (byRisk < quantity) reasons.push('trade_risk');
    quantity = Math.min(quantity, byRisk);
  }
  return { allowed: quantity > 0, quantity, reasons };
}
