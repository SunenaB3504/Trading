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
}: {
  action: 'BUY' | 'SELL' | 'HOLD';
  symbol: string;
  price: number;
  ticketId: string;
  isVetoed: boolean;
}): React.ReactElement {
  const isBuy = action === 'BUY';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 800,
            backgroundColor: isVetoed ? '#334155' : isBuy ? '#065F46' : '#991B1B',
            color: isVetoed ? '#94A3B8' : '#ECFDF5',
          }}
        >
          {action}
        </span>
        <span style={{ color: '#F8FAFC', fontWeight: 700, fontSize: '13px' }}>
          {symbol} @ ₹{price.toFixed(2)}
        </span>
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
      <TicketHeader action={ticket.action} symbol={ticket.symbol} price={ticket.price} ticketId={ticket.ticketId} isVetoed={isVetoed} />
      <div style={{ fontSize: '11px', color: '#CBD5E1' }}><strong>Signal:</strong> {p.signal} — {p.reason}</div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <MultiplierTag label="Ω Trader" val={p.omegaTrader} />
        <MultiplierTag label="Φ Financial" val={p.phiFinancial} />
        <MultiplierTag label="Θ Astro" val={p.thetaAstro} />
      </div>
      <TicketMetricsGrid shares={ticket.shares} actualInvested={ticket.actualInvestedRupees} targetPrice={ticket.exitRules.profitTargetPrice} stopPrice={ticket.exitRules.stopLossPrice} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '10px', color: '#64748B' }}>Cusp Exit: <strong>{ticket.exitRules.calendarCuspExitDate}</strong></span>
        {isBuy && !isVetoed && onExecuteOrder && (
          <button onClick={() => onExecuteOrder(ticket)} style={{ padding: '6px 14px', borderRadius: '6px', backgroundColor: '#059669', color: '#FFF', fontSize: '11px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
            Execute Paper Trade
          </button>
        )}
      </div>
    </div>
  );
};
