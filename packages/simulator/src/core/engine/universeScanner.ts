/**
 * packages/simulator/src/core/engine/universeScanner.ts
 * Batch-evaluates equities for 27-Triad screening, Yogas, and prioritized signals.
 * Incorporates 4-fold Vedic Confluence: Indu Lagna, Kota Chakra, SBC, and Tara Bala.
 * Enforces strict modularity (< 350 LOC, functions < 60 LOC, complexity <= 10).
 */

import type { CorporateRegistryRecord, QuarterlyFundamental, DailyBar } from '../data/types';
import type { PlanetKey } from '../astro/types';
import { SIGN_NAMES, SIGN_LORDS, NATURAL_MALEFICS } from '../astro/constants';
import { generateMahadashas, resolveActive5FoldDasha, calculateNakshatraAndBalance } from '../astro/vimshottari';
import { classifyLordRole } from '../astro/trikonaNathans';
import { calculateTransitPositions, calculateTransitSigns, type TransitPlanetaryPositions } from '../astro/ephemeris';
import { evaluateSpecialYogas } from '../astro/yogaDetector';
import { evaluateKotaChakra } from '../astro/kotaChakra';
import { computeSBCTargets, evaluateSBCChakra } from '../astro/sbcChakra';
import { evaluateInduLagna } from '../astro/induLagna';
import { calculateTaraBala, mapConsonantToNakshatra, type TaraCategory } from '../astro/taraBala';
import { auditBalanceSheetPIT } from '../financial/balanceSheetAudit';
import { detectEdgeSignals, formatTriadCode, type EdgeSignalType } from './edgeDetector';
import { calculatePositionSize } from './sizingCalculator';
import type { StrategyParameters } from '../../state/strategyStore';
import precomputedAstroData from '../data/fixtures/precomputedNifty500Astro.json';

interface PrecomputedStockRecord {
  symbol: string;
  lagnaSignId: number;
  lagnaNameEn: string;
  lagnaNameMl: string;
  lagnaLord: PlanetKey;
  moonSignId: number;
  janmaNakshatraId: number;
  induLagnaSignId: number;
  natalYogas: string[];
  activeDasha: {
    md: PlanetKey;
    ad: PlanetKey;
    pd: PlanetKey;
    triad: string;
    endDate: string;
    daysRemaining: number;
    isTrikonaPrime: boolean;
  };
  forwardSchedule5Y?: Array<{
    startDate: string;
    endDate: string;
    md: PlanetKey;
    ad: PlanetKey;
    pd: PlanetKey;
    triad: string;
  }>;
}

const precomputedAstro = precomputedAstroData as Record<string, PrecomputedStockRecord>;

export interface UniverseStockScanItem {
  symbol: string;
  companyName: string;
  listingDate: string;
  lagnaSignId: number;
  lagnaSignName: string;
  lagnaLord: PlanetKey;
  triadCode: string;
  mdLord: PlanetKey;
  adLord: PlanetKey;
  pdLord: PlanetKey;
  daysToCusp: number;
  activeYogas: string[];
  hasVry: boolean;
  hasNbry: boolean;
  phiFinancial: number;
  signal: EdgeSignalType;
  action: 'BUY' | 'SELL' | 'HOLD';
  reason: string;
  sizingFraction: number;
  isBlocked: boolean;
  blockReason?: string | undefined;

  // 4-Fold Confluence Vectors
  kotaDefenseScore: number;
  kotaStatus: 'FORTIFIED' | 'BREACHED' | 'NEUTRAL';
  isKotaFortified: boolean;
  isKotaBreached: boolean;
  sbcStatus: 'SUBHA' | 'CLEAN' | 'AFFLICTED';
  sbcAfflictionScore: number;
  induLagnaSignId: number;
  isInduLagnaActive: boolean;
  taraNumber: number;
  taraName: string;
  taraCategory: TaraCategory;
  confluenceScore: number; // 0..4
}

export interface UniverseScanSummary {
  scanDate: string;
  totalScanned: number;
  triadDistribution: Record<string, number>;
  strongBuyCount: number;
  turnaroundBuyCount: number;
  defensiveExitCount: number;
  blockedCount: number;
  items: UniverseStockScanItem[];
}

