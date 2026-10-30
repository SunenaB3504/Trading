/**
 * packages/simulator/src/core/engine/astroLogicValidator.ts
 * Empirical validation engine for Vedic astrological trade logics.
 * Matches buy/sell fills, categorizes setups, and computes statistical alpha.
 * Enforces strict modularity (< 250 LOC, functions < 60 LOC, complexity <= 10).
 */

import type { PaperTradeOrder } from '../data/types';
import { parseAstroProvenance, type ParsedAstroProvenance } from './astroProvenanceSerializer';
import { calculateTradeTaxAndNetPnl, FiscalYearTaxTracker } from '../financial/taxEngine';

export interface ClosedAstroTrade {
  symbol: string;
  buyOrderId: string;
  sellOrderId: string;
  buyDate: string;
  sellDate: string;
  shares: number;
  buyPrice: number;
  sellPrice: number;
  realizedPnl: number; // Gross P&L
  returnPct: number;   // Gross Return %
  provenance: ParsedAstroProvenance;
  setupCategory: string;
  hitTarget: boolean;
  hitStop: boolean;
  charges: number;     // Statutory friction: STT, Stamp Duty, DP, Exchange, SEBI, GST
  tax: number;         // STCG or LTCG
  netPnl: number;      // Net Post-Tax P&L
  netReturnPct: number;// Net Post-Tax Return %
}

export interface SetupCategoryStats {
  category: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  totalRealizedPnl: number; // Gross P&L
  totalNetPnl: number;      // Net Post-Tax P&L
  totalCharges: number;
  totalTax: number;
  avgReturnPct: number;
  netAvgReturnPct: number;
  profitFactor: number;
}

export interface AstroValidationScorecard {
  totalTrades: number;
  overallWinRatePct: number;
  totalRealizedPnl: number; // Gross P&L
  totalNetPnl: number;      // Net Post-Tax P&L
  totalCharges: number;
  totalTax: number;
  avgReturnPct: number;
  netAvgReturnPct: number;
  profitFactor: number;
  categoryBreakdown: SetupCategoryStats[];
  closedTrades: ClosedAstroTrade[];
}

function resolveSetupCategory(p: ParsedAstroProvenance): string {
  if (p.reason.toLowerCase().includes('vry') || p.signal.toLowerCase().includes('turnaround')) {
    return 'VRY / Turnaround';
  }
  if (p.triadCode === '[T-T-T]') return '[T-T-T] Pure Triad';
  if (p.triadCode.includes('T-T') || p.triadCode.includes('T-D-T')) return 'High-T Confluence';
  return 'Other Astro Setups';
}

export function reconstructClosedTrades(orders: PaperTradeOrder[]): ClosedAstroTrade[] {
  const buyQueue: Record<string, PaperTradeOrder[]> = {};
  const closed: ClosedAstroTrade[] = [];
  const taxTracker = new FiscalYearTaxTracker();

  for (const ord of orders) {
    const sym = ord.symbol;
    if (ord.side === 'BUY') {
      if (!buyQueue[sym]) buyQueue[sym] = [];
      buyQueue[sym].push(ord);
    } else if (ord.side === 'SELL' && buyQueue[sym]?.length) {
      const buyOrd = buyQueue[sym].shift()!;
      const shares = Math.min(buyOrd.quantity, ord.quantity);
      const prov = parseAstroProvenance(buyOrd.advisory_provenance);
      const taxResult = calculateTradeTaxAndNetPnl(
        buyOrd.price,
        ord.price,
        shares,
        buyOrd.timestamp,
        ord.timestamp,
        taxTracker
      );

      closed.push({
        symbol: sym,
        buyOrderId: buyOrd.id,
        sellOrderId: ord.id,
        buyDate: buyOrd.timestamp,
        sellDate: ord.timestamp,
        shares,
        buyPrice: buyOrd.price,
        sellPrice: ord.price,
        realizedPnl: taxResult.grossPnl,
        returnPct: taxResult.grossReturnPct,
        provenance: prov,
        setupCategory: resolveSetupCategory(prov),
        hitTarget: prov.targetPrice > 0 && ord.price >= prov.targetPrice,
        hitStop: prov.stopPrice > 0 && ord.price <= prov.stopPrice,
        charges: taxResult.totalCharges,
        tax: taxResult.capitalGainsTax,
        netPnl: taxResult.netPnl,
        netReturnPct: taxResult.netReturnPct,
      });
    }
  }

  return closed;
}

function computeCategoryStats(category: string, trades: ClosedAstroTrade[]): SetupCategoryStats {
  const total = trades.length;
  if (total === 0) {
    return {
      category,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRatePct: 0,
      totalRealizedPnl: 0,
      totalNetPnl: 0,
      totalCharges: 0,
      totalTax: 0,
      avgReturnPct: 0,
      netAvgReturnPct: 0,
      profitFactor: 0,
    };
  }

  let wins = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let sumGrossReturn = 0;
  let sumNetReturn = 0;
  let totalGrossPnl = 0;
  let totalNetPnl = 0;
  let totalCharges = 0;
  let totalTax = 0;

  for (const t of trades) {
    totalGrossPnl += t.realizedPnl;
    totalNetPnl += t.netPnl;
    totalCharges += t.charges;
    totalTax += t.tax;
    sumGrossReturn += t.returnPct;
    sumNetReturn += t.netReturnPct;

    if (t.netPnl > 0) {
      wins += 1;
      grossProfit += t.netPnl;
    } else if (t.netPnl < 0) {
      grossLoss += Math.abs(t.netPnl);
    }
  }

  const winRatePct = Math.round((wins / total) * 1000) / 10;
  const avgReturnPct = Math.round((sumGrossReturn / total) * 100) / 100;
  const netAvgReturnPct = Math.round((sumNetReturn / total) * 100) / 100;
  const profitFactor = grossLoss === 0
    ? grossProfit > 0 ? 99.9 : 1.0
    : Math.round((grossProfit / grossLoss) * 100) / 100;

  return {
    category,
    totalTrades: total,
    winningTrades: wins,
    losingTrades: total - wins,
    winRatePct,
    totalRealizedPnl: Math.round(totalGrossPnl * 100) / 100,
    totalNetPnl: Math.round(totalNetPnl * 100) / 100,
    totalCharges: Math.round(totalCharges * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    avgReturnPct,
    netAvgReturnPct,
    profitFactor,
  };
}

export function generateAstroScorecard(orders: PaperTradeOrder[]): AstroValidationScorecard {
  const closedTrades = reconstructClosedTrades(orders);
  const byCategory: Record<string, ClosedAstroTrade[]> = {};

  for (const t of closedTrades) {
    const list = byCategory[t.setupCategory] ?? [];
    list.push(t);
    byCategory[t.setupCategory] = list;
  }

  const categoryBreakdown = Object.entries(byCategory).map(([cat, list]) =>
    computeCategoryStats(cat, list)
  );

  const overall = computeCategoryStats('Overall', closedTrades);

  return {
    totalTrades: overall.totalTrades,
    overallWinRatePct: overall.winRatePct,
    totalRealizedPnl: overall.totalRealizedPnl,
    totalNetPnl: overall.totalNetPnl,
    totalCharges: overall.totalCharges,
    totalTax: overall.totalTax,
    avgReturnPct: overall.avgReturnPct,
    netAvgReturnPct: overall.netAvgReturnPct,
    profitFactor: overall.profitFactor,
    categoryBreakdown,
    closedTrades,
  };
}
