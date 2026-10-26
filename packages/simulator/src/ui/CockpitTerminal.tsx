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
import { TrikonaNathansBadge } from './components/astro/TrikonaNathansBadge';
import { FinancialAuditCard } from './components/financial/FinancialAuditCard';
import { MasterTradeTicketCard } from './components/advisory/MasterTradeTicketCard';
import { CopilotChatCard } from './components/copilot/CopilotChatCard';
import { evaluateKotaChakra } from '../core/astro/kotaChakra';
import { calculateTransitNakshatras } from '../core/astro/ephemeris';
import { NAKSHATRAS } from '../core/astro/constants';
import { generateMahadashas, resolveActive5FoldDasha } from '../core/astro/vimshottari';
import { classifyLordRole } from '../core/astro/trikonaNathans';
import { auditBalanceSheetPIT, type FinancialAuditResult } from '../core/financial/balanceSheetAudit';
import { detectEdgeSignals } from '../core/engine/edgeDetector';
import { calculatePositionSize } from '../core/engine/sizingCalculator';
import { synthesizeTradeTicket, type MasterTradeTicket } from '../core/engine/advisorySynthesizer';
import { serializeCockpitState } from '../core/ai/ragContextBuilder';
import type { ActiveDashaState, KotaChakraState } from '../core/astro/types';
import type { DailyBar, CorporateRegistryRecord, QuarterlyFundamental } from '../core/data/types';
import pitFundamentalsData from '../core/data/fixtures/pitFundamentals.json';

const pitFundamentals = pitFundamentalsData as Record<string, QuarterlyFundamental[]>;

function LeftChartPanel({
  bars,
  currentIndex,
  dashaState,
  activeDate,
  metadata,
}: {
  bars: DailyBar[];
  currentIndex: number;
  dashaState: ActiveDashaState | null;
  activeDate: string;
  metadata: CorporateRegistryRecord | null;
}): React.ReactElement {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #1E2638' }}>
      <DashaRibbon dashaState={dashaState} activeDate={activeDate} />
      <TrikonaNathansBadge metadata={metadata} />
      <div style={{ flex: 1, position: 'relative', background: '#0B0E14', padding: '10px', minHeight: 0 }}>
        <PriceCandleCanvas bars={bars} currentIndex={currentIndex} />
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
  isBreached: boolean,
  dashaState: ActiveDashaState | null,
  metadata: CorporateRegistryRecord | null
): MasterTradeTicket | null {
  if (!bar) return null;

  const lagnaId = metadata?.lagna_sign_id ?? 0;
  const mdCategory = dashaState ? classifyLordRole(dashaState.mahadasha, lagnaId) : 'neutral';
  const adCategory = dashaState ? classifyLordRole(dashaState.antardasha, lagnaId) : 'neutral';
  const pdCategory = dashaState ? classifyLordRole(dashaState.pratyantardasha, lagnaId) : 'neutral';

  const edge = detectEdgeSignals(bar, {
    mdCategory,
    adCategory,
    pdCategory,
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

function deriveActiveDasha(meta: CorporateRegistryRecord | null, activeDate: string): ActiveDashaState | null {
  if (!meta || !activeDate) return null;
  const birthDateStr = `${meta.listing_date}T${meta.listing_time || '10:00:00'}+05:30`;
  const birthMs = new Date(birthDateStr).getTime();
  const mahadashas = generateMahadashas(birthMs, meta.moon_deg, meta.year_length_days);
  const sessionMs = new Date(`${activeDate}T12:00:00+05:30`).getTime();
  return resolveActive5FoldDasha(mahadashas, sessionMs);
}

function useCockpitTelemetryState() {
  const { currentIndex, activeDate } = useSimulationStore();
  const { bars, activeBar, metadata } = useStockStore();
  const { ledger, executeOrder } = usePortfolioStore();

  const dashaState = useMemo(() => deriveActiveDasha(metadata, activeDate), [metadata, activeDate]);

  const kotaState = useMemo(() => {
    const transits = calculateTransitNakshatras(activeDate || '2005-01-01');
    const janmaNak = metadata?.moon_nakshatra
      ? Math.max(0, (NAKSHATRAS as readonly string[]).indexOf(metadata.moon_nakshatra))
      : 0;
    const moonSign = metadata?.moon_sign_id ?? 0;
    return evaluateKotaChakra(janmaNak, moonSign, transits);
  }, [metadata, activeDate]);

  const auditResult = useMemo(() => {
    const symFund = pitFundamentals[activeBar?.symbol ?? 'TCS'] ?? [];
    return auditBalanceSheetPIT(symFund, activeDate);
  }, [activeBar?.symbol, activeDate]);

  const tradeTicket = useMemo(
    () => deriveTradeTicket(activeBar, ledger.total_equity, auditResult.phiFinancial, kotaState.defenseScore < 0.35, dashaState, metadata),
    [activeBar, ledger.total_equity, auditResult.phiFinancial, kotaState.defenseScore, dashaState, metadata]
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

  return { currentIndex, activeDate, bars, dashaState, kotaState, auditResult, tradeTicket, telemetry, executeOrder, metadata };
}

export const CockpitTerminal: React.FC = () => {
  const { currentIndex, activeDate, bars, dashaState, kotaState, auditResult, tradeTicket, telemetry, executeOrder, metadata } =
    useCockpitTelemetryState();

  const handleOrder = (ticket: MasterTradeTicket) => {
    if (ticket.action !== 'BUY' || ticket.shares <= 0) return;
    void executeOrder(ticket.symbol, 'BUY', ticket.shares, ticket.price, ticket.provenance.reason, activeDate);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#07090E', color: '#F1F5F9' }}>
      <TopNavigationBar />
      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.6fr 1.2fr', overflow: 'hidden' }}>
        <LeftChartPanel bars={bars} currentIndex={currentIndex} dashaState={dashaState} activeDate={activeDate} metadata={metadata} />
        <RightTelemetryPanel ticket={tradeTicket} onOrder={handleOrder} auditResult={auditResult} kotaState={kotaState} telemetry={telemetry} />
      </main>
      <BottomStatusBar />
    </div>
  );
};
