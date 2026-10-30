/**
 * packages/simulator/src/core/data/ingestion/stockIngestionEngine.ts
 * Core engine for self-service stock ingestion & corporate calibration.
 * Enforces strict modularity (< 300 LOC, functions < 60 LOC).
 */

import type { CorporateRegistryRecord, DailyBar } from '../types';
import corporateRegistryData from '../corporateRegistry.json';
import nifty500PricesData from '../fixtures/nifty500Prices.json';
import recentOhlcCacheData from '../fixtures/recentOhlcCache.json';
import { calculateNakshatraAndBalance } from '../../astro/vimshottari';
import { VIMSHOTTARI_YEARS } from '../../astro/constants';
import type { PlanetKey } from '../../astro/types';

const corporateRegistry = corporateRegistryData as Record<string, CorporateRegistryRecord>;
const nifty500Prices = nifty500PricesData as Record<string, number>;
const recentOhlcCache = recentOhlcCacheData as Record<string, Record<string, {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}>>;

export interface RawCsvBarInput {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IngestionPreviewResult {
  symbol: string;
  companyName: string;
  listingDate: string;
  listingTime: string;
  janmaNakshatra: string;
  moonSignId: number;
  birthMdLord: PlanetKey;
  balanceYears: number;
  theoreticalStartMs: number;
  totalBars: number;
  firstDate: string;
  lastDate: string;
  lastClose: number;
  splitAdjustmentsApplied: number;
}

export function parseRawCsvText(csvText: string): RawCsvBarInput[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0]!.toLowerCase().split(',').map((h) => h.trim());
  const dateIdx = header.findIndex((h) => h.includes('date'));
  const openIdx = header.findIndex((h) => h.includes('open'));
  const highIdx = header.findIndex((h) => h.includes('high'));
  const lowIdx = header.findIndex((h) => h.includes('low'));
  const closeIdx = header.findIndex((h) => h.includes('close'));
  const volIdx = header.findIndex((h) => h.includes('vol'));

  if (dateIdx === -1 || closeIdx === -1) {
    throw new Error('CSV must contain at least Date and Close columns');
  }

  const rawBars: RawCsvBarInput[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i]!.split(',').map((cell) => cell.trim());
    if (row.length <= closeIdx) continue;

    const date = row[dateIdx]!;
    const close = parseFloat(row[closeIdx]!) || 0;
    if (!date || close <= 0) continue;

    const open = openIdx >= 0 ? parseFloat(row[openIdx]!) || close : close;
    const high = highIdx >= 0 ? parseFloat(row[highIdx]!) || Math.max(open, close) : Math.max(open, close);
    const low = lowIdx >= 0 ? parseFloat(row[lowIdx]!) || Math.min(open, close) : Math.min(open, close);
    const volume = volIdx >= 0 ? parseInt(row[volIdx]!, 10) || 10000 : 10000;

    rawBars.push({ date, open, high, low, close, volume });
  }

  return rawBars.sort((a, b) => a.date.localeCompare(b.date));
}

export function processAndCompoundDailyBars(
  symbol: string,
  rawBars: RawCsvBarInput[]
): { bars: DailyBar[]; splitCount: number } {
  if (rawBars.length === 0) return { bars: [], splitCount: 0 };

  // Append recent Bhavcopy sessions if missing
  const barMap = new Map<string, RawCsvBarInput>();
  rawBars.forEach((b) => barMap.set(b.date, b));

  const sortedDates = Object.keys(recentOhlcCache).sort();
  for (const dateStr of sortedDates) {
    const session = recentOhlcCache[dateStr]?.[symbol];
    if (session && session.close > 0) {
      barMap.set(dateStr, {
        date: dateStr,
        open: session.open,
        high: session.high,
        low: session.low,
        close: session.close,
        volume: session.volume,
      });
    }
  }

  const combined = Array.from(barMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  const result: DailyBar[] = [];
  let growthIdx = 1.0;
  let rollingPeak = 1.0;
  let prevClose = combined[0]!.open || combined[0]!.close;
  let splitCount = 0;

  for (let i = 0; i < combined.length; i++) {
    const raw = combined[i]!;
    const rawRet = prevClose > 0 ? (raw.close - prevClose) / prevClose : 0;
    let dailyRet = Math.round(rawRet * 10000) / 10000;

    // Detect unadjusted split/bonus
    if (prevClose > 0 && raw.close > 0 && rawRet < -0.35 && prevClose / raw.close >= 1.4) {
      const factor = Math.round(prevClose / raw.close);
      if (factor >= 2) {
        dailyRet = Math.round(((raw.close * factor - prevClose) / prevClose) * 10000) / 10000;
        splitCount++;
      }
    }

    growthIdx = Math.round(growthIdx * (1.0 + dailyRet) * 10000) / 10000;
    if (growthIdx > rollingPeak) rollingPeak = growthIdx;
    const drawdown = Math.round(((growthIdx - rollingPeak) / rollingPeak) * 10000) / 10000;

    result.push({
      symbol,
      date: raw.date,
      close: raw.close,
      prev_close: prevClose,
      open: raw.open,
      high: raw.high,
      low: raw.low,
      volume: raw.volume,
      daily_return: dailyRet,
      adj_close_index: growthIdx,
      rolling_peak: rollingPeak,
      drawdown,
      is_macro_crisis: false,
    });

    prevClose = raw.close;
  }

  return { bars: result, splitCount };
}

export function buildNatalPreview(
  symbol: string,
  customListingDate?: string,
  customListingTime?: string
): IngestionPreviewResult {
  const norm = symbol.trim().toUpperCase();
  const existingMeta = corporateRegistry[norm];

  const listingDate = customListingDate || existingMeta?.listing_date || '2015-01-01';
  const listingTime = customListingTime || existingMeta?.listing_time || '10:00:00';
  const moonSign1Based = existingMeta?.moon_sign_id ?? 1;
  const moonDeg = existingMeta?.moon_deg ?? 15.0;
  const absMoonLong = (((moonSign1Based - 1) * 30.0) + moonDeg) % 360.0;

  const { startingLord, balanceYears } = calculateNakshatraAndBalance(absMoonLong);
  const birthStr = `${listingDate}T${listingTime}+05:30`;
  const birthMs = new Date(birthStr).getTime();
  const fullYears = VIMSHOTTARI_YEARS[startingLord] ?? 7;
  const elapsedYears = fullYears - balanceYears;
  const msPerYear = 365.2425 * 86400000;
  const theoreticalStartMs = birthMs - elapsedYears * msPerYear;

  const cmp = nifty500Prices[norm] ?? 500.0;

  return {
    symbol: norm,
    companyName: existingMeta?.company_name || norm,
    listingDate,
    listingTime,
    janmaNakshatra: existingMeta?.moon_nakshatra || 'Ashwini',
    moonSignId: moonSign1Based,
    birthMdLord: startingLord,
    balanceYears: Math.round(balanceYears * 100) / 100,
    theoreticalStartMs,
    totalBars: 0,
    firstDate: listingDate,
    lastDate: '2026-10-28',
    lastClose: cmp,
    splitAdjustmentsApplied: 0,
  };
}

