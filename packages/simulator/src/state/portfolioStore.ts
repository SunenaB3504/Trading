/**
 * packages/app/src/state/portfolioStore.ts
 * Reactive portfolio ledger and virtual trade execution state.
 * Enforces strict modularity (< 350 LOC).
 */

import { create } from 'zustand';
import type { PaperTradeOrder, PortfolioLedgerState } from '../core/data/types';
import { SQLiteClient } from '../core/data/sqliteClient';

export interface PortfolioState {
  ledger: PortfolioLedgerState;
  orders: PaperTradeOrder[];

  // Actions
  refreshLedger: () => Promise<void>;
  executeOrder: (
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    price: number,
    advisoryProvenance: string,
    timestamp: string
  ) => Promise<PaperTradeOrder>;
  updatePrices: (priceMap: Record<string, number>) => Promise<void>;
  resetAccount: (initialCapital?: number) => void;
}

export const usePortfolioStore = create<PortfolioState>((set) => {
  const initialSnapshot = SQLiteClient.getInstance().getSnapshotSync();

  return {
    ledger: initialSnapshot.ledger,
    orders: initialSnapshot.orders,

    refreshLedger: async () => {
      const sqlite = SQLiteClient.getInstance();
      const ledger = await sqlite.getPortfolioLedger();
      const orders = await sqlite.getOrderHistory();
      set({ ledger, orders });
    },

  executeOrder: async (symbol, side, quantity, price, advisoryProvenance, timestamp) => {
    const sqlite = SQLiteClient.getInstance();
    const order = await sqlite.executePaperOrder(
      symbol,
      side,
      quantity,
      price,
      advisoryProvenance,
      timestamp
    );
    const ledger = await sqlite.getPortfolioLedger();
    const orders = await sqlite.getOrderHistory();
    set({ ledger, orders });
    return order;
  },

  updatePrices: async (priceMap: Record<string, number>) => {
    const sqlite = SQLiteClient.getInstance();
    sqlite.updateMarketPrices(priceMap);
    const ledger = await sqlite.getPortfolioLedger();
    set({ ledger });
  },

  resetAccount: (initialCapital = 1000000.0) => {
    const sqlite = SQLiteClient.getInstance();
    sqlite.resetAccount(initialCapital);
    set({
      ledger: {
        cash_balance: initialCapital,
        invested_equity: 0.0,
        total_equity: initialCapital,
        realized_pnl: 0.0,
        unrealized_pnl: 0.0,
        positions: {},
      },
      orders: [],
    });
  },
}; });
