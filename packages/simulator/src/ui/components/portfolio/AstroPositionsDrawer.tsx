/**
 * packages/simulator/src/ui/components/portfolio/AstroPositionsDrawer.tsx
 * Docked slide-over drawer for active paper trading positions with live Astro risk monitoring.
 * Decomposed into small sub-components (< 60 LOC each, file < 300 LOC).
 */

import React, { useMemo } from 'react';
import { usePortfolioStore } from '../../../state/portfolioStore';
import { parseAstroProvenance } from '../../../core/engine/astroProvenanceSerializer';
import { calculateTransitPositions } from '../../../core/astro/ephemeris';
import { SIGN_NAMES } from '../../../core/astro/constants';
import type { PortfolioPosition, PaperTradeOrder } from '../../../core/data/types';
import corporateRegistryData from '../../../core/data/corporateRegistry.json';

const corporateRegistry = corporateRegistryData as Record<string, any>;

interface AstroRiskVerdict {
  label: string;
  color: string;
  bg: string;
  isAlert: boolean;
}

function evaluateAstroTransitRisk(symbol: string, activeDate: string): AstroRiskVerdict {
  const meta = corporateRegistry[symbol];
  if (!meta || !activeDate) {
    return { label: 'Neutral', color: '#94A3B8', bg: '#1E293B', isAlert: false };
  }

  const transits = calculateTransitPositions(activeDate);
  const transitMoonSign = transits.moon.signIndex;
  const janmaMoonSign = meta.moon_sign_id ?? 0;
  const bhavaFromJanma = ((transitMoonSign - janmaMoonSign + 12) % 12) + 1;

  if (bhavaFromJanma === 8) {
    return { label: '🔴 CHANDRASHTAMA (8H)', color: '#FCA5A5', bg: '#7F1D1D', isAlert: true };
  }
  if (bhavaFromJanma === 7) {
    return { label: '🟡 Approaching 8H (~2d)', color: '#FDE68A', bg: '#78350F', isAlert: false };
  }
  if (bhavaFromJanma === 6 || bhavaFromJanma === 12) {
    return { label: `⚠️ Dusthana (${bhavaFromJanma}H)`, color: '#FED7AA', bg: '#7C2D12', isAlert: false };
  }
  return { label: `🟢 Safe (${bhavaFromJanma}H - ${SIGN_NAMES[transitMoonSign]})`, color: '#6EE7B7', bg: '#064E3B', isAlert: false };
}

