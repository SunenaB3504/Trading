/**
 * packages/simulator/src/ui/components/advisory/MasterTradeTicketCard.tsx
 * Synthesized Master Trade Advisory Ticket UI answering the Three Execution Questions.
 * Decomposed into small sub-components (< 60 LOC each).
 */

import React from 'react';
import type { MasterTradeTicket, ExecutionMode } from '../../../core/engine/advisorySynthesizer';

export interface MasterTradeTicketCardProps {
  ticket: MasterTradeTicket | null;
  onExecuteOrder?: ((ticket: MasterTradeTicket) => void) | undefined;
  isUpcomingIngress?: boolean | undefined;
  daysToIngress?: number | undefined;
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
  isUpcomingIngress,
  daysToIngress,
}: {
  action: 'BUY' | 'SELL' | 'HOLD' | 'BLOCKED';
  symbol: string;
  price: number;
  ticketId: string;
  isVetoed: boolean;
  triadCode?: string | undefined;
  isUpcomingIngress?: boolean | undefined;
  daysToIngress?: number | undefined;
}): React.ReactElement {
  const isBuy = action === 'BUY';
  const isBlocked = action === 'BLOCKED' || isVetoed;

  let badgeBg = '#1E293B';
  let badgeColor = '#94A3B8';
  let badgeText = action as string;

  if (isBlocked) {
    badgeBg = '#7F1D1D';
    badgeColor = '#FECACA';
    badgeText = 'BLOCKED: RISK VETO';
  } else if (isBuy) {
    badgeBg = '#065F46';
    badgeColor = '#ECFDF5';
    badgeText = 'BUY';
  } else if (isUpcomingIngress) {
    badgeBg = '#082F49';
    badgeColor = '#38BDF8';
    badgeText = `⚡ INGRESS (${daysToIngress ?? 0}d)`;
  } else if (action === 'SELL') {
    badgeBg = '#991B1B';
    badgeColor = '#FEE2E2';
    badgeText = 'SELL';
  } else {
    badgeBg = '#1E293B';
    badgeColor = '#94A3B8';
    badgeText = 'HOLD';
  }

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
  tier,
  daysToIngress,
  onExecuteAlgorithmic,
  onExecuteIngress,
  onInitiateOverride,
}: {
  cuspExitDate: string;
  tier: 'ALGORITHMIC' | 'INGRESS' | 'OVERRIDE';
  daysToIngress?: number | undefined;
  onExecuteAlgorithmic?: (() => void) | undefined;
  onExecuteIngress?: (() => void) | undefined;
  onInitiateOverride?: (() => void) | undefined;
}): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
      <span style={{ fontSize: '10px', color: '#64748B' }}>
        Cusp Exit: <strong>{cuspExitDate}</strong>
      </span>
      {tier === 'ALGORITHMIC' && onExecuteAlgorithmic && (
        <button
          onClick={onExecuteAlgorithmic}
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
          ⚡ Paper Buy (Algorithmic)
        </button>
      )}
      {tier === 'INGRESS' && onExecuteIngress && (
        <button
          onClick={onExecuteIngress}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            backgroundColor: '#0284C7',
            color: '#FFF',
            fontSize: '11px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ⚡ Ingress Buy ({daysToIngress ?? 0}d)
        </button>
      )}
      {tier === 'OVERRIDE' && onInitiateOverride && (
        <button
          onClick={onInitiateOverride}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            backgroundColor: '#D97706',
            color: '#FFF',
            fontSize: '11px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ⚠️ Override & Buy
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

export const MasterTradeTicketCard: React.FC<MasterTradeTicketCardProps> = ({
  ticket,
  onExecuteOrder,
  isUpcomingIngress = false,
  daysToIngress,
}) => {
  const [customShares, setCustomShares] = React.useState<number>(ticket?.shares && ticket.shares > 0 ? ticket.shares : 1);
  const [showWarningModal, setShowWarningModal] = React.useState(false);

  React.useEffect(() => {
    if (ticket) {
      setCustomShares(ticket.shares > 0 ? ticket.shares : 1);
      setShowWarningModal(false);
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
  const isAlgorithmicBuy = isBuy && !isVetoed;
  const isIngressTier = !isVetoed && isUpcomingIngress;
  const tier: 'ALGORITHMIC' | 'INGRESS' | 'OVERRIDE' = isAlgorithmicBuy
    ? 'ALGORITHMIC'
    : isIngressTier
    ? 'INGRESS'
    : 'OVERRIDE';

  const isCustomized = customShares !== ticket.shares;
  const currentInvested = Math.round(customShares * ticket.price * 10) / 10;

  const handleExecute = (mode: ExecutionMode) => {
    if (!onExecuteOrder) return;
    const orderTicket: MasterTradeTicket = {
      ...ticket,
      action: 'BUY',
      shares: Math.max(1, customShares),
      actualInvestedRupees: currentInvested,
      executionMode: mode,
    };
    onExecuteOrder(orderTicket);
    setShowWarningModal(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        background: '#0B0E14',
        border: `1px solid ${isVetoed ? '#475569' : isAlgorithmicBuy ? '#059669' : isIngressTier ? '#0284C7' : '#D97706'}`,
        borderRadius: '8px',
      }}
    >
      <TicketHeader
        action={ticket.action}
        symbol={ticket.symbol}
        price={ticket.price}
        ticketId={ticket.ticketId}
        isVetoed={isVetoed}
        triadCode={p.triadCode}
        isUpcomingIngress={isUpcomingIngress}
        daysToIngress={daysToIngress}
      />
      <div style={{ fontSize: '11px', color: '#CBD5E1' }}><strong>Signal:</strong> {p.signal} — {p.reason}</div>
      <MultipliersRow omegaTrader={p.omegaTrader} phiFinancial={p.phiFinancial} thetaAstro={p.thetaAstro} triadCode={p.triadCode} />
      <TicketMetricsGrid
        shares={customShares}
        actualInvested={currentInvested}
        targetPrice={ticket.exitRules.profitTargetPrice}
        stopPrice={ticket.exitRules.stopLossPrice}
        onSharesChange={setCustomShares}
        isCustomized={isCustomized}
        onResetShares={() => setCustomShares(ticket.shares > 0 ? ticket.shares : 1)}
      />
      {isIngressTier && (
        <div style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: '#082F49', border: '1px solid #0284C7', color: '#BAE6FD', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>⚡</span>
          <span>Impending Auspicious Ingress: Ingress cusp in {daysToIngress ?? 0} sessions. Early accumulation enabled.</span>
        </div>
      )}
      {isVetoed && p.vetoReason && (
        <div style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: '#450A0A', border: '1px solid #7F1D1D', color: '#FECACA', fontSize: '11px', fontWeight: 600 }}>
          ⛔ {p.vetoReason}
        </div>
      )}
      {showWarningModal && (
        <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: '#451A03', border: '1px solid #D97706', color: '#FEF3C7', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontWeight: 700, color: '#FBBF24', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚠️</span><span>DISCRETIONARY RISK OVERRIDE WARNING</span>
          </div>
          <div style={{ lineHeight: 1.4 }}>
            Recommendation is <strong>{ticket.action}</strong> {p.vetoReason ? `(${p.vetoReason})` : `(${p.reason})`}. Proceeding executes a manual order with <strong>{customShares} shares (₹{currentInvested.toLocaleString('en-IN')})</strong> bypassing risk vetoes.
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowWarningModal(false)} style={{ padding: '4px 10px', borderRadius: '4px', background: '#374151', color: '#D1D5DB', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>Cancel</button>
            <button onClick={() => handleExecute('DISCRETIONARY_OVERRIDE')} style={{ padding: '4px 12px', borderRadius: '4px', background: '#D97706', color: '#FFF', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>Confirm & Buy</button>
          </div>
        </div>
      )}
      <TicketFooter
        cuspExitDate={ticket.exitRules.calendarCuspExitDate}
        tier={tier}
        daysToIngress={daysToIngress}
        onExecuteAlgorithmic={onExecuteOrder ? () => handleExecute('ALGORITHMIC') : undefined}
        onExecuteIngress={onExecuteOrder ? () => handleExecute('ANTICIPATORY_INGRESS') : undefined}
        onInitiateOverride={onExecuteOrder ? () => setShowWarningModal(true) : undefined}
      />
    </div>
  );
};
