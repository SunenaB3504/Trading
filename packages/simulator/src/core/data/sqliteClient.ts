/**
 * packages/app/src/core/data/sqliteClient.ts
 * Transactional client for managing user paper-trade ledger, portfolios, and journal notes.
 * Enforces strict modularity (< 300 LOC).
 */

import type { PaperTradeOrder, PortfolioLedgerState } from './types';
import { calculateOrderCharges } from '../financial/taxEngine';

const STORAGE_KEY_ORDERS = 'astro_simulator_orders_v1';
const STORAGE_KEY_LEDGER = 'astro_simulator_ledger_v1';

export class SQLiteClient {
  private static instance: SQLiteClient | null = null;
  private orders: PaperTradeOrder[] = [];
  private ledgerState: PortfolioLedgerState = {
    cash_balance: 1000000.0, // Default 10 Lakh INR virtual capital
    invested_equity: 0.0,
    total_equity: 1000000.0,
    realized_pnl: 0.0,
    unrealized_pnl: 0.0,
    positions: {},
  };

  private constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const savedOrders = window.localStorage.getItem(STORAGE_KEY_ORDERS);
      if (savedOrders) this.orders = JSON.parse(savedOrders);
      const savedLedger = window.localStorage.getItem(STORAGE_KEY_LEDGER);
      if (savedLedger) this.ledgerState = JSON.parse(savedLedger);
    } catch {
      // Fallback to fresh memory
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(this.orders));
      window.localStorage.setItem(STORAGE_KEY_LEDGER, JSON.stringify(this.ledgerState));
    } catch {
      // Ignore quota errors
    }
  }

  public static getInstance(): SQLiteClient {
    if (!SQLiteClient.instance) {
      SQLiteClient.instance = new SQLiteClient();
    }
    return SQLiteClient.instance;
  }

  /**
   * Retrieves current portfolio ledger snapshot.
   */
  public async getPortfolioLedger(): Promise<PortfolioLedgerState> {
    return {
      ...this.ledgerState,
      positions: { ...this.ledgerState.positions },
    };
  }

  /**
   * Records and executes an atomic virtual paper-trade ticket.
   */
  public async executePaperOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    price: number,
    advisoryProvenance: string,
    timestamp: string
  ): Promise<PaperTradeOrder> {
    const rupeeValue = quantity * price;
    const order: PaperTradeOrder = {
      id: `ord_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp,
      symbol: symbol.toUpperCase(),
      side,
      quantity,
      price,
      rupee_value: rupeeValue,
      advisory_provenance: advisoryProvenance,
      status: 'FILLED',
    };

    this.orders.push(order);
    this.updateLedger(order);
    this.saveToStorage();
    return order;
  }

  private updateLedger(order: PaperTradeOrder): void {
    const sym = order.symbol;
    const pos = this.ledgerState.positions[sym] || {
      symbol: sym,
      shares: 0,
      average_cost: 0,
      current_price: order.price,
      market_value: 0,
      unrealized_pnl: 0,
      unrealized_return_pct: 0,
    };

    if (order.side === 'BUY') {
      const buyCharges = calculateOrderCharges('BUY', order.price, order.quantity);
      const totalCost = pos.shares * pos.average_cost + order.rupee_value;
      pos.shares += order.quantity;
      pos.average_cost = pos.shares > 0 ? totalCost / pos.shares : 0;
      this.ledgerState.cash_balance -= (order.rupee_value + buyCharges.totalCharges);
    } else {
      const sellCharges = calculateOrderCharges('SELL', order.price, order.quantity);
      const sellShares = Math.min(pos.shares, order.quantity);
      const proceeds = sellShares * order.price;
      const costBasis = sellShares * pos.average_cost;
      const pnl = proceeds - costBasis;

      pos.shares -= sellShares;
      this.ledgerState.cash_balance += (proceeds - sellCharges.totalCharges);
      this.ledgerState.realized_pnl += (pnl - sellCharges.totalCharges);
    }

    pos.current_price = order.price;
    pos.market_value = pos.shares * pos.current_price;
    const costBasis = pos.shares * pos.average_cost;
    pos.unrealized_pnl = pos.market_value - costBasis;
    pos.unrealized_return_pct =
      costBasis > 0 ? (pos.unrealized_pnl / costBasis) * 100 : 0;

    if (pos.shares <= 0) {
      delete this.ledgerState.positions[sym];
    } else {
      this.ledgerState.positions[sym] = pos;
    }

    this.recalculateTotalEquity();
  }

  /**
   * Recalculates market values for all open positions based on current session tick prices.
   */
  public updateMarketPrices(priceMap: Record<string, number>): void {
    let invested = 0;
    let unrealized = 0;

    for (const [sym, pos] of Object.entries(this.ledgerState.positions)) {
      if (pos.shares <= 0) {
        delete this.ledgerState.positions[sym];
        continue;
      }
      const currentPrice = priceMap[sym] ?? pos.current_price;
      pos.current_price = currentPrice;
      pos.market_value = pos.shares * currentPrice;
      const costBasis = pos.shares * pos.average_cost;
      pos.unrealized_pnl = pos.market_value - costBasis;
      pos.unrealized_return_pct =
        costBasis > 0 ? (pos.unrealized_pnl / costBasis) * 100 : 0;

      invested += pos.market_value;
      unrealized += pos.unrealized_pnl;
    }

    this.ledgerState.invested_equity = invested;
    this.ledgerState.unrealized_pnl = unrealized;
    this.ledgerState.total_equity = this.ledgerState.cash_balance + invested;
  }

  private recalculateTotalEquity(): void {
    let invested = 0;
    for (const pos of Object.values(this.ledgerState.positions)) {
      invested += pos.market_value;
    }
    this.ledgerState.invested_equity = invested;
    this.ledgerState.total_equity = this.ledgerState.cash_balance + invested;
  }

  /**
   * Get all past executed paper orders.
   */
  public async getOrderHistory(): Promise<PaperTradeOrder[]> {
    return [...this.orders];
  }

  /**
   * Reset virtual account back to initial capital.
   */
  public resetAccount(initialCapital = 1000000.0): void {
    this.orders = [];
    this.ledgerState = {
      cash_balance: initialCapital,
      invested_equity: 0.0,
      total_equity: initialCapital,
      realized_pnl: 0.0,
      unrealized_pnl: 0.0,
      positions: {},
    };
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY_ORDERS);
      window.localStorage.removeItem(STORAGE_KEY_LEDGER);
    }
  }
}
