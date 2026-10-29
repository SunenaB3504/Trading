/**
 * packages/simulator/src/core/engine/astroLogicValidator.ts
 * Empirical validation engine for Vedic astrological trade logics.
 * Matches buy/sell fills, categorizes setups, and computes statistical alpha.
 * Enforces strict modularity (< 250 LOC, functions < 60 LOC, complexity <= 10).
 */

import type { PaperTradeOrder } from '../data/types';
import { parseAstroProvenance, type ParsedAstroProvenance } from './astroProvenanceSerializer';

export interface ClosedAstroTrade {
  symbol: string;
  buyOrderId: string;
  sellOrderId: string;
  buyDate: string;
  sellDate: string;
  shares: number;
  buyPrice: number;
  sellPrice: number;
  realizedPnl: number;
  returnPct: number;
  provenance: ParsedAstroProvenance;
  setupCategory: string;
  hitTarget: boolean;
  hitStop: boolean;
}

export interface SetupCategoryStats {
  category: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  totalRealizedPnl: number;
  avgReturnPct: number;
  profitFactor: number;
}

export interface AstroValidationScorecard {
  totalTrades: number;
  overallWinRatePct: number;
  totalRealizedPnl: number;
  avgReturnPct: number;
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

  for (const ord of orders) {
    const sym = ord.symbol;
    if (ord.side === 'BUY') {
      if (!buyQueue[sym]) buyQueue[sym] = [];
      buyQueue[sym].push(ord);
    } else if (ord.side === 'SELL' && buyQueue[sym]?.length) {
      const buyOrd = buyQueue[sym].shift()!;
      const shares = Math.min(buyOrd.quantity, ord.quantity);
      const buyCost = shares * buyOrd.price;
      const sellProceeds = shares * ord.price;
      const pnl = sellProceeds - buyCost;
      const returnPct = buyCost > 0 ? (pnl / buyCost) * 100 : 0;
      const prov = parseAstroProvenance(buyOrd.advisory_provenance);

      closed.push({
        symbol: sym,
        buyOrderId: buyOrd.id,
        sellOrderId: ord.id,
        buyDate: buyOrd.timestamp,
        sellDate: ord.timestamp,
        shares,
        buyPrice: buyOrd.price,
        sellPrice: ord.price,
        realizedPnl: Math.round(pnl * 100) / 100,
        returnPct: Math.round(returnPct * 100) / 100,
        provenance: prov,
        setupCategory: resolveSetupCategory(prov),
        hitTarget: prov.targetPrice > 0 && ord.price >= prov.targetPrice,
        hitStop: prov.stopPrice > 0 && ord.price <= prov.stopPrice,
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
      avgReturnPct: 0,
      profitFactor: 0,
    };
  }

  let wins = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let sumReturn = 0;
  let totalPnl = 0;

  for (const t of trades) {
    totalPnl += t.realizedPnl;
    sumReturn += t.returnPct;
    if (t.realizedPnl > 0) {
      wins += 1;
      grossProfit += t.realizedPnl;
    } else if (t.realizedPnl < 0) {
      grossLoss += Math.abs(t.realizedPnl);
    }
  }

  const winRatePct = Math.round((wins / total) * 1000) / 10;
  const avgReturnPct = Math.round((sumReturn / total) * 100) / 100;
  const profitFactor = grossLoss === 0
    ? grossProfit > 0 ? 99.9 : 1.0
    : Math.round((grossProfit / grossLoss) * 100) / 100;

  return {
    category,
    totalTrades: total,
    winningTrades: wins,
    losingTrades: total - wins,
    winRatePct,
    totalRealizedPnl: Math.round(totalPnl * 100) / 100,
    avgReturnPct,
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
    avgReturnPct: overall.avgReturnPct,
    profitFactor: overall.profitFactor,
    categoryBreakdown,
    closedTrades,
  };
}
