/**
 * packages/simulator/src/ui/components/portfolio/AstroScorecardModal.tsx
 * Modal displaying empirical validation metrics, win rates, taxes, and net take-home alpha.
 * Decomposed into small sub-components (< 60 LOC each, file < 300 LOC).
 */

import React, { useMemo } from 'react';
import { usePortfolioStore } from '../../../state/portfolioStore';
import {
  generateAstroScorecard,
  generateTradesCsv,
  type AstroValidationScorecard,
  type SetupCategoryStats,
  type ClosedAstroTrade,
} from '../../../core/engine/astroLogicValidator';

function KpiBox({ label, value, color }: { label: string; value: string; color?: string }): React.ReactElement {
  return (
    <div style={{ backgroundColor: '#0B0F19', padding: '12px', borderRadius: '6px', border: '1px solid #1E293B', textAlign: 'center' }}>
      <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '17px', fontWeight: 800, color: color || '#F8FAFC' }}>{value}</div>
    </div>
  );
}

function formatCurrency(amount: number, fractionDigits = 0): string {
  if (amount === 0) return '₹0';
  const isNeg = amount < 0;
  const abs = Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return isNeg ? `-₹${abs}` : `+₹${abs}`;
}

function CategoryRow({ stat }: { stat: SetupCategoryStats }): React.ReactElement {
  const isNetProfit = stat.totalNetPnl >= 0;
  const verdict = stat.winRatePct >= 75 ? '🟢 ROBUST EDGE (★)' : stat.winRatePct >= 50 ? '🟡 MODERATE' : '🔴 UNDER REVIEW';

  return (
    <tr style={{ borderBottom: '1px solid #1E293B', fontSize: '12px' }}>
      <td style={{ padding: '10px', fontWeight: 700, color: '#E2E8F0' }}>{stat.category}</td>
      <td style={{ padding: '10px', textAlign: 'center' }}>{stat.totalTrades}</td>
      <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700, color: stat.winRatePct >= 60 ? '#34D399' : '#F87171' }}>
        {stat.winRatePct.toFixed(1)}%
      </td>
      <td style={{ padding: '10px', textAlign: 'right', color: '#94A3B8' }}>
        {formatCurrency(stat.totalRealizedPnl)}
      </td>
      <td style={{ padding: '10px', textAlign: 'right', color: '#F59E0B' }}>
        -₹{(stat.totalCharges + stat.totalTax).toLocaleString('en-IN')}
      </td>
      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: isNetProfit ? '#34D399' : '#F87171' }}>
        {formatCurrency(stat.totalNetPnl)}
      </td>
      <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700, color: stat.netAvgReturnPct >= 0 ? '#34D399' : '#F87171' }}>
        {stat.netAvgReturnPct.toFixed(2)}%
      </td>
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

  const totalDeductions = scorecard.totalCharges + scorecard.totalTax;

  const handleExportCsv = () => {
    if (scorecard.closedTrades.length === 0) {
      alert('No closed trades to export yet. Close positions to record completed round trips.');
      return;
    }
    const csv = generateTradesCsv(scorecard.closedTrades);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'astro_trade_journal_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportBackup = () => {
    const backup = {
      orders: localStorage.getItem('astro_simulator_orders_v1'),
      ledger: localStorage.getItem('astro_simulator_ledger_v1'),
      stock: localStorage.getItem('astro_simulator_selected_stock'),
      date: localStorage.getItem('astro_simulator_current_date'),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `astro_portfolio_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const backup = JSON.parse(text);
        if (backup.orders) localStorage.setItem('astro_simulator_orders_v1', backup.orders);
        if (backup.ledger) localStorage.setItem('astro_simulator_ledger_v1', backup.ledger);
        if (backup.stock) localStorage.setItem('astro_simulator_selected_stock', backup.stock);
        if (backup.date) localStorage.setItem('astro_simulator_current_date', backup.date);
        window.location.reload();
      } catch {
        alert('Invalid backup file. Please select a valid astro terminal JSON backup.');
      }
    };
    reader.readAsText(file);
  };

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
          width: '940px',
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
              Empirical Astro-Logic Validation Scorecard (Post-Tax Audit)
            </h2>
            <div style={{ fontSize: '11px', color: '#64748B' }}>
              Statistical validation including Indian Equity Statutory Charges (STT, Stamp Duty, GST) & Capital Gains Tax
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '20px', cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
            <KpiBox label="Closed Trades" value={scorecard.totalTrades.toString()} />
            <KpiBox label="Win Rate" value={`${scorecard.overallWinRatePct.toFixed(1)}%`} color={scorecard.overallWinRatePct >= 50 ? '#34D399' : '#F87171'} />
            <KpiBox label="Gross P&L" value={formatCurrency(scorecard.totalRealizedPnl)} color="#94A3B8" />
            <KpiBox label="Taxes & Charges" value={`-₹${totalDeductions.toLocaleString('en-IN')}`} color="#F59E0B" />
            <KpiBox label="Net Take-Home P&L" value={formatCurrency(scorecard.totalNetPnl, 2)} color={scorecard.totalNetPnl >= 0 ? '#34D399' : '#F87171'} />
            <KpiBox label="Net Avg Return" value={`${scorecard.netAvgReturnPct.toFixed(2)}%`} color={scorecard.netAvgReturnPct >= 0 ? '#34D399' : '#F87171'} />
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
                  <th style={{ padding: '10px', textAlign: 'right' }}>Gross P&L</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Taxes/Fees</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Net P&L</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Net Return</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Verdict</th>
                </tr>
              </thead>
              <tbody>
                {scorecard.categoryBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '12px' }}>
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
                Recent Closed Trades Audit Log (Net of STT & Taxes)
              </h3>
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #1E293B', borderRadius: '6px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#0B0F19', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1E293B', color: '#94A3B8' }}>
                      <th style={{ padding: '8px' }}>Symbol</th>
                      <th style={{ padding: '8px' }}>Period</th>
                      <th style={{ padding: '8px' }}>Trader Status</th>
                      <th style={{ padding: '8px' }}>Entry Setup</th>
                      <th style={{ padding: '8px' }}>Exit Trigger</th>
                      <th style={{ padding: '8px' }}>Price Range</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Gross P&L</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Taxes & Fees</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Net Post-Tax P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scorecard.closedTrades.map((t: ClosedAstroTrade) => (
                      <tr key={t.buyOrderId} style={{ borderBottom: '1px solid #1E293B' }}>
                        <td style={{ padding: '8px', fontWeight: 700, color: '#38BDF8' }}>{t.symbol}</td>
                        <td style={{ padding: '8px', color: '#94A3B8' }}>
                          {t.buyDate} → {t.sellDate}
                          <span style={{ display: 'block', fontSize: '10px', color: '#64748B' }}>({t.holdingDays}d hold)</span>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 600,
                              backgroundColor: t.provenance.multipliers.omega > 0 ? '#064E3B' : '#7F1D1D',
                              color: t.provenance.multipliers.omega > 0 ? '#34D399' : '#FCA5A5',
                            }}
                          >
                            Ω {t.provenance.multipliers.omega.toFixed(1)}: {t.provenance.traderStatus || 'Safe'}
                          </span>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <span style={{ color: '#F1F5F9', fontWeight: 600 }}>{t.setupCategory}</span>
                          <span style={{ display: 'block', fontSize: '10px', color: '#94A3B8' }}>
                            {t.provenance.triadCode} • {t.provenance.ingressStatus || 'STANDARD'}
                          </span>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 600,
                              backgroundColor: t.exitReason === 'TARGET_HIT' ? '#064E3B' : t.exitReason === 'STOP_LOSS' ? '#7F1D1D' : '#1E293B',
                              color: t.exitReason === 'TARGET_HIT' ? '#34D399' : t.exitReason === 'STOP_LOSS' ? '#FCA5A5' : '#94A3B8',
                            }}
                          >
                            {t.exitReason}
                          </span>
                          {t.exitDasha && t.exitDasha !== 'N/A' && (
                            <span style={{ display: 'block', fontSize: '10px', color: '#64748B' }}>
                              Dasha: {t.exitDasha}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px' }}>₹{t.buyPrice.toFixed(2)} → ₹{t.sellPrice.toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#94A3B8' }}>
                          {formatCurrency(t.realizedPnl)} ({t.returnPct >= 0 ? `+${t.returnPct.toFixed(2)}` : t.returnPct.toFixed(2)}%)
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#F59E0B' }}>
                          -₹{(t.charges + t.tax).toFixed(0)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: t.netPnl >= 0 ? '#34D399' : '#F87171' }}>
                          {formatCurrency(t.netPnl)} ({t.netReturnPct >= 0 ? `+${t.netReturnPct.toFixed(2)}` : t.netReturnPct.toFixed(2)}%)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
              onClick={handleExportCsv}
              title="Download closed trades journal as CSV"
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: '#1E293B',
                color: '#A78BFA',
                border: '1px solid #7C3AED',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📄 Export CSV
            </button>
            <button
              onClick={handleExportBackup}
              title="Download your full trading history, positions, and scorecard as a backup file"
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: '#1E293B',
                color: '#38BDF8',
                border: '1px solid #0284C7',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              💾 Export Backup
            </button>
            <label
              title="Restore a previously exported portfolio backup JSON file"
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: '#1E293B',
                color: '#34D399',
                border: '1px solid #059669',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-block',
              }}
            >
              📂 Import Backup
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                style={{ display: 'none' }}
              />
            </label>
          </div>
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
