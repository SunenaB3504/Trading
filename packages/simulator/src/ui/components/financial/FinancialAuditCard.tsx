/**
 * packages/simulator/src/ui/components/financial/FinancialAuditCard.tsx
 * 12-Bhava Point-in-Time Fundamental Balance Sheet Reality-Check Card.
 * Displays Debt-to-Equity, ROCE, FCF, Pledging, and Hard Risk Circuit Breakers.
 * Enforces strict modularity (< 350 LOC, functions < 60 LOC, complexity <= 10).
 */

import React from 'react';
import type { FinancialAuditResult } from '../../../core/financial/balanceSheetAudit';

export interface FinancialAuditCardProps {
  auditResult: FinancialAuditResult | null;
}

function MetricPill({
  label,
  value,
  isBad,
}: {
  label: string;
  value: string;
  isBad?: boolean;
}): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        padding: '6px 10px',
        borderRadius: '6px',
        backgroundColor: '#111827',
        border: `1px solid ${isBad ? '#DC2626' : '#1F2937'}`,
      }}
    >
      <span style={{ fontSize: '10px', color: '#9CA3AF' }}>{label}</span>
      <span style={{ fontSize: '12px', fontWeight: 700, color: isBad ? '#F87171' : '#34D399', fontFamily: 'monospace' }}>
        {value}
      </span>
    </div>
  );
}

export const FinancialAuditCard: React.FC<FinancialAuditCardProps> = ({ auditResult }) => {
  if (!auditResult || !auditResult.filingUsed) {
    return (
      <div style={{ padding: '16px', background: '#0B0E14', borderRadius: '8px', border: '1px solid #1E2638', color: '#64748B' }}>
        No Point-in-Time fundamental statement filed prior to this simulation session.
      </div>
    );
  }

  const f = auditResult.filingUsed;
  const isTripped = auditResult.isCircuitBreakerTripped;
  const phiPct = Math.round(auditResult.phiFinancial * 100);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        background: '#0B0E14',
        border: `1px solid ${isTripped ? '#DC2626' : '#1E2638'}`,
        borderRadius: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#D4AF37', fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em' }}>
          12-BHAVA BALANCE SHEET REALITY-CHECK (PIT)
        </span>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: isTripped ? '#7F1D1D' : '#064E3B',
            color: isTripped ? '#FCA5A5' : '#6EE7B7',
          }}
        >
          {isTripped ? 'CIRCUIT BREAKER VETO' : `HEALTHY (${phiPct}%)`}
        </span>
      </div>

      <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
        Statement: <strong style={{ color: '#F3F4F6' }}>{f.fiscal_quarter}</strong> (Filed: {f.filing_timestamp.slice(0, 10)})
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        <MetricPill label="Debt-to-Equity (6H)" value={f.debt_to_equity.toFixed(2)} isBad={f.debt_to_equity > 1.5} />
        <MetricPill label="ROCE (5H)" value={`${(f.roce * 100).toFixed(1)}%`} isBad={f.roce < 0.1} />
        <MetricPill label="Free Cash Flow (9H)" value={`₹${(f.fcf / 1e7).toFixed(1)} Cr`} isBad={f.fcf <= 0} />
        <MetricPill label="Promoter Pledge (12H)" value={`${f.pledging_pct.toFixed(1)}%`} isBad={f.pledging_pct > 10} />
      </div>

      {isTripped && (
        <div style={{ padding: '8px', borderRadius: '4px', backgroundColor: '#450A0A', color: '#FECACA', fontSize: '11px', fontWeight: 600 }}>
          ⚠️ Risk Veto: {auditResult.circuitBreakerReason} — Position sizing set to ₹0.00.
        </div>
      )}
    </div>
  );
};