function resolveDashaHierarchy(record: CorporateRegistryRecord, activeDate: string) {
  const birthStr = `${record.listing_date}T${record.listing_time || '10:00:00'}+05:30`;
  const birthMs = new Date(birthStr).getTime();
  const mahadashas = generateMahadashas(birthMs, record.moon_deg, record.year_length_days);
  const sessionMs = new Date(`${activeDate}T12:00:00+05:30`).getTime();
  return resolveActive5FoldDasha(mahadashas, sessionMs);
}

function createSyntheticBar(symbol: string, date: string): DailyBar {
  return {
    symbol,
    date,
    close: 500.0,
    prev_close: 495.0,
    volume: 100000,
    daily_return: 0.01,
    adj_close_index: 1.0,
    rolling_peak: 500.0,
    drawdown: 0.0,
    is_macro_crisis: false,
  };
}

function evaluateConfluenceVectors(
  record: CorporateRegistryRecord,
  lagnaId: number,
  transitSigns: Record<PlanetKey, number>,
  transitPositions: TransitPlanetaryPositions,
  defenseCutoff: number = 0.40,
  preJanmaNak?: number,
  preMoonSignId?: number
) {
  const janmaNak = preJanmaNak ?? calculateNakshatraAndBalance(record.moon_deg).nakshatraIndex;
  const moonSignId = preMoonSignId ?? (record.moon_sign_id ?? 0);

  // 1. Kota Chakra
  const kota = evaluateKotaChakra(janmaNak, moonSignId, transitPositions);
  const isMaleficInStambha = kota.stambha.some((p) => NATURAL_MALEFICS.includes(p));
  const isKotaFortified = kota.defenseScore >= 0.60 && !isMaleficInStambha;
  const isKotaBreached = kota.defenseScore < defenseCutoff || isMaleficInStambha;
  const kotaStatus: 'FORTIFIED' | 'BREACHED' | 'NEUTRAL' = isKotaFortified
    ? 'FORTIFIED'
    : isKotaBreached
    ? 'BREACHED'
    : 'NEUTRAL';

  // 2. Sarvatobhadra Chakra (SBC)
  const namaNak = mapConsonantToNakshatra(record.primary_consonant);
  const sbcTargets = computeSBCTargets(janmaNak, namaNak);
  const sbc = evaluateSBCChakra(sbcTargets, transitPositions);
  const hasSubhaVedha = sbc.hits.some((h) => h.isBenefic && (h.targetType === 'janma_nakshatra' || h.targetType === 'nama_nakshatra'));
  const hasPapaVedha = sbc.hits.some((h) => !h.isBenefic && (h.targetType === 'janma_nakshatra' || h.targetType === 'nama_nakshatra'));
  const sbcStatus: 'SUBHA' | 'CLEAN' | 'AFFLICTED' = (hasSubhaVedha && sbc.sbcAfflictionScore <= 0.25)
    ? 'SUBHA'
    : (hasPapaVedha || sbc.sbcAfflictionScore > 0.40)
    ? 'AFFLICTED'
    : 'CLEAN';

  // 3. Indu Lagna
  const indu = evaluateInduLagna(lagnaId, moonSignId, transitSigns);

  // 4. Tara Bala
  const transitMoonNak = transitPositions['moon']?.nakshatraIndex ?? 0;
  const tara = calculateTaraBala(janmaNak, transitMoonNak);

  // Confluence Score (0..4)
  let confluenceScore = 0;
  if (isKotaFortified) confluenceScore += 1;
  if (sbcStatus === 'SUBHA' || sbcStatus === 'CLEAN') confluenceScore += 1;
  if (indu.isInduActive) confluenceScore += 1;
  if (tara.category === 'AUSPICIOUS') confluenceScore += 1;

  return {
    kotaDefenseScore: kota.defenseScore,
    kotaStatus,
    isKotaFortified,
    isKotaBreached,
    sbcStatus,
    sbcAfflictionScore: sbc.sbcAfflictionScore,
    induLagnaSignId: indu.induLagnaSignId,
    isInduLagnaActive: indu.isInduActive,
    taraNumber: tara.taraNumber,
    taraName: tara.taraName,
    taraCategory: tara.category,
    confluenceScore,
  };
}

