/**
 * packages/simulator/src/ui/components/portfolio/AstroPositionsDrawer.tsx
 * Docked slide-over drawer for active paper trading positions with live Astro risk monitoring.
 * Decomposed into small sub-components (< 60 LOC each, file < 380 LOC).
 */

import React, { useMemo, useState, useEffect } from 'react';
import { usePortfolioStore } from '../../../state/portfolioStore';
import {
  parseAstroProvenance,
  serializeExitProvenance,
  type ParsedAstroProvenance,
} from '../../../core/engine/astroProvenanceSerializer';
import { calculateTransitPositions } from '../../../core/astro/ephemeris';
import { SIGN_NAMES } from '../../../core/astro/constants';
import type { PortfolioPosition, PaperTradeOrder } from '../../../core/data/types';
import corporateRegistryData from '../../../core/data/corporateRegistry.json';

const corporateRegistry = corporateRegistryData as Record<string, any>;

export type PositionFilterTab = 'ALL' | 'SELL_TODAY' | 'TARGET_HIT' | 'SAFE';

interface AstroRiskVerdict {
  label: string;
  color: string;
  bg: string;
  isAlert: boolean;
}

interface PositionExitVerdict {
  isSellToday: boolean;
  isStopHit: boolean;
  isTargetHit: boolean;
  isCuspDue: boolean;
  isChandrashtama: boolean;
  urgencyReason: string | null;
  urgencyColor: string;
}

function evaluateAstroTransitRisk(symbol: string, activeDate: string): AstroRiskVerdict {
  const meta = corporateRegistry[symbol];
  if (!meta || !activeDate) {
    return { label: 'Neutral', color: '#94A3B8', bg: '#1E293B', isAlert: false };
  }

  const transits = calculateTransitPositions(activeDate);
  const transitMoonSign = transits.moon.signIndex;
  const janmaMoon0Based = (meta.moon_sign_id ?? 1) - 1;
  const bhavaFromJanma = ((transitMoonSign - janmaMoon0Based + 12) % 12) + 1;

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

function evaluatePositionExitVerdict(
  pos: PortfolioPosition,
  prov: ParsedAstroProvenance,
  risk: AstroRiskVerdict,
  activeDate: string
): PositionExitVerdict {
  const isStopHit = prov.stopPrice > 0 && pos.current_price <= prov.stopPrice;
  const isTargetHit = prov.targetPrice > 0 && pos.current_price >= prov.targetPrice;
  const isCuspDue = prov.plannedCuspExit !== 'N/A' && activeDate >= prov.plannedCuspExit;
  const isChandrashtama = risk.isAlert;

  const isSellToday = isStopHit || isTargetHit || isCuspDue || isChandrashtama;

  let urgencyReason: string | null = null;
  let urgencyColor = '#94A3B8';

  if (isStopHit) {
    urgencyReason = `🛑 STOP HIT (CMP ₹${pos.current_price.toFixed(1)} ≤ ₹${prov.stopPrice.toFixed(1)})`;
    urgencyColor = '#EF4444';
  } else if (isTargetHit) {
    urgencyReason = `🎯 TARGET ACHIEVED (CMP ₹${pos.current_price.toFixed(1)} ≥ ₹${prov.targetPrice.toFixed(1)})`;
    urgencyColor = '#10B981';
  } else if (isCuspDue) {
    urgencyReason = `⏳ CUSP EXIT REACHED (${prov.plannedCuspExit})`;
    urgencyColor = '#F59E0B';
  } else if (isChandrashtama) {
    urgencyReason = `🔴 CHANDRASHTAMA (8H Lunar Transit)`;
    urgencyColor = '#F87171';
  }

  return {
    isSellToday,
    isStopHit,
    isTargetHit,
    isCuspDue,
    isChandrashtama,
    urgencyReason,
    urgencyColor,
  };
}

function FilterTabBtn({
  label,
  active,
  color,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  color: string;
  count: number;
  onClick: () => void;
}): React.ReactElement {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 10px',
        borderRadius: '6px',
        backgroundColor: active ? '#1E293B' : 'transparent',
        border: active ? `1px solid ${color}` : '1px solid #334155',
        color: active ? '#FFFFFF' : '#94A3B8',
        fontSize: '11px',
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        whiteSpace: 'nowrap',
      }}
    >
      <span>{label}</span>
      <span
        style={{
          padding: '1px 5px',
          borderRadius: '10px',
          backgroundColor: active ? color : '#334155',
          color: active ? '#0F172A' : '#CBD5E1',
          fontSize: '10px',
          fontWeight: 800,
        }}
      >
        {count}
      </span>
    </button>
  );
}

