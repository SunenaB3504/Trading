/**
 * packages/simulator/src/ui/components/advisory/MasterTradeTicketCard.tsx
 * Synthesized Master Trade Advisory Ticket UI answering the Three Execution Questions.
 * Decomposed into small sub-components (< 60 LOC each).
 */

import React from 'react';
import type { MasterTradeTicket } from '../../../core/engine/advisorySynthesizer';

export interface MasterTradeTicketCardProps {
  ticket: MasterTradeTicket | null;
  onExecuteOrder?: (ticket: MasterTradeTicket) => void;
}

function MultiplierTag({ label, val }: { label: string; val: number }): React.ReactElement {
  const isZero = val <= 0;
  return (
    <span
      style={{
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '10px',
        fontFamily: 'monospace',
        fontWeight: 600,
        backgroundColor: isZero ? '#450A0A' : '#064E3B',
        color: isZero ? '#FCA5A5' : '#6EE7B7',
      }}
    >
      {label}: {val.toFixed(2)}
    </span>
  );
}

function TicketHeader({
  action,
  symbol,
  price,
  ticketId,
  isVetoed,
  triadCode,
}: {
  action: 'BUY' | 'SELL' | 'HOLD' | 'BLOCKED';
  symbol: string;
  price: number;
  ticketId: string;
  isVetoed: boolean;
  triadCode?: string;
}): React.ReactElement {
  const isBuy = action === 'BUY';
  const isBlocked = action === 'BLOCKED' || isVetoed;
  const badgeBg = isBlocked ? '#7F1D1D' : isBuy ? '#065F46' : '#991B1B';
  const badgeColor = isBlocked ? '#FECACA' : '#ECFDF5';
  const badgeText = isBlocked ? 'BLOCKED: RISK VETO' : action;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 800,
            backgroundColor: badgeBg,
            color: badgeColor,
          }}
        >
          {badgeText}
        </span>
        <span style={{ color: '#F8FAFC', fontWeight: 700, fontSize: '13px' }}>
          {symbol} @ ₹{price.toFixed(2)}
        </span>
        {triadCode && (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'monospace',
              backgroundColor: '#1E293B',
              color: '#38BDF8',
              border: '1px solid #0284C7',
            }}
          >
            {triadCode}
          </span>
        )}
      </div>
      <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>{ticketId}</span>
    </div>
  );
}

function TicketMetricsGrid({
  shares,
  actualInvested,
  targetPrice,
  stopPrice,
  onSharesChange,
  isCustomized,
  onResetShares,
}: {
  shares: number;
  actualInvested: number;
  targetPrice: number;
  stopPrice: number;
  onSharesChange?: ((val: number) => void) | undefined;
  isCustomized?: boolean | undefined;
  onResetShares?: (() => void) | undefined;
}): React.ReactElement {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
        padding: '10px',
        borderRadius: '6px',
        backgroundColor: '#111827',
        fontSize: '11px',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
          <span style={{ color: '#9CA3AF', fontSize: '10px' }}>Quantity</span>
          {isCustomized && onResetShares && (
            <button
              type="button"
              onClick={onResetShares}
              title="Reset to recommended sizing"
              style={{
                background: 'none',
                border: 'none',
                color: '#38BDF8',
                fontSize: '9px',
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              Reset
            </button>
          )}
        </div>
        {onSharesChange ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <button
              type="button"
              onClick={() => onSharesChange(Math.max(1, shares <= 10 ? shares - 1 : shares - 10))}
              title="Decrease quantity"
              style={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '3px',
                color: '#9CA3AF',
                width: '18px',
                height: '22px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              −
            </button>
            <input
              type="number"
              min={1}
              value={shares}
              onChange={(e) => {
                const parsed = parseInt(e.target.value, 10);
                onSharesChange(isNaN(parsed) ? 1 : Math.max(1, parsed));
              }}
              style={{
                width: '56px',
                backgroundColor: '#030712',
                border: isCustomized ? '1px solid #D4AF37' : '1px solid #374151',
                borderRadius: '4px',
                color: '#F9FAFB',
                fontSize: '12px',
                fontWeight: 700,
                padding: '2px 4px',
                textAlign: 'center',
              }}
            />
            <button
              type="button"
              onClick={() => onSharesChange(shares < 10 ? shares + 1 : shares + 10)}
              title="Increase quantity"
              style={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '3px',
                color: '#9CA3AF',
                width: '18px',
                height: '22px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              +
            </button>
            <span style={{ color: '#9CA3AF', fontSize: '11px', marginLeft: '2px' }}>shs</span>
          </div>
        ) : (
          <strong style={{ color: '#F3F4F6' }}>{shares} shares</strong>
        )}
      </div>
      <div>
        <span style={{ color: '#9CA3AF', display: 'block', fontSize: '10px' }}>Allocation</span>
        <strong style={{ color: '#F3F4F6' }}>₹{actualInvested.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</strong>
      </div>
      <div>
        <span style={{ color: '#9CA3AF', display: 'block', fontSize: '10px' }}>Target / Stop</span>
        <span style={{ color: '#34D399', fontWeight: 700 }}>₹{targetPrice}</span> /{' '}
        <span style={{ color: '#F87171', fontWeight: 700 }}>₹{stopPrice}</span>
      </div>
    </div>
  );
}

function TicketFooter({
  cuspExitDate,
  isBuy,
  isVetoed,
  onExecute,
}: {
  cuspExitDate: string;
  isBuy: boolean;
  isVetoed: boolean;
  onExecute?: (() => void) | undefined;
}): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '10px', color: '#64748B' }}>
        Cusp Exit: <strong>{cuspExitDate}</strong>
      </span>
      {isBuy && !isVetoed && onExecute && (
        <button
          onClick={onExecute}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            backgroundColor: '#059669',
            color: '#FFF',
            fontSize: '11px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Test Logic: Paper Buy
        </button>
      )}
    </div>
  );
}