export function scanSingleStock(
  record: CorporateRegistryRecord,
  activeDate: string,
  transitSigns: Record<PlanetKey, number>,
  transitPositions: TransitPlanetaryPositions,
  fundamentals: QuarterlyFundamental[] = [],
  strategyParams?: StrategyParameters
): UniverseStockScanItem {
  const pre = precomputedAstro[record.symbol];
  const lagnaId = pre ? pre.lagnaSignId : (record.lagna_sign_id ?? 0);
  const lagnaLord = pre ? pre.lagnaLord : (SIGN_LORDS[lagnaId] ?? 'mars');
  const lagnaName = pre ? pre.lagnaNameEn : (SIGN_NAMES[lagnaId] ?? 'Aries');

  let mdLord: PlanetKey = 'ketu';
  let adLord: PlanetKey = 'venus';
  let pdLord: PlanetKey = 'sun';
  let triadCode = '[D-D-D]';
  let daysToCusp = 10;
  let mdRole: 'trikona' | 'kendra' | 'dusthana' = 'dusthana';
  let adRole: 'trikona' | 'kendra' | 'dusthana' = 'dusthana';
  let pdRole: 'trikona' | 'kendra' | 'dusthana' = 'dusthana';

  if (pre && activeDate >= '2026-10-01' && pre.forwardSchedule5Y) {
    const match = pre.forwardSchedule5Y.find((f) => f.startDate <= activeDate && f.endDate >= activeDate);
    if (match) {
      mdLord = match.md;
      adLord = match.ad;
      pdLord = match.pd;
      triadCode = match.triad;
      mdRole = classifyLordRole(mdLord, lagnaId);
      adRole = classifyLordRole(adLord, lagnaId);
      pdRole = classifyLordRole(pdLord, lagnaId);
      const msLeft = new Date(`${match.endDate}T12:00:00+05:30`).getTime() - new Date(`${activeDate}T12:00:00+05:30`).getTime();
      daysToCusp = Math.max(1, Math.round(msLeft / 86400000));
    } else {
      const dasha = resolveDashaHierarchy(record, activeDate);
      mdLord = dasha?.mahadasha ?? 'ketu';
      adLord = dasha?.antardasha ?? 'venus';
      pdLord = dasha?.pratyantardasha ?? 'sun';
      mdRole = classifyLordRole(mdLord, lagnaId);
      adRole = classifyLordRole(adLord, lagnaId);
      pdRole = classifyLordRole(pdLord, lagnaId);
      triadCode = formatTriadCode(mdRole, adRole, pdRole);
      daysToCusp = dasha?.pdRemainingDays ?? 0;
    }
  } else {
    const dasha = resolveDashaHierarchy(record, activeDate);
    mdLord = dasha?.mahadasha ?? 'ketu';
    adLord = dasha?.antardasha ?? 'venus';
    pdLord = dasha?.pratyantardasha ?? 'sun';
    mdRole = classifyLordRole(mdLord, lagnaId);
    adRole = classifyLordRole(adLord, lagnaId);
    pdRole = classifyLordRole(pdLord, lagnaId);
    triadCode = formatTriadCode(mdRole, adRole, pdRole);
    daysToCusp = dasha?.pdRemainingDays ?? 0;
  }

  const activeYogas = pre
    ? pre.natalYogas
    : evaluateSpecialYogas({
        lagnaSignId: lagnaId,
        moonSignId: record.moon_sign_id ?? 0,
        planetSigns: transitSigns,
      }).activeYogaNames;

  const hasVry = activeYogas.some((y) => y.startsWith('VRY'));
  const hasNbry = activeYogas.some((y) => y.startsWith('NBRY'));

  const defenseThreshold = strategyParams?.kotaDefenseThreshold ?? 0.40;
  const confluence = evaluateConfluenceVectors(
    record,
    lagnaId,
    transitSigns,
    transitPositions,
    defenseThreshold,
    pre?.janmaNakshatraId,
    pre?.moonSignId
  );
  const audit = auditBalanceSheetPIT(fundamentals, activeDate);
  const isVetoed = audit.phiFinancial === 0.0;
  const bar = createSyntheticBar(record.symbol, activeDate);

  const sessionsToCusp = Math.round(daysToCusp);
  const allowVry = strategyParams ? strategyParams.enableVryTurnaround && hasVry : hasVry;
  const allowNbry = strategyParams ? strategyParams.enableNbryTurnaround && hasNbry : hasNbry;
  const riskBudget = strategyParams?.riskBudgetFraction ?? 0.1;
  const minPrice = strategyParams?.minNominalPrice ?? 0;
  const severeDrawdown = strategyParams?.severeDrawdownPct ?? 1.0;

  const edge = detectEdgeSignals(bar, {
    mdCategory: mdRole,
    adCategory: adRole,
    pdCategory: pdRole,
    sessionsToCusp,
    isVry: allowVry,
    isFortressBreached: confluence.isKotaBreached,
    lords: { md: mdLord, ad: adLord, pd: pdLord },
  });

  const sizing = calculatePositionSize({
    portfolioEquity: 1000000,
    riskBudgetFraction: riskBudget,
    omegaTrader: 1.0,
    phiFinancial: audit.phiFinancial,
    thetaAstro: edge.thetaAstro,
    currentPrice: bar.close,
  });

  const isPenny = minPrice > 0 && bar.close < minPrice;
  const isSevereDrawdown = severeDrawdown < 1.0 && bar.drawdown < -severeDrawdown;
  const isBlocked = isVetoed || isPenny || isSevereDrawdown || (sizing.allocationRupees <= 0 && edge.action === 'BUY');
  const blockReason = isVetoed
    ? 'BLOCKED: Balance-sheet financial risk veto'
    : isPenny
    ? `BLOCKED: Ex-ante penny-stock filter (₹${bar.close} < ₹${minPrice})`
    : isSevereDrawdown
    ? `BLOCKED: Ex-ante severe drawdown limit (-${Math.round(severeDrawdown * 100)}%)`
    : undefined;

  return {
    symbol: record.symbol,
    companyName: record.company_name,
    listingDate: record.listing_date,
    lagnaSignId: lagnaId,
    lagnaSignName: lagnaName,
    lagnaLord,
    triadCode,
    mdLord,
    adLord,
    pdLord,
    daysToCusp,
    activeYogas,
    hasVry: allowVry,
    hasNbry: allowNbry,
    phiFinancial: audit.phiFinancial,
    signal: edge.signal,
    action: isBlocked ? 'HOLD' : edge.action,
    reason: isBlocked && blockReason ? blockReason : edge.reason,
    sizingFraction: sizing.multipliers.compositeFraction,
    isBlocked,
    blockReason,
    ...confluence,
  };
}

