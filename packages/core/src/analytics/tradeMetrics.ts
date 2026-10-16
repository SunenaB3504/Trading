import { tradingDaysBetween } from '../calendar';
import type { Trade } from '../domain/ledger';
import { mean, sum } from './stats';

/** Net return of a closed trade: net P&L over everything paid in (cost basis plus entry costs). */
export function netReturn(t: Trade): number | null {
  if (t.netPnlPaise === null || t.closedOn === null) return null;
  const invested = t.basisPaise + t.entryCostsPaise;
  return invested > 0 ? t.netPnlPaise / invested : null;
}

export interface TradeSummary {
  count: number;
  wins: number;
  losses: number;
  winRate: number | null;
  /** Mean net return over wins; mean absolute net return over losses. */
  avgWin: number | null;
  avgLoss: number | null;
  /** avgWin / avgLoss; null when there are no losses. */
  payoffRatio: number | null;
  /** winRate x avgWin - (1 - winRate) x avgLoss, which equals the mean net return. */
  expectancy: number | null;
  /** Sum of winning net P&L over the absolute sum of losing net P&L; null with no losses. */
  profitFactor: number | null;
  totalGrossPnlPaise: number;
  totalNetPnlPaise: number;
  totalCostsPaise: number;
  /** Total costs over total gross P&L; null when gross P&L is zero. */
  costDrag: number | null;
}

function closed(trades: readonly Trade[]): Trade[] {
  return trades.filter(
    (t) => t.closedOn !== null && t.netPnlPaise !== null && t.grossPnlPaise !== null,
  );
}

const ratio = (a: number, b: number): number | null => (b === 0 ? null : a / b);

/** SSD §11.1 metrics over closed trades, on net returns after costs. */
export function summarizeTrades(trades: readonly Trade[]): TradeSummary {
  const done = closed(trades);
  const rets = done.map((t) => netReturn(t) ?? 0);
  const winRets = rets.filter((r) => r > 0);
  const lossRets = rets.filter((r) => r <= 0).map((r) => -r);
  const nets = done.map((t) => t.netPnlPaise ?? 0);
  const gross = sum(done.map((t) => t.grossPnlPaise ?? 0));
  const costs = sum(done.map((t) => t.entryCostsPaise + t.exitCostsPaise));
  const winRate = done.length === 0 ? null : winRets.length / done.length;
  const avgWin = winRets.length === 0 ? null : mean(winRets);
  const avgLoss = lossRets.length === 0 ? null : mean(lossRets);
  const lossPnl = Math.abs(sum(nets.filter((n) => n <= 0)));
  return {
    count: done.length,
    wins: winRets.length,
    losses: lossRets.length,
    winRate,
    avgWin,
    avgLoss,
    payoffRatio: avgWin !== null && avgLoss !== null ? ratio(avgWin, avgLoss) : null,
    expectancy: done.length === 0 ? null : mean(rets),
    profitFactor: ratio(sum(nets.filter((n) => n > 0)), lossPnl),
    totalGrossPnlPaise: gross,
    totalNetPnlPaise: sum(nets),
    totalCostsPaise: costs,
    costDrag: ratio(costs, gross),
  };
}

/** Peak-to-trough fall of an equity curve as a fraction of the peak (0.25 = 25%). */
export function maxDrawdown(equity: readonly number[]): number {
  let peak = Number.NEGATIVE_INFINITY;
  let worst = 0;
  for (const value of equity) {
    peak = Math.max(peak, value);
    if (peak > 0) worst = Math.max(worst, (peak - value) / peak);
  }
  return worst;
}

/** Sessions the position was held: trading days after the open date up to and including the close. */
export function holdingSessions(t: Trade): number | null {
  if (t.closedOn === null) return null;
  return Math.max(0, tradingDaysBetween(t.openedOn, t.closedOn).length - 1);
}
