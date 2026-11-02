import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MasterTradeTicketCard } from './MasterTradeTicketCard';
import type { MasterTradeTicket } from '../../../core/engine/advisorySynthesizer';

describe('MasterTradeTicketCard - Trader Agency & Universal Buy Execution', () => {
  const baseTicket: MasterTradeTicket = {
    ticketId: 'TKT-TEST-001',
    symbol: 'HDFCBANK',
    timestamp: '2026-10-30',
    action: 'BUY',
    shares: 100,
    price: 692.8,
    targetAllocationRupees: 70000,
    actualInvestedRupees: 69280,
    exitRules: {
      calendarCuspExitDate: '2026-11-15',
      profitTargetPrice: 800,
      stopLossPrice: 650,
      profitTargetPct: 16.6,
      stopLossPct: 5.0,
      fortressBreachTrigger: true,
    },
    provenance: {
      signal: 'BUY_TRIKONA',
      reason: 'Auspicious [T-T-T] trend',
      triadCode: '[T-T-T]',
      omegaTrader: 1.0,
      phiFinancial: 1.0,
      thetaAstro: 1.0,
      isVetoed: false,
    },
  };

  it('renders algorithmic paper buy button when ticket action is BUY and not vetoed', () => {
    const handleOrder = vi.fn();
    render(<MasterTradeTicketCard ticket={baseTicket} onExecuteOrder={handleOrder} />);

    const buyBtn = screen.getByText(/Paper Buy \(Algorithmic\)/i);
    expect(buyBtn).toBeDefined();

    fireEvent.click(buyBtn);
    expect(handleOrder).toHaveBeenCalledTimes(1);
    expect(handleOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        executionMode: 'ALGORITHMIC',
        shares: 100,
      })
    );
  });

  it('renders Anticipatory Ingress Buy when stock has upcoming ingress', () => {
    const ingressTicket: MasterTradeTicket = {
      ...baseTicket,
      action: 'HOLD',
      shares: 0,
    };
    const handleOrder = vi.fn();
    render(
      <MasterTradeTicketCard
        ticket={ingressTicket}
        onExecuteOrder={handleOrder}
        isUpcomingIngress={true}
        daysToIngress={7}
      />
    );

    expect(screen.getByText(/⚡ INGRESS \(7d\)/i)).toBeDefined();
    expect(screen.getByText(/Impending Auspicious Ingress/i)).toBeDefined();

    const ingressBuyBtn = screen.getByText(/Ingress Buy \(7d\)/i);
    expect(ingressBuyBtn).toBeDefined();

    fireEvent.click(ingressBuyBtn);
    expect(handleOrder).toHaveBeenCalledTimes(1);
    expect(handleOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        executionMode: 'ANTICIPATORY_INGRESS',
        shares: 1, // Defaulted to 1 lot when initial shares was 0
      })
    );
  });

  it('renders Override & Buy for vetoed/HOLD stocks and shows warning modal on click', () => {
    const vetoTicket: MasterTradeTicket = {
      ...baseTicket,
      action: 'BLOCKED',
      shares: 0,
      provenance: {
        ...baseTicket.provenance,
        isVetoed: true,
        vetoReason: 'Financial Risk Veto: D/E > 2.0',
      },
    };
    const handleOrder = vi.fn();
    render(<MasterTradeTicketCard ticket={vetoTicket} onExecuteOrder={handleOrder} />);

    expect(screen.getByText(/BLOCKED: RISK VETO/i)).toBeDefined();
    const overrideBtn = screen.getByText(/⚠️ Override & Buy/i);
    expect(overrideBtn).toBeDefined();

    // Click Override & Buy -> reveals warning modal
    fireEvent.click(overrideBtn);
    expect(screen.getByText(/DISCRETIONARY RISK OVERRIDE WARNING/i)).toBeDefined();
    expect(screen.getByText(/Financial Risk Veto: D\/E > 2.0/i)).toBeDefined();

    // Confirm discretionary buy
    const confirmBtn = screen.getByText(/Confirm & Buy/i);
    fireEvent.click(confirmBtn);

    expect(handleOrder).toHaveBeenCalledTimes(1);
    expect(handleOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        executionMode: 'DISCRETIONARY_OVERRIDE',
        action: 'BUY',
        shares: 1,
      })
    );
  });
});