function PositionRow({
  pos,
  order,
  activeDate,
  onCloseTrade,
  onSelectStock,
}: {
  pos: PortfolioPosition;
  order: PaperTradeOrder | undefined;
  activeDate: string;
  onCloseTrade: (pos: PortfolioPosition) => void;
  onSelectStock?: ((sym: string) => void) | undefined;
}): React.ReactElement {
  const pnl = pos.unrealized_pnl;
  const isProfit = pnl >= 0;
  const prov = useMemo(() => parseAstroProvenance(order?.advisory_provenance || ''), [order]);
  const risk = useMemo(() => evaluateAstroTransitRisk(pos.symbol, activeDate), [pos.symbol, activeDate]);

  return (
    <div
      style={{
        padding: '12px',
        backgroundColor: '#0F172A',
        border: `1px solid ${risk.isAlert ? '#EF4444' : '#1E293B'}`,
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => onSelectStock?.(pos.symbol)}
            style={{
              background: 'none',
              border: 'none',
              color: '#38BDF8',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {pos.symbol}
          </button>
          <span style={{ fontSize: '11px', color: '#94A3B8' }}>{pos.shares} shs @ ₹{pos.average_cost.toFixed(1)}</span>
          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#312E81', color: '#A5B4FC', fontWeight: 600 }}>
            {prov.triadCode}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: isProfit ? '#34D399' : '#F87171' }}>
            {isProfit ? '+' : ''}₹{pnl.toFixed(0)} ({pos.unrealized_return_pct.toFixed(2)}%)
          </div>
          <div style={{ fontSize: '10px', color: '#64748B' }}>CMP: ₹{pos.current_price.toFixed(1)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#94A3B8' }}>Risk:</span>
          <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: risk.bg, color: risk.color, fontWeight: 700, fontSize: '10px' }}>
            {risk.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {prov.plannedCuspExit !== 'N/A' && (
            <span style={{ color: '#E2E8F0', fontSize: '10px' }}>
              Exit Target Date: <strong style={{ color: '#D4AF37' }}>{prov.plannedCuspExit}</strong>
            </span>
          )}
          <button
            onClick={() => onCloseTrade(pos)}
            style={{
              padding: '4px 10px',
              borderRadius: '5px',
              backgroundColor: '#DC2626',
              color: '#FFF',
              border: 'none',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Close Trade
          </button>
        </div>
      </div>
    </div>
  );
}

export interface AstroPositionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeDate: string;
  onSelectStock?: (sym: string) => void;
}

export const AstroPositionsDrawer: React.FC<AstroPositionsDrawerProps> = ({
  isOpen,
  onClose,
  activeDate,
  onSelectStock,
}) => {
  const { ledger, orders, executeOrder } = usePortfolioStore();

  const positionsList: PortfolioPosition[] = useMemo(
    () => Object.values(ledger.positions).filter((p) => p.shares > 0),
    [ledger.positions]
  );

  const latestBuyOrders = useMemo(() => {
    const map: Record<string, PaperTradeOrder> = {};
    for (const o of orders) {
      if (o.side === 'BUY') map[o.symbol] = o;
    }
    return map;
  }, [orders]);

  if (!isOpen) return null;

  const handleCloseTrade = (pos: PortfolioPosition) => {
    void executeOrder(
      pos.symbol,
      'SELL',
      pos.shares,
      pos.current_price,
      `Astro Logic Close on ${activeDate}`,
      activeDate
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '440px',
        height: '100vh',
        backgroundColor: '#07090E',
        borderLeft: '1px solid #1E293B',
        boxShadow: '-8px 0 24px rgba(0,0,0,0.7)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '16px', borderBottom: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '15px', color: '#D4AF37', fontWeight: 800 }}>
            Active Astro-Logic Positions
          </h2>
          <span style={{ fontSize: '11px', color: '#64748B' }}>
            {positionsList.length} Active Holdings | Date: {activeDate}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '18px', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: '12px 16px', backgroundColor: '#0B0F19', borderBottom: '1px solid #1E293B', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
        <div>Cash: <strong style={{ color: '#F8FAFC' }}>₹{ledger.cash_balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></div>
        <div>Invested: <strong style={{ color: '#F8FAFC' }}>₹{ledger.invested_equity.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></div>
        <div>Total Equity: <strong style={{ color: '#D4AF37' }}>₹{ledger.total_equity.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></div>
        <div>
          Unrealized: <strong style={{ color: ledger.unrealized_pnl >= 0 ? '#34D399' : '#F87171' }}>
            {ledger.unrealized_pnl >= 0 ? '+' : ''}₹{ledger.unrealized_pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </strong>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {positionsList.length === 0 ? (
          <div style={{ padding: '30px 20px', textAlign: 'center', color: '#64748B', fontSize: '12px', lineHeight: '1.6' }}>
            No active paper positions.<br />
            Click <strong>[Test Logic: Paper Buy]</strong> on the Master Trade Ticket to validate an astrological setup.
          </div>
        ) : (
          positionsList.map((pos) => (
            <PositionRow
              key={pos.symbol}
              pos={pos}
              order={latestBuyOrders[pos.symbol]}
              activeDate={activeDate}
              onCloseTrade={handleCloseTrade}
              onSelectStock={onSelectStock}
            />
          ))
        )}
      </div>
    </div>
  );
};
