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
  transitPositions: TransitPlanetaryPositions
) {
  const janmaNak = calculateNakshatraAndBalance(record.moon_deg).nakshatraIndex;
  const moonSignId = record.moon_sign_id ?? 0;

  // 1. Kota Chakra
  const kota = evaluateKotaChakra(janmaNak, moonSignId, transitPositions);
  const isMaleficInStambha = kota.stambha.some((p) => NATURAL_MALEFICS.includes(p));
  const isKotaFortified = kota.defenseScore >= 0.60 && !isMaleficInStambha;
  const isKotaBreached = kota.defenseScore < 0.40 || isMaleficInStambha;
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
  fundamentals: QuarterlyFundamental[] = []
): UniverseStockScanItem {
  const lagnaId = record.lagna_sign_id ?? 0;
  const lagnaLord = SIGN_LORDS[lagnaId] ?? 'mars';
  const lagnaName = SIGN_NAMES[lagnaId] ?? 'Aries';

  const dasha = resolveDashaHierarchy(record, activeDate);
  const mdLord = dasha?.mahadasha ?? 'ketu';
  const adLord = dasha?.antardasha ?? 'venus';
  const pdLord = dasha?.pratyantardasha ?? 'sun';

  const mdRole = classifyLordRole(mdLord, lagnaId);
  const adRole = classifyLordRole(adLord, lagnaId);
  const pdRole = classifyLordRole(pdLord, lagnaId);
  const triadCode = formatTriadCode(mdRole, adRole, pdRole);

  const navSigns: Partial<Record<PlanetKey, number>> = {};
  for (const [p, pos] of Object.entries(transitPositions) as [PlanetKey, { navamshaSignIndex: number }][]) {
    navSigns[p] = pos.navamshaSignIndex;
  }

  const yogas = evaluateSpecialYogas({
    lagnaSignId: lagnaId,
    moonSignId: record.moon_sign_id ?? 0,
    planetSigns: transitSigns,
    navamshaSigns: navSigns,
  });

  const confluence = evaluateConfluenceVectors(record, lagnaId, transitSigns, transitPositions);
  const audit = auditBalanceSheetPIT(fundamentals, activeDate);
  const isVetoed = audit.phiFinancial === 0.0;
  const bar = createSyntheticBar(record.symbol, activeDate);

  const edge = detectEdgeSignals(bar, {
    mdCategory: mdRole,
    adCategory: adRole,
    pdCategory: pdRole,
    sessionsToCusp: Math.min(dasha?.pdRemainingDays ?? 5, 10),
    isVry: yogas.vry.hasVry,
    isFortressBreached: confluence.isKotaBreached,
    lords: { md: mdLord, ad: adLord, pd: pdLord },
  });

  const sizing = calculatePositionSize({
    portfolioEquity: 1000000,
    riskBudgetFraction: 0.1,
    omegaTrader: 1.0,
    phiFinancial: audit.phiFinancial,
    thetaAstro: edge.thetaAstro,
    currentPrice: bar.close,
  });

  const isBlocked = isVetoed || sizing.allocationRupees <= 0 && edge.action === 'BUY';
  const blockReason = isVetoed ? 'BLOCKED: Balance-sheet financial risk veto' : undefined;

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
    daysToCusp: dasha?.pdRemainingDays ?? 0,
    activeYogas: yogas.activeYogaNames,
    hasVry: yogas.vry.hasVry,
    hasNbry: yogas.nbry.hasNbry,
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
  fundamentalsMap: Record<string, QuarterlyFundamental[]> = {}
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
    const item = scanSingleStock(record, safeDate, transitSigns, transitPositions, funds);
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
