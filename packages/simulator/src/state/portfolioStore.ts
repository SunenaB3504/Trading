/**
 * packages/simulator/src/state/portfolioStore.ts
 * Reactive portfolio ledger and virtual trade execution state.
 * Enforces strict modularity (< 350 LOC, functions < 60 LOC).
 */

import { create } from 'zustand';
import type { PaperTradeOrder, PortfolioLedgerState } from '../core/data/types';
import { SQLiteClient } from '../core/data/sqliteClient';
import nifty500PricesData from '../core/data/fixtures/nifty500Prices.json';
import { recentOhlcCache } from '../core/data/fixtures/recentOhlcCache';

const nifty500Prices = nifty500PricesData as Record<string, number>;

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
  syncMarketPricesForDate: (activeDate: string) => Promise<void>;
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

    syncMarketPricesForDate: async (activeDate: string) => {
      const sqlite = SQLiteClient.getInstance();
      const currentLedger = await sqlite.getPortfolioLedger();
      const ohlcForDate = recentOhlcCache[activeDate];

      const priceMap: Record<string, number> = {};
      for (const [sym, pos] of Object.entries(currentLedger.positions)) {
        if (pos.shares > 0) {
          const session = ohlcForDate?.[sym];
          if (session && typeof session.close === 'number' && session.close > 0) {
            priceMap[sym] = session.close;
          } else if (typeof nifty500Prices[sym] === 'number' && nifty500Prices[sym] > 0) {
            priceMap[sym] = nifty500Prices[sym];
          }
        }
      }

      if (Object.keys(priceMap).length > 0) {
        sqlite.updateMarketPrices(priceMap);
        const updatedLedger = await sqlite.getPortfolioLedger();
        set({ ledger: updatedLedger });
      }
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
  };
});
