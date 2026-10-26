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
}: {
  shares: number;
  actualInvested: number;
  targetPrice: number;
  stopPrice: number;
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
        <span style={{ color: '#9CA3AF', display: 'block', fontSize: '10px' }}>Quantity</span>
        <strong style={{ color: '#F3F4F6' }}>{shares} shares</strong>
      </div>
      <div>
        <span style={{ color: '#9CA3AF', display: 'block', fontSize: '10px' }}>Allocation</span>
        <strong style={{ color: '#F3F4F6' }}>₹{actualInvested.toLocaleString('en-IN')}</strong>
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
          Execute Paper Trade
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
      <TicketMetricsGrid shares={ticket.shares} actualInvested={ticket.actualInvestedRupees} targetPrice={ticket.exitRules.profitTargetPrice} stopPrice={ticket.exitRules.stopLossPrice} />
      {isVetoed && p.vetoReason && (
        <div style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: '#450A0A', border: '1px solid #7F1D1D', color: '#FECACA', fontSize: '11px', fontWeight: 600 }}>
          ⛔ {p.vetoReason}
        </div>
      )}
      <TicketFooter
        cuspExitDate={ticket.exitRules.calendarCuspExitDate}
        isBuy={isBuy}
        isVetoed={isVetoed}
        onExecute={onExecuteOrder ? () => onExecuteOrder(ticket) : undefined}
      />
    </div>
  );
};
