/**
 * packages/simulator/src/core/engine/universeFilters.ts
 * Filtering functions for Market Universe Radar and Screener metrics.
 * Enforces strict modularity (< 200 LOC, functions < 60 LOC, complexity <= 10).
 */

import type { PlanetKey } from '../astro/types';
import type { UniverseStockScanItem } from './universeScanner';

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

export function filterUniverseByIngress(
  items: UniverseStockScanItem[],
  maxDays: number = 14
): UniverseStockScanItem[] {
  return items.filter(
    (i) => i.upcomingIngress && i.upcomingIngress.isAuspicious && i.upcomingIngress.daysUntil <= maxDays
  );
}

