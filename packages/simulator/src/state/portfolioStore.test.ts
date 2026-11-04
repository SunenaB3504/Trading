import { describe, it, expect, beforeEach } from 'vitest';
import { usePortfolioStore } from './portfolioStore';

describe('portfolioStore & SQLiteClient Persistence', () => {
  beforeEach(() => {
    usePortfolioStore.getState().resetAccount(1000000.0);
  });

  it('initializes with default capital of 10 Lakh INR and empty positions', () => {
    const { ledger, orders } = usePortfolioStore.getState();
    expect(ledger.cash_balance).toBe(1000000.0);
    expect(ledger.total_equity).toBe(1000000.0);
    expect(orders).toHaveLength(0);
    expect(Object.keys(ledger.positions)).toHaveLength(0);
  });

  it('executes BUY order and reflects in reactive ledger and order history', async () => {
    const store = usePortfolioStore.getState();
    await store.executeOrder(
      'HDFCBANK',
      'BUY',
      10,
      692.8,
      'TRIAD:[T-T-T]|DASHA:N/A|SIG:BUY|REASON:Test|TGT:800|STP:650|CUSP:N/A|MULT:Ω1.00,Φ1.00,Θ1.00|MODE:ALGORITHMIC',
      '2026-10-30'
    );

    const updated = usePortfolioStore.getState();
    expect(updated.orders).toHaveLength(1);
    expect(updated.orders[0]?.symbol).toBe('HDFCBANK');
    expect(updated.orders[0]?.quantity).toBe(10);
    expect(updated.ledger.positions['HDFCBANK']?.shares).toBe(10);
    expect(updated.ledger.cash_balance).toBeLessThan(1000000.0);
  });

  it('refreshes ledger atomically', async () => {
    const store = usePortfolioStore.getState();
    await store.executeOrder(
      'RELIANCE',
      'BUY',
      5,
      1300.0,
      'TRIAD:[T-T-T]|DASHA:N/A|SIG:BUY|REASON:Test|TGT:1500|STP:1200|CUSP:N/A|MULT:Ω1.00,Φ1.00,Θ1.00|MODE:ANTICIPATORY_INGRESS',
      '2026-10-30'
    );

    await store.refreshLedger();
    const refreshed = usePortfolioStore.getState();
    expect(refreshed.orders.some((o) => o.symbol === 'RELIANCE')).toBe(true);
    expect(refreshed.ledger.positions['RELIANCE']?.shares).toBe(5);
  });
});
