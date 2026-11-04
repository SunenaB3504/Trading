/**
 * packages/simulator/src/ui/layout/BottomStatusBar.tsx
 * Real-time ledger status bar with virtual capital, active P&L, and system telemetry.
 * Enforces strict modularity (< 250 LOC, functions < 60 LOC, complexity <= 10).
 */

import React, { useMemo } from 'react';
import { usePortfolioStore } from '../../state/portfolioStore';
import { useSimulationStore } from '../../state/simulationStore';
import nifty500PricesData from '../../core/data/fixtures/nifty500Prices.json';
import { recentOhlcCache } from '../../core/data/fixtures/recentOhlcCache';

const nifty500Prices = nifty500PricesData as Record<string, number>;

export const BottomStatusBar: React.FC = () => {
  const { ledger } = usePortfolioStore();
  const { activeDate } = useSimulationStore();

  const { invested, unrealized, totalEquity } = useMemo(() => {
    let inv = 0;
    let unrl = 0;
    const ohlc = recentOhlcCache[activeDate];

    for (const pos of Object.values(ledger.positions)) {
      if (pos.shares <= 0) continue;
      const live = ohlc?.[pos.symbol]?.close ?? nifty500Prices[pos.symbol] ?? pos.current_price;
      const cost = pos.shares * pos.average_cost;
      const mv = pos.shares * live;
      inv += cost;
      unrl += (mv - cost);
    }

    return {
      invested: inv,
      unrealized: unrl,
      totalEquity: ledger.cash_balance + inv + unrl,
    };
  }, [ledger.positions, ledger.cash_balance, activeDate]);

  const isProfit = unrealized >= 0;
  const pnlColor = isProfit ? '#34D399' : '#F87171';

  return (
    <footer
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 20px',
        backgroundColor: '#07090E',
        borderTop: '1px solid #1E2638',
        fontSize: '11px',
        color: '#94A3B8',
        fontFamily: 'monospace',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span>
          CASH:{' '}
          <strong style={{ color: '#F3F4F6' }}>
            ₹{ledger.cash_balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </strong>
        </span>
        <span>
          INVESTED:{' '}
          <strong style={{ color: '#F3F4F6' }}>
            ₹{invested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </strong>
        </span>
        <span>
          TOTAL EQUITY:{' '}
          <strong style={{ color: '#D4AF37' }}>
            ₹{totalEquity.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </strong>
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span>
          UNREALIZED P&L:{' '}
          <strong style={{ color: pnlColor }}>
            {isProfit ? '+' : ''}₹{unrealized.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </strong>
        </span>
        <span>
          REALIZED:{' '}
          <strong style={{ color: ledger.realized_pnl >= 0 ? '#34D399' : '#F87171' }}>
            {ledger.realized_pnl >= 0 ? '+' : ''}₹{ledger.realized_pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </strong>
        </span>
        <span style={{ color: '#64748B' }}>
          ENGINE: DUAL DuckDB + SQLite (0 MB GPU VRAM)
        </span>
      </div>
    </footer>
  );
};