function PositionRow({
  pos,
  prov,
  risk,
  verdict,
  onCloseTrade,
  onSelectStock,
}: {
  pos: PortfolioPosition;
  prov: ParsedAstroProvenance;
  risk: AstroRiskVerdict;
  verdict: PositionExitVerdict;
  onCloseTrade: (pos: PortfolioPosition) => void;
  onSelectStock?: ((sym: string) => void) | undefined;
}): React.ReactElement {
  const pnl = pos.unrealized_pnl;
  const isProfit = pnl >= 0;

  return (
    <div
      style={{
        padding: '12px',
        backgroundColor: '#0F172A',
        border: `1px solid ${verdict.isSellToday ? verdict.urgencyColor : '#1E293B'}`,
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {verdict.urgencyReason && (
        <div
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: verdict.isStopHit || verdict.isChandrashtama ? '#450A0A' : '#064E3B',
            border: `1px solid ${verdict.urgencyColor}`,
            color: verdict.urgencyColor,
            fontSize: '10px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{verdict.urgencyReason}</span>
          <span style={{ fontSize: '9px', opacity: 0.9 }}>CRITICAL EXIT</span>
        </div>
      )}

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
              backgroundColor: verdict.isSellToday ? '#DC2626' : '#7F1D1D',
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
  const { ledger, orders, executeOrder, syncMarketPricesForDate } = usePortfolioStore();
  const [filterTab, setFilterTab] = useState<PositionFilterTab>('ALL');

  useEffect(() => {
    if (activeDate && isOpen) {
      void syncMarketPricesForDate(activeDate);
    }
  }, [activeDate, isOpen, syncMarketPricesForDate]);

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

  const positionsWithVerdicts = useMemo(() => {
    return positionsList.map((pos) => {
      const order = latestBuyOrders[pos.symbol];
      const prov = parseAstroProvenance(order?.advisory_provenance || '');
      const risk = evaluateAstroTransitRisk(pos.symbol, activeDate);
      const verdict = evaluatePositionExitVerdict(pos, prov, risk, activeDate);
      return { pos, order, prov, risk, verdict };
    });
  }, [positionsList, latestBuyOrders, activeDate]);

  const sellTodayCount = useMemo(
    () => positionsWithVerdicts.filter((i) => i.verdict.isSellToday).length,
    [positionsWithVerdicts]
  );
  const targetHitCount = useMemo(
    () => positionsWithVerdicts.filter((i) => i.verdict.isTargetHit).length,
    [positionsWithVerdicts]
  );
  const safeCount = useMemo(
    () => positionsWithVerdicts.filter((i) => !i.verdict.isSellToday).length,
    [positionsWithVerdicts]
  );

  const filteredItems = useMemo(() => {
    let list = positionsWithVerdicts;
    if (filterTab === 'SELL_TODAY') {
      list = list.filter((i) => i.verdict.isSellToday);
    } else if (filterTab === 'TARGET_HIT') {
      list = list.filter((i) => i.verdict.isTargetHit);
    } else if (filterTab === 'SAFE') {
      list = list.filter((i) => !i.verdict.isSellToday);
    }
    // Auto-sort: critical exits float to the top
    return list.slice().sort((a, b) => {
      if (a.verdict.isSellToday && !b.verdict.isSellToday) return -1;
      if (!a.verdict.isSellToday && b.verdict.isSellToday) return 1;
      return 0;
    });
  }, [positionsWithVerdicts, filterTab]);

  if (!isOpen) return null;

  const handleCloseTrade = (pos: PortfolioPosition) => {
    const buyOrd = latestBuyOrders[pos.symbol];
    let exitReason: 'CUSP_DIRECTIVE' | 'TARGET_HIT' | 'STOP_HIT' | 'MANUAL_EXIT' = 'MANUAL_EXIT';
    if (buyOrd) {
      const parsed = parseAstroProvenance(buyOrd.advisory_provenance);
      if (parsed.targetPrice > 0 && pos.current_price >= parsed.targetPrice) {
        exitReason = 'TARGET_HIT';
      } else if (parsed.stopPrice > 0 && pos.current_price <= parsed.stopPrice) {
        exitReason = 'STOP_HIT';
      } else if (parsed.plannedCuspExit !== 'N/A' && activeDate >= parsed.plannedCuspExit) {
        exitReason = 'CUSP_DIRECTIVE';
      }
    }

    const provenance = serializeExitProvenance({
      exitReason,
      exitDate: activeDate,
      exitPrice: pos.current_price,
    });

    void executeOrder(
      pos.symbol,
      'SELL',
      pos.shares,
      pos.current_price,
      provenance,
      activeDate
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '460px',
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

      <div style={{ padding: '10px 16px', backgroundColor: '#0B0F19', borderBottom: '1px solid #1E293B', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
        <div>Cash: <strong style={{ color: '#F8FAFC' }}>₹{ledger.cash_balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></div>
        <div>Invested: <strong style={{ color: '#F8FAFC' }}>₹{ledger.invested_equity.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></div>
        <div>Total Equity: <strong style={{ color: '#D4AF37' }}>₹{ledger.total_equity.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></div>
        <div>
          Unrealized: <strong style={{ color: ledger.unrealized_pnl >= 0 ? '#34D399' : '#F87171' }}>
            {ledger.unrealized_pnl >= 0 ? '+' : ''}₹{ledger.unrealized_pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </strong>
        </div>
      </div>

      {/* Triage / Filter Tabs */}
      <div style={{ padding: '8px 14px', backgroundColor: '#07090E', borderBottom: '1px solid #1E293B', display: 'flex', gap: '6px', overflowX: 'auto' }}>
        <FilterTabBtn label="All" count={positionsList.length} color="#38BDF8" active={filterTab === 'ALL'} onClick={() => setFilterTab('ALL')} />
        <FilterTabBtn label="🛑 Sell Today" count={sellTodayCount} color="#EF4444" active={filterTab === 'SELL_TODAY'} onClick={() => setFilterTab('SELL_TODAY')} />
        <FilterTabBtn label="🎯 Target Hit" count={targetHitCount} color="#10B981" active={filterTab === 'TARGET_HIT'} onClick={() => setFilterTab('TARGET_HIT')} />
        <FilterTabBtn label="🟢 Safe" count={safeCount} color="#34D399" active={filterTab === 'SAFE'} onClick={() => setFilterTab('SAFE')} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {positionsList.length === 0 ? (
          <div style={{ padding: '30px 20px', textAlign: 'center', color: '#64748B', fontSize: '12px', lineHeight: '1.6' }}>
            No active paper positions.<br />
            Click <strong>[Paper Buy]</strong> on the Master Trade Ticket to validate an astrological setup.
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: '30px 20px', textAlign: 'center', color: '#6EE7B7', backgroundColor: '#064E3B22', border: '1px dashed #059669', borderRadius: '8px', fontSize: '12px', lineHeight: '1.6' }}>
            {filterTab === 'SELL_TODAY'
              ? '🎉 All holdings are healthy! No positions have triggered stop-loss, target hit, or adverse transits for today.'
              : filterTab === 'TARGET_HIT'
              ? 'No holdings have reached profit targets yet. Trailing positions normally.'
              : 'No positions found for selected filter.'}
          </div>
        ) : (
          filteredItems.map(({ pos, prov, risk, verdict }) => (
            <PositionRow
              key={pos.symbol}
              pos={pos}
              prov={prov}
              risk={risk}
              verdict={verdict}
              onCloseTrade={handleCloseTrade}
              onSelectStock={onSelectStock}
            />
          ))
        )}
      </div>
    </div>
  );
};