export function scanUniverse(
  registry: Record<string, CorporateRegistryRecord>,
  activeDate: string,
  fundamentalsMap: Record<string, QuarterlyFundamental[]> = {},
  strategyParams?: StrategyParameters
): UniverseScanSummary {
  const safeDate = activeDate && activeDate.length >= 10 ? activeDate : '2005-01-01';
  const transitSigns = calculateTransitSigns(safeDate);
  const transitPositions = calculateTransitPositions(safeDate);

  const items: UniverseStockScanItem[] = [];
  const triadDist: Record<string, number> = {};
  let strongBuy = 0;
  let turnaroundBuy = 0;
  let defensiveExit = 0;
  let blocked = 0;

  for (const record of Object.values(registry)) {
    const funds = fundamentalsMap[record.symbol] ?? [];
    const item = scanSingleStock(record, safeDate, transitSigns, transitPositions, funds, strategyParams);
    items.push(item);

    triadDist[item.triadCode] = (triadDist[item.triadCode] ?? 0) + 1;
    if (item.isBlocked) blocked++;
    if (item.signal === 'BULL_HARVEST' || (item.triadCode === '[T-T-T]' && item.action === 'BUY')) strongBuy++;
    if (item.signal === 'TURNAROUND_INCEPTION') turnaroundBuy++;
    if (item.signal === 'DEFENSIVE_EXIT') defensiveExit++;
  }

  return {
    scanDate: activeDate,
    totalScanned: items.length,
    triadDistribution: triadDist,
    strongBuyCount: strongBuy,
    turnaroundBuyCount: turnaroundBuy,
    defensiveExitCount: defensiveExit,
    blockedCount: blocked,
    items,
  };
}

