/**
 * packages/simulator/src/ui/CockpitTerminal.tsx
 * Standalone Astro-Financial Trade Simulator & Advisory Terminal Workstation.
 * Decomposed into small layout sub-panels & custom hooks (< 60 LOC each).
 */

import React, { useMemo } from 'react';
import { useSimulationStore } from '../state/simulationStore';
import { useStockStore } from '../state/stockStore';
import { usePortfolioStore } from '../state/portfolioStore';
import { useStrategyStore } from '../state/strategyStore';
import { TopNavigationBar } from './layout/TopNavigationBar';
import { BottomStatusBar } from './layout/BottomStatusBar';
import { PriceCandleCanvas } from './components/chart/PriceCandleCanvas';
import { ChartControls } from './components/chart/ChartControls';
import { DashaRibbon } from './components/chart/DashaRibbon';
import { ForwardRoadmapStrip } from './components/chart/ForwardRoadmapStrip';
import { KotaRadarCard } from './components/astro/KotaRadarCard';
import { TrikonaNathansBadge } from './components/astro/TrikonaNathansBadge';
import { FinancialAuditCard } from './components/financial/FinancialAuditCard';
import { MasterTradeTicketCard } from './components/advisory/MasterTradeTicketCard';
import { CopilotChatCard } from './components/copilot/CopilotChatCard';
import { DailyActionFeed } from './components/screener/DailyActionFeed';
import { UniverseRadarModal } from './components/screener/UniverseRadarModal';
import { HoroscopeDossierModal } from './components/astro/HoroscopeDossierModal';
import { StrategyParameterDrawer, type StrategyParameters } from './components/settings/StrategyParameterDrawer';
import { AstroPositionsDrawer } from './components/portfolio/AstroPositionsDrawer';
import { AstroScorecardModal } from './components/portfolio/AstroScorecardModal';
import { serializeAstroProvenance } from '../core/engine/astroProvenanceSerializer';
import { evaluateKotaChakra } from '../core/astro/kotaChakra';
import { calculateTransitNakshatras, calculateTransitSigns } from '../core/astro/ephemeris';
import { evaluateSpecialYogas } from '../core/astro/yogaDetector';
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
import corporateRegistryData from '../core/data/corporateRegistry.json';

const pitFundamentals = pitFundamentalsData as Record<string, QuarterlyFundamental[]>;
const corporateRegistry = corporateRegistryData as Record<string, CorporateRegistryRecord>;

