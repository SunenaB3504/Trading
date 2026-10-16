import { mulDiv } from '../money';

/**
 * Hard caps that override any arm's sizing (FR-T8). All percentages are basis points of portfolio
 * equity (1% = 100). Defaults are decision D7: 10% per position, 2% loss per trade, 3% daily halt.
 */
export interface RiskLimits {
  maxPositionBps: number;
  maxLossPerTradeBps: number;
  dailyLossHaltBps: number;
}

export const DEFAULT_RISK_LIMITS: RiskLimits = {
  maxPositionBps: 1_000,
  maxLossPerTradeBps: 200,
  dailyLossHaltBps: 300,
};

/** `bps` of `equityPaise`, rounded down so a cap is never exceeded. */
export function bpsOf(equityPaise: number, bps: number): number {
  return mulDiv(equityPaise, bps, 10_000, 'down');
}

/** Most shares of a stock that keep its position value within the cap, given what is already held. */
export function quantityWithinPositionCap(
  equityPaise: number,
  heldValuePaise: number,
  pricePaise: number,
  limits: RiskLimits,
): number {
  const room = bpsOf(equityPaise, limits.maxPositionBps) - heldValuePaise;
  return room <= 0 ? 0 : Math.floor(room / pricePaise);
}

/**
 * Most shares such that a long position stopped out at `stopPaise` loses no more than the
 * per-trade budget. The loss is measured to the stop price; a gap through the stop can exceed it.
 */
export function quantityWithinTradeRisk(
  equityPaise: number,
  entryPaise: number,
  stopPaise: number,
  limits: RiskLimits,
): number {
  const perShare = entryPaise - stopPaise;
  if (perShare <= 0) return 0;
  return Math.floor(bpsOf(equityPaise, limits.maxLossPerTradeBps) / perShare);
}

/** True once today's loss reaches the halt level; new entries stop, exits stay allowed. */
export function dailyLossHalted(
  startOfDayEquityPaise: number,
  currentEquityPaise: number,
  limits: RiskLimits,
): boolean {
  return (
    currentEquityPaise <=
    startOfDayEquityPaise - bpsOf(startOfDayEquityPaise, limits.dailyLossHaltBps)
  );
}