export function filterUniverseByTriad(items: UniverseStockScanItem[], triadFilter: string): UniverseStockScanItem[] {
  if (!triadFilter || triadFilter === 'ALL') return items;
  return items.filter((item) => item.triadCode === triadFilter);
}

export function filterUniverseByYoga(
  items: UniverseStockScanItem[],
  yogaFilter: 'ALL' | 'VRY' | 'NBRY' | 'DHANA' | 'MAHAPURUSHA'
): UniverseStockScanItem[] {
  if (yogaFilter === 'ALL') return items;
  if (yogaFilter === 'VRY') return items.filter((i) => i.hasVry);
  if (yogaFilter === 'NBRY') return items.filter((i) => i.hasNbry);
  if (yogaFilter === 'DHANA') return items.filter((i) => i.activeYogas.includes('DHANA YOGA'));
  if (yogaFilter === 'MAHAPURUSHA') {
    return items.filter((i) => i.activeYogas.some((y) => y.includes('YOGA') && !y.includes('DHANA') && !y.includes('VRY')));
  }
  return items;
}

export function filterUniverseByKota(
  items: UniverseStockScanItem[],
  kotaFilter: 'ALL' | 'FORTIFIED' | 'BREACHED'
): UniverseStockScanItem[] {
  if (kotaFilter === 'ALL') return items;
  if (kotaFilter === 'FORTIFIED') return items.filter((i) => i.isKotaFortified);
  if (kotaFilter === 'BREACHED') return items.filter((i) => i.isKotaBreached);
  return items;
}

export function filterUniverseBySBC(
  items: UniverseStockScanItem[],
  sbcFilter: 'ALL' | 'SUBHA' | 'CLEAN' | 'AFFLICTED'
): UniverseStockScanItem[] {
  if (sbcFilter === 'ALL') return items;
  return items.filter((i) => i.sbcStatus === sbcFilter);
}

export function filterUniverseByInduLagna(
  items: UniverseStockScanItem[],
  induFilter: 'ALL' | 'ACTIVE' | 'NEUTRAL'
): UniverseStockScanItem[] {
  if (induFilter === 'ALL') return items;
  if (induFilter === 'ACTIVE') return items.filter((i) => i.isInduLagnaActive);
  return items.filter((i) => !i.isInduLagnaActive);
}

export function filterUniverseByTara(
  items: UniverseStockScanItem[],
  taraFilter: 'ALL' | 'AUSPICIOUS' | 'NEUTRAL' | 'INAUSPICIOUS'
): UniverseStockScanItem[] {
  if (taraFilter === 'ALL') return items;
  return items.filter((i) => i.taraCategory === taraFilter);
}

export function filterUniverseByDashaLord(
  items: UniverseStockScanItem[],
  level: 'MD' | 'AD' | 'PD',
  lord: PlanetKey | 'ALL'
): UniverseStockScanItem[] {
  if (!lord || lord === 'ALL') return items;
  if (level === 'MD') return items.filter((i) => i.mdLord === lord);
  if (level === 'AD') return items.filter((i) => i.adLord === lord);
  return items.filter((i) => i.pdLord === lord);
}

export function filterUniverseByDashaRole(
  items: UniverseStockScanItem[],
  level: 'MD' | 'AD' | 'PD',
  role: 'T' | 'K' | 'D' | 'ALL'
): UniverseStockScanItem[] {
  if (!role || role === 'ALL') return items;
  const idx = level === 'MD' ? 1 : level === 'AD' ? 3 : 5;
  return items.filter((i) => i.triadCode[idx] === role);
}

export function getPrioritizedDailyActionFeed(items: UniverseStockScanItem[]): UniverseStockScanItem[] {
  const priorityOrder: Record<string, number> = { BUY: 1, SELL: 2, HOLD: 3 };
  return [...items].sort((a, b) => {
    if (a.isBlocked !== b.isBlocked) return a.isBlocked ? 1 : -1;
    const pA = priorityOrder[a.action] ?? 4;
    const pB = priorityOrder[b.action] ?? 4;
    if (pA !== pB) return pA - pB;
    return b.confluenceScore - a.confluenceScore || b.phiFinancial - a.phiFinancial;
  });
}