function LeftChartPanel({
  bars,
  currentIndex,
  dashaState,
  activeDate,
  metadata,
  onSelectDate,
  onSyncLatestSession,
}: {
  bars: DailyBar[];
  currentIndex: number;
  dashaState: ActiveDashaState | null;
  activeDate: string;
  metadata: CorporateRegistryRecord | null;
  onSelectDate: (targetDate: string) => void;
  onSyncLatestSession?: () => void;
}): React.ReactElement {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #1E2638' }}>
      <DashaRibbon dashaState={dashaState} activeDate={activeDate} />
      <TrikonaNathansBadge metadata={metadata} />
      <div style={{ flex: 1, position: 'relative', background: '#0B0E14', padding: '10px', minHeight: 0 }}>
        <PriceCandleCanvas
          bars={bars}
          currentIndex={currentIndex}
          activeDate={activeDate}
          onSelectDate={onSelectDate}
        />
      </div>
      <ForwardRoadmapStrip
        metadata={metadata}
        activeDate={activeDate}
        onSelectDate={onSelectDate}
        onSyncLatestSession={onSyncLatestSession}
      />
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
  activeDate,
  onSelectStock,
}: {
  ticket: MasterTradeTicket | null;
  onOrder: (t: MasterTradeTicket) => void;
  auditResult: FinancialAuditResult;
  kotaState: KotaChakraState;
  telemetry: string;
  activeDate: string;
  onSelectStock: (sym: string) => void;
}): React.ReactElement {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px', overflowY: 'auto' }}>
      <DailyActionFeed
        activeDate={activeDate}
        onSelectStock={onSelectStock}
        registry={corporateRegistry}
        fundamentalsMap={pitFundamentals}
      />
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
  metadata: CorporateRegistryRecord | null,
  activeDate?: string,
  strategyParams?: StrategyParameters
): MasterTradeTicket | null {
  if (!bar) return null;

  const lagnaId = metadata?.lagna_sign_id ?? 0;
  const mdCategory = dashaState ? classifyLordRole(dashaState.mahadasha, lagnaId) : 'neutral';
  const adCategory = dashaState ? classifyLordRole(dashaState.antardasha, lagnaId) : 'neutral';
  const pdCategory = dashaState ? classifyLordRole(dashaState.pratyantardasha, lagnaId) : 'neutral';

  const transitSigns = activeDate ? calculateTransitSigns(activeDate) : {
    sun: 0, moon: 0, mars: 0, mercury: 0, jupiter: 0, venus: 0, saturn: 0, rahu: 0, ketu: 0,
  };
  const activeYogas = evaluateSpecialYogas({
    lagnaSignId: lagnaId,
    moonSignId: metadata?.moon_sign_id ?? 0,
    planetSigns: transitSigns,
  }).activeYogaNames;
  const hasVry = activeYogas.some((y) => y.startsWith('VRY'));
  const allowVry = strategyParams ? strategyParams.enableVryTurnaround && hasVry : hasVry;

  const sessionsToCusp = dashaState ? Math.round(dashaState.pdRemainingDays) : 30;

  const edge = detectEdgeSignals(bar, {
    mdCategory,
    adCategory,
    pdCategory,
    sessionsToCusp,
    isVry: allowVry,
    isFortressBreached: isBreached,
    lords: dashaState
      ? {
          md: dashaState.mahadasha,
          ad: dashaState.antardasha,
          pd: dashaState.pratyantardasha,
        }
      : undefined,
  });

  const sizing = calculatePositionSize({
    portfolioEquity: totalEquity,
    riskBudgetFraction: strategyParams?.riskBudgetFraction ?? 0.1,
    omegaTrader: 1.0,
    phiFinancial,
    thetaAstro: edge.thetaAstro,
    currentPrice: bar.close,
  });

  let cuspExitDate = '2026-12-31';
  if (dashaState && dashaState.pdRemainingDays > 0) {
    const baseMs = new Date(activeDate || bar.date).getTime();
    const endMs = baseMs + (dashaState.pdRemainingDays * 86400000);
    cuspExitDate = new Date(endMs).toISOString().slice(0, 10);
  }

  const ticket = synthesizeTradeTicket(bar, edge, sizing, cuspExitDate);

  if (strategyParams) {
    if (bar.close < strategyParams.minNominalPrice) {
      ticket.action = 'HOLD';
      ticket.shares = 0;
      ticket.provenance.reason = `[VETO: NOMINAL PRICE ₹${bar.close.toFixed(2)} < MIN ₹${strategyParams.minNominalPrice}] ${ticket.provenance.reason}`;
    }
  }

  if (activeDate && activeDate > bar.date) {
    return {
      ...ticket,
      timestamp: activeDate,
      provenance: {
        ...ticket.provenance,
        reason: `[FORWARD ASTRO EVALUATION for ${activeDate}] ${ticket.provenance.reason}`,
      },
    };
  }

  return ticket;
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
  const { bars, activeBar, metadata, activeSymbol } = useStockStore();
  const { ledger, executeOrder } = usePortfolioStore();
  const strategyParams = useStrategyStore((s) => s.parameters);

  const resolvedMeta = metadata ?? corporateRegistry[activeSymbol] ?? corporateRegistry['APLAPOLLO'] ?? null;

  const dashaState = useMemo(() => deriveActiveDasha(resolvedMeta, activeDate), [resolvedMeta, activeDate]);

  const kotaState = useMemo(() => {
    const transits = calculateTransitNakshatras(activeDate || '2005-01-01');
    const janmaNak = resolvedMeta?.moon_nakshatra
      ? Math.max(0, (NAKSHATRAS as readonly string[]).indexOf(resolvedMeta.moon_nakshatra))
      : 0;
    const moonSign = resolvedMeta?.moon_sign_id ?? 0;
    return evaluateKotaChakra(janmaNak, moonSign, transits);
  }, [resolvedMeta, activeDate]);

  const auditResult = useMemo(() => {
    const symFund = pitFundamentals[activeBar?.symbol ?? activeSymbol ?? 'APLAPOLLO'] ?? [];
    return auditBalanceSheetPIT(symFund, activeDate);
  }, [activeBar?.symbol, activeSymbol, activeDate]);

  const isFortressBreached = kotaState.defenseScore < strategyParams.kotaDefenseThreshold;

  const tradeTicket = useMemo(
    () => deriveTradeTicket(
      activeBar,
      ledger.total_equity,
      auditResult.phiFinancial,
      isFortressBreached,
      dashaState,
      resolvedMeta,
      activeDate,
      strategyParams
    ),
    [activeBar, ledger.total_equity, auditResult.phiFinancial, isFortressBreached, dashaState, resolvedMeta, activeDate, strategyParams]
  );

  const telemetry = useMemo(() => serializeCockpitState({
    activeSymbol: activeBar?.symbol ?? activeSymbol ?? 'APLAPOLLO',
    activeDate,
    currentBar: activeBar,
    dashaState,
    auditResult,
    filing: auditResult.filingUsed,
    kotaState,
    sbcState: null,
    portfolio: ledger,
  }), [activeBar, activeSymbol, activeDate, dashaState, auditResult, kotaState, ledger]);

  return { currentIndex, activeDate, bars, dashaState, kotaState, auditResult, tradeTicket, telemetry, executeOrder, metadata: resolvedMeta };
}

