/**
 * packages/simulator/src/ui/CockpitTerminal.tsx
 * Standalone Astro-Financial Trade Simulator & Advisory Terminal Workstation.
 * Decomposed into small layout sub-panels & custom hooks (< 60 LOC each).
 */

import React, { useMemo } from 'react';
import { useSimulationStore } from '../state/simulationStore';
import { useStockStore } from '../state/stockStore';
import { usePortfolioStore } from '../state/portfolioStore';
import { TopNavigationBar } from './layout/TopNavigationBar';
import { BottomStatusBar } from './layout/BottomStatusBar';
import { PriceCandleCanvas } from './components/chart/PriceCandleCanvas';
import { ChartControls } from './components/chart/ChartControls';
import { DashaRibbon } from './components/chart/DashaRibbon';
import { KotaRadarCard } from './components/astro/KotaRadarCard';
import { FinancialAuditCard } from './components/financial/FinancialAuditCard';
import { MasterTradeTicketCard } from './components/advisory/MasterTradeTicketCard';
import { CopilotChatCard } from './components/copilot/CopilotChatCard';
import { evaluateKotaChakra } from '../core/astro/kotaChakra';
import { auditBalanceSheetPIT, type FinancialAuditResult } from '../core/financial/balanceSheetAudit';
import { detectEdgeSignals } from '../core/engine/edgeDetector';
import { calculatePositionSize } from '../core/engine/sizingCalculator';
import { synthesizeTradeTicket, type MasterTradeTicket } from '../core/engine/advisorySynthesizer';
import { serializeCockpitState } from '../core/ai/ragContextBuilder';
import type { ActiveDashaState, KotaChakraState } from '../core/astro/types';
import type { DailyBar } from '../core/data/types';

function LeftChartPanel({
  bars,
  currentIndex,
  dashaState,
  activeDate,
}: {
  bars: DailyBar[];
  currentIndex: number;
  dashaState: ActiveDashaState;
  activeDate: string;
}): React.ReactElement {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #1E2638' }}>
      <DashaRibbon dashaState={dashaState} activeDate={activeDate} />
      <div style={{ flex: 1, position: 'relative', background: '#0B0E14', padding: '10px' }}>
        <PriceCandleCanvas bars={bars} currentIndex={currentIndex} width={800} height={420} />
      </div>
      <ChartControls />
    </section>
  );
}

function RightTelemetryPanel({
  ticket,
  onOrder,
  auditResult,
  kotaState,
  telemetry,
}: {
  ticket: MasterTradeTicket | null;
  onOrder: (t: MasterTradeTicket) => void;
  auditResult: FinancialAuditResult;
  kotaState: KotaChakraState;
  telemetry: string;
}): React.ReactElement {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px', overflowY: 'auto' }}>
      <MasterTradeTicketCard ticket={ticket} onExecuteOrder={onOrder} />
      <FinancialAuditCard auditResult={auditResult} />
      <KotaRadarCard kotaState={kotaState} />
      <CopilotChatCard cockpitTelemetry={telemetry} />
    </section>
  );
}

function deriveTradeTicket(
  bar: DailyBar | null,
  totalEquity: number,
  phiFinancial: number,
  isBreached: boolean
): MasterTradeTicket | null {
  if (!bar) return null;
  const edge = detectEdgeSignals(bar, {
    mdCategory: 'trikona',
    adCategory: 'trikona',
    pdCategory: 'trikona',
    sessionsToCusp: 2,
    isVry: false,
    isFortressBreached: isBreached,
  });

  const sizing = calculatePositionSize({
    portfolioEquity: totalEquity,
    riskBudgetFraction: 0.1,
    omegaTrader: 1.0,
    phiFinancial,
    thetaAstro: edge.thetaAstro,
    currentPrice: bar.close,
  });

  return synthesizeTradeTicket(bar, edge, sizing, '2026-12-31');
}

function useCockpitTelemetryState() {
  const { currentIndex, activeDate } = useSimulationStore();
  const { bars, activeBar, metadata } = useStockStore();
  const { ledger, executeOrder } = usePortfolioStore();

  const dashaState: ActiveDashaState = useMemo(() => ({
    mahadasha: (metadata?.birth_md_lord?.toLowerCase() as 'jupiter') ?? 'jupiter',
    antardasha: 'saturn',
    pratyantardasha: 'mercury',
    sookshmadasha: 'venus',
    pranadasha: 'sun',
    mdRemainingDays: 450,
    adRemainingDays: 28,
    pdRemainingDays: 5,
  }), [metadata]);

  const kotaState = useMemo(() => evaluateKotaChakra(0, metadata?.moon_sign_id ?? 0, {
    jupiter: { nakshatraIndex: 0 },
    venus: { nakshatraIndex: 1 },
    mercury: { nakshatraIndex: 7 },
    moon: { nakshatraIndex: 0 },
    sun: { nakshatraIndex: 4 },
    mars: { nakshatraIndex: 5 },
    saturn: { nakshatraIndex: 10 },
    rahu: { nakshatraIndex: 11 },
    ketu: { nakshatraIndex: 17 },
  }), [metadata]);

  const auditResult = useMemo(() => auditBalanceSheetPIT([], activeDate), [activeDate]);

  const tradeTicket = useMemo(
    () => deriveTradeTicket(activeBar, ledger.total_equity, auditResult.phiFinancial, kotaState.defenseScore < 0.35),
    [activeBar, ledger.total_equity, auditResult.phiFinancial, kotaState.defenseScore]
  );

  const telemetry = useMemo(() => serializeCockpitState({
    activeSymbol: activeBar?.symbol ?? 'TCS',
    activeDate,
    currentBar: activeBar,
    dashaState,
    auditResult,
    filing: auditResult.filingUsed,
    kotaState,
    sbcState: null,
    portfolio: ledger,
  }), [activeBar, activeDate, dashaState, auditResult, kotaState, ledger]);

  return { currentIndex, activeDate, bars, dashaState, kotaState, auditResult, tradeTicket, telemetry, executeOrder };
}

export const CockpitTerminal: React.FC = () => {
  const { currentIndex, activeDate, bars, dashaState, kotaState, auditResult, tradeTicket, telemetry, executeOrder } =
    useCockpitTelemetryState();

  const handleOrder = (ticket: MasterTradeTicket) => {
    if (ticket.action !== 'BUY' || ticket.shares <= 0) return;
    void executeOrder(
      ticket.symbol,
      'BUY',
      ticket.shares,
      ticket.price,
      ticket.provenance.reason,
      activeDate
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#07090E', color: '#F1F5F9' }}>
      <TopNavigationBar />
      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.6fr 1.2fr', overflow: 'hidden' }}>
        <LeftChartPanel bars={bars} currentIndex={currentIndex} dashaState={dashaState} activeDate={activeDate} />
        <RightTelemetryPanel ticket={tradeTicket} onOrder={handleOrder} auditResult={auditResult} kotaState={kotaState} telemetry={telemetry} />
      </main>
      <BottomStatusBar />
    </div>
  );
};
