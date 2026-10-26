/**
 * packages/app/src/core/data/sqliteClient.ts
 * Transactional client for managing user paper-trade ledger, portfolios, and journal notes.
 * Enforces strict modularity (< 300 LOC).
 */

import type { PaperTradeOrder, PortfolioLedgerState } from './types';

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
    // Singleton
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
    return { ...this.ledgerState };
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
      const totalCost = pos.shares * pos.average_cost + order.rupee_value;
      pos.shares += order.quantity;
      pos.average_cost = pos.shares > 0 ? totalCost / pos.shares : 0;
      this.ledgerState.cash_balance -= order.rupee_value;
    } else {
      const sellShares = Math.min(pos.shares, order.quantity);
      const proceeds = sellShares * order.price;
      const costBasis = sellShares * pos.average_cost;
      const pnl = proceeds - costBasis;

      pos.shares -= sellShares;
      this.ledgerState.cash_balance += proceeds;
      this.ledgerState.realized_pnl += pnl;
    }

    pos.current_price = order.price;
    pos.market_value = pos.shares * pos.current_price;
    pos.unrealized_pnl = pos.market_value - pos.shares * pos.average_cost;
    pos.unrealized_return_pct =
      pos.average_cost > 0 ? (pos.unrealized_pnl / (pos.shares * pos.average_cost)) * 100 : 0;

    if (pos.shares === 0) {
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
      const currentPrice = priceMap[sym] ?? pos.current_price;
      pos.current_price = currentPrice;
      pos.market_value = pos.shares * currentPrice;
      pos.unrealized_pnl = pos.market_value - pos.shares * pos.average_cost;
      pos.unrealized_return_pct =
        pos.average_cost > 0 ? (pos.unrealized_pnl / (pos.shares * pos.average_cost)) * 100 : 0;

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
  }
}