export const CockpitTerminal: React.FC = () => {
  const { currentIndex, activeDate, bars, dashaState, kotaState, auditResult, tradeTicket, telemetry, executeOrder, metadata } =
    useCockpitTelemetryState();
  const { loadStock } = useStockStore();

  const [isRadarOpen, setIsRadarOpen] = React.useState(false);
  const [isHoroscopeOpen, setIsHoroscopeOpen] = React.useState(false);
  const [isStrategyOpen, setIsStrategyOpen] = React.useState(false);
  const [isPositionsOpen, setIsPositionsOpen] = React.useState(false);
  const [isScorecardOpen, setIsScorecardOpen] = React.useState(false);

  const availableTickers = useMemo(() => Object.keys(corporateRegistry), []);

  React.useEffect(() => {
    loadStock('APLAPOLLO', '2026-10-28');
  }, [loadStock]);

  const handleSelectStock = (sym: string, targetDate?: string) => {
    loadStock(sym, targetDate ?? activeDate);
  };

  const handleOrder = (ticket: MasterTradeTicket) => {
    if (ticket.action !== 'BUY' || ticket.shares <= 0) return;
    const provenanceStr = serializeAstroProvenance(ticket, dashaState);
    void executeOrder(ticket.symbol, 'BUY', ticket.shares, ticket.price, provenanceStr, activeDate);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#07090E', color: '#F1F5F9' }}>
      <TopNavigationBar
        onOpenRadar={() => setIsRadarOpen(true)}
        onOpenHoroscope={() => setIsHoroscopeOpen(true)}
        onOpenStrategy={() => setIsStrategyOpen(true)}
        onOpenPositions={() => setIsPositionsOpen(true)}
        onOpenScorecard={() => setIsScorecardOpen(true)}
        onSyncToday={() => loadStock(metadata?.symbol ?? 'APLAPOLLO', '2026-10-28')}
        availableTickers={availableTickers}
      />
      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.6fr 1.2fr', overflow: 'hidden' }}>
        <LeftChartPanel
          bars={bars}
          currentIndex={currentIndex}
          dashaState={dashaState}
          activeDate={activeDate}
          metadata={metadata}
          onSelectDate={(d) => loadStock(metadata?.symbol ?? 'APLAPOLLO', d)}
          onSyncLatestSession={() => {
            const latest = bars[bars.length - 1];
            if (latest) loadStock(metadata?.symbol ?? 'APLAPOLLO', latest.date);
          }}
        />
        <RightTelemetryPanel
          ticket={tradeTicket}
          onOrder={handleOrder}
          auditResult={auditResult}
          kotaState={kotaState}
          telemetry={telemetry}
          activeDate={activeDate}
          onSelectStock={handleSelectStock}
        />
      </main>
      <BottomStatusBar />

      <UniverseRadarModal
        isOpen={isRadarOpen}
        onClose={() => setIsRadarOpen(false)}
        activeDate={activeDate}
        onSelectStock={handleSelectStock}
        registry={corporateRegistry}
        fundamentalsMap={pitFundamentals}
      />

      <HoroscopeDossierModal
        isOpen={isHoroscopeOpen}
        onClose={() => setIsHoroscopeOpen(false)}
        metadata={metadata}
        activeDate={activeDate}
      />

      <StrategyParameterDrawer
        isOpen={isStrategyOpen}
        onClose={() => setIsStrategyOpen(false)}
      />

      <AstroPositionsDrawer
        isOpen={isPositionsOpen}
        onClose={() => setIsPositionsOpen(false)}
        activeDate={activeDate}
        onSelectStock={handleSelectStock}
      />

      <AstroScorecardModal
        isOpen={isScorecardOpen}
        onClose={() => setIsScorecardOpen(false)}
      />
    </div>
  );
};
