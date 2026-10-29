/**
 * packages/simulator/src/ui/components/portfolio/AstroScorecardModal.tsx
 * Modal displaying empirical validation metrics, win rates, and alpha by astrological setup.
 * Decomposed into small sub-components (< 60 LOC each, file < 300 LOC).
 */

import React, { useMemo } from 'react';
import { usePortfolioStore } from '../../../state/portfolioStore';
import {
  generateAstroScorecard,
  type AstroValidationScorecard,
  type SetupCategoryStats,
  type ClosedAstroTrade,
} from '../../../core/engine/astroLogicValidator';

function KpiBox({ label, value, color }: { label: string; value: string; color?: string }): React.ReactElement {
  return (
    <div style={{ backgroundColor: '#0B0F19', padding: '12px', borderRadius: '6px', border: '1px solid #1E293B', textAlign: 'center' }}>
      <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 800, color: color || '#F8FAFC' }}>{value}</div>
    </div>
  );
}

function CategoryRow({ stat }: { stat: SetupCategoryStats }): React.ReactElement {
  const isProfitable = stat.totalRealizedPnl >= 0;
  const verdict = stat.winRatePct >= 75 ? '🟢 ROBUST EDGE (★)' : stat.winRatePct >= 50 ? '🟡 MODERATE' : '🔴 UNDER REVIEW';

  return (
    <tr style={{ borderBottom: '1px solid #1E293B', fontSize: '12px' }}>
      <td style={{ padding: '10px', fontWeight: 700, color: '#E2E8F0' }}>{stat.category}</td>
      <td style={{ padding: '10px', textAlign: 'center' }}>{stat.totalTrades}</td>
      <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700, color: stat.winRatePct >= 60 ? '#34D399' : '#F87171' }}>
        {stat.winRatePct.toFixed(1)}%
      </td>
      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: isProfitable ? '#34D399' : '#F87171' }}>
        {isProfitable ? '+' : ''}₹{stat.totalRealizedPnl.toLocaleString('en-IN')}
      </td>
      <td style={{ padding: '10px', textAlign: 'center' }}>{stat.avgReturnPct.toFixed(2)}%</td>
      <td style={{ padding: '10px', textAlign: 'center' }}>{stat.profitFactor.toFixed(2)}</td>
      <td style={{ padding: '10px', textAlign: 'center', fontSize: '11px', fontWeight: 700 }}>{verdict}</td>
    </tr>
  );
}

export interface AstroScorecardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AstroScorecardModal: React.FC<AstroScorecardModalProps> = ({ isOpen, onClose }) => {
  const { orders, resetAccount } = usePortfolioStore();
  const scorecard: AstroValidationScorecard = useMemo(() => generateAstroScorecard(orders), [orders]);

  if (!isOpen) return null;

  const isProfit = scorecard.totalRealizedPnl >= 0;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '840px',
          maxHeight: '90vh',
          backgroundColor: '#07090E',
          borderRadius: '12px',
          border: '1px solid #1E293B',
          boxShadow: '0 16px 40px rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', color: '#D4AF37', fontWeight: 800 }}>
              Empirical Astro-Logic Validation Scorecard
            </h2>
            <div style={{ fontSize: '11px', color: '#64748B' }}>
              Statistical validation of Planetary Timing, Vimshottari Triads & Risk Exit Rules
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '20px', cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
            <KpiBox label="Closed Trades" value={scorecard.totalTrades.toString()} />
            <KpiBox label="Win Rate" value={`${scorecard.overallWinRatePct.toFixed(1)}%`} color={scorecard.overallWinRatePct >= 50 ? '#34D399' : '#F87171'} />
            <KpiBox label="Realized P&L" value={`${isProfit ? '+' : ''}₹${scorecard.totalRealizedPnl.toLocaleString('en-IN')}`} color={isProfit ? '#34D399' : '#F87171'} />
            <KpiBox label="Avg Return" value={`${scorecard.avgReturnPct.toFixed(2)}%`} color={scorecard.avgReturnPct >= 0 ? '#34D399' : '#F87171'} />
            <KpiBox label="Profit Factor" value={scorecard.profitFactor.toFixed(2)} color="#D4AF37" />
          </div>

          <div>
            <h3 style={{ fontSize: '13px', color: '#F1F5F9', marginBottom: '10px', fontWeight: 700 }}>
              Performance Breakdown by Astrological Setup
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#0B0F19', borderRadius: '6px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E293B', color: '#94A3B8', fontSize: '11px', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Setup Category</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Trades</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Win Rate</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Realized P&L</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Avg Return</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Profit Factor</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Verdict</th>
                </tr>
              </thead>
              <tbody>
                {scorecard.categoryBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '12px' }}>
                      No closed round-trip trades recorded yet. Close active positions to generate scorecard metrics.
                    </td>
                  </tr>
                ) : (
                  scorecard.categoryBreakdown.map((s: SetupCategoryStats) => <CategoryRow key={s.category} stat={s} />)
                )}
              </tbody>
            </table>
          </div>

          {scorecard.closedTrades.length > 0 && (
            <div>
              <h3 style={{ fontSize: '13px', color: '#F1F5F9', marginBottom: '10px', fontWeight: 700 }}>
                Recent Closed Trades Audit Log
              </h3>
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #1E293B', borderRadius: '6px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#0B0F19', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1E293B', color: '#94A3B8' }}>
                      <th style={{ padding: '8px' }}>Symbol</th>
                      <th style={{ padding: '8px' }}>Period</th>
                      <th style={{ padding: '8px' }}>Setup</th>
                      <th style={{ padding: '8px' }}>Price Range</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Return / P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scorecard.closedTrades.map((t: ClosedAstroTrade) => (
                      <tr key={t.buyOrderId} style={{ borderBottom: '1px solid #1E293B' }}>
                        <td style={{ padding: '8px', fontWeight: 700, color: '#38BDF8' }}>{t.symbol}</td>
                        <td style={{ padding: '8px', color: '#94A3B8' }}>{t.buyDate} → {t.sellDate}</td>
                        <td style={{ padding: '8px' }}>{t.setupCategory}</td>
                        <td style={{ padding: '8px' }}>₹{t.buyPrice} → ₹{t.sellPrice}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: t.realizedPnl >= 0 ? '#34D399' : '#F87171' }}>
                          {t.returnPct.toFixed(2)}% (₹{t.realizedPnl})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => {
              if (confirm('Reset virtual paper trading ledger back to ₹10,00,000 initial capital?')) {
                resetAccount(1000000.0);
              }
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#1E293B',
              color: '#F87171',
              border: '1px solid #7F1D1D',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Reset Virtual Account
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              backgroundColor: '#D4AF37',
              color: '#07090E',
              border: 'none',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