function MultipliersRow({
  omegaTrader,
  phiFinancial,
  thetaAstro,
  triadCode,
}: {
  omegaTrader: number;
  phiFinancial: number;
  thetaAstro: number;
  triadCode?: string;
}): React.ReactElement {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
      <MultiplierTag label="Ω Trader" val={omegaTrader} />
      <MultiplierTag label="Φ Financial" val={phiFinancial} />
      <MultiplierTag label="Θ Astro" val={thetaAstro} />
      {triadCode && (
        <span
          style={{
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 600,
            backgroundColor: '#1E1B4B',
            color: '#C7D2FE',
            border: '1px solid #4338CA',
          }}
        >
          Triad: {triadCode}
        </span>
      )}
    </div>
  );
}

export const MasterTradeTicketCard: React.FC<MasterTradeTicketCardProps> = ({ ticket, onExecuteOrder }) => {
  const [customShares, setCustomShares] = React.useState<number>(ticket?.shares ?? 1);

  React.useEffect(() => {
    if (ticket) {
      setCustomShares(ticket.shares);
    }
  }, [ticket?.ticketId, ticket?.shares]);

  if (!ticket) {
    return (
      <div style={{ padding: '16px', background: '#0B0E14', borderRadius: '8px', border: '1px solid #1E2638', color: '#64748B' }}>
        No active trade advisory ticket generated for this session.
      </div>
    );
  }

  const p = ticket.provenance;
  const isBuy = ticket.action === 'BUY';
  const isVetoed = p.isVetoed;
  const isCustomized = customShares !== ticket.shares;
  const currentInvested = Math.round(customShares * ticket.price * 10) / 10;

  const handleExecute = () => {
    if (!onExecuteOrder) return;
    const orderTicket: MasterTradeTicket = {
      ...ticket,
      shares: customShares,
      actualInvestedRupees: currentInvested,
    };
    onExecuteOrder(orderTicket);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        background: '#0B0E14',
        border: `1px solid ${isVetoed ? '#475569' : isBuy ? '#059669' : '#DC2626'}`,
        borderRadius: '8px',
      }}
    >
      <TicketHeader action={ticket.action} symbol={ticket.symbol} price={ticket.price} ticketId={ticket.ticketId} isVetoed={isVetoed} triadCode={p.triadCode} />
      <div style={{ fontSize: '11px', color: '#CBD5E1' }}><strong>Signal:</strong> {p.signal} — {p.reason}</div>
      <MultipliersRow omegaTrader={p.omegaTrader} phiFinancial={p.phiFinancial} thetaAstro={p.thetaAstro} triadCode={p.triadCode} />
      <TicketMetricsGrid
        shares={customShares}
        actualInvested={currentInvested}
        targetPrice={ticket.exitRules.profitTargetPrice}
        stopPrice={ticket.exitRules.stopLossPrice}
        onSharesChange={isBuy && !isVetoed ? setCustomShares : undefined}
        isCustomized={isCustomized}
        onResetShares={() => setCustomShares(ticket.shares)}
      />
      {isVetoed && p.vetoReason && (
        <div style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: '#450A0A', border: '1px solid #7F1D1D', color: '#FECACA', fontSize: '11px', fontWeight: 600 }}>
          ⛔ {p.vetoReason}
        </div>
      )}
      <TicketFooter
        cuspExitDate={ticket.exitRules.calendarCuspExitDate}
        isBuy={isBuy}
        isVetoed={isVetoed}
        onExecute={onExecuteOrder ? handleExecute : undefined}
      />
    </div>
  );
};
