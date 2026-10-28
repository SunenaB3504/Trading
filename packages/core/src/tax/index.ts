/**
 * Tax report per financial year (MIP v4.1 Stage 9). Pure functions over closed round trips. Rates and rules are the
 * ones in Investor Guide 2 §6, stored once with an as-of date; the result is an indication for learning, not tax
 * advice. Slab-rate income is shown but not taxed here, because the slab depends on the person's other income.
 */
export const TAX_FACTS_AS_OF = '2026-10-24';

export const TAX_FACTS = {
  stcgBps: 2_000,
  ltcgBps: 1_250,
  /** Long-term gains up to this much a year are exempt (₹1,25,000). */
  ltcgExemptPaise: 12_500_000,
  cessBps: 400,
  /** Held for more than this many months counts as long-term. */
  longTermMonths: 12,
  carryForwardYears: 8,
  speculativeCarryForwardYears: 4,
  sttDeliveryPpm: 1_000,
  sttIntradaySellPpm: 250,
} as const;

/** `kind`: shares and equity funds or ETFs (capital gains), other assets taxed at the slab rate, or F&O (business income). */
export type TaxKind = 'equity' | 'slab_asset' | 'derivative';

export interface TaxTrade {
  id: string;
  label: string;
  kind: TaxKind;
  openedOn: string;
  closedOn: string;
  /** Sale proceeds less cost of acquisition, before charges. */
  grossPaise: number;
  /** All charges on the round trip, STT included. */
  chargesPaise: number;
  sttPaise: number;
}

/** The financial year (April to March) a date falls in, such as `2025-26`. */
export function financialYear(date: string): string {
  const y = Number(date.slice(0, 4));
  const start = Number(date.slice(5, 7)) >= 4 ? y : y - 1;
  return `${String(start)}-${String((start + 1) % 100).padStart(2, '0')}`;
}

/** Date `months` later, the same day of the month (the last day if the month is shorter). */
export function addMonths(date: string, months: number): string {
  const total = Number(date.slice(0, 4)) * 12 + (Number(date.slice(5, 7)) - 1) + months;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const d = Math.min(Number(date.slice(8, 10)), last);
  return `${String(y)}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export type TaxClass = 'stcg' | 'ltcg' | 'speculative' | 'business' | 'slab';

export function classify(t: TaxTrade): TaxClass {
  if (t.kind === 'derivative') return 'business';
  if (t.kind === 'slab_asset') return 'slab';
  if (t.openedOn === t.closedOn) return 'speculative';
  return t.closedOn > addMonths(t.openedOn, TAX_FACTS.longTermMonths) ? 'ltcg' : 'stcg';
}

/** Delivery STT on both legs, or the sell side only for a same-day trade. Charges are not split by tax in the ledger. */
export const estimateStt = (basisPaise: number, proceedsPaise: number, sameDay: boolean): number =>
  sameDay ? Math.round((proceedsPaise * TAX_FACTS.sttIntradaySellPpm) / 1_000_000) : Math.round(((basisPaise + proceedsPaise) * TAX_FACTS.sttDeliveryPpm) / 1_000_000);

/** What counts for the tax: capital gains and slab gains do not deduct STT; business income does. */
export function taxableOf(t: TaxTrade): number {
  const c = classify(t);
  const deductible = c === 'business' || c === 'speculative' ? t.chargesPaise : t.chargesPaise - t.sttPaise;
  return t.grossPaise - deductible;
}

export interface BroughtForward {
  /** Unused losses from earlier years, as positive amounts. */
  shortTermPaise: number;
  longTermPaise: number;
}

export interface TaxReport {
  year: string;
  trades: number;
  stcgPaise: number;
  ltcgPaise: number;
  /** Net short-term and long-term gains after set-off of losses (never below zero). */
  stcgAfterSetOffPaise: number;
  ltcgAfterSetOffPaise: number;
  ltcgExemptPaise: number;
  stcgTaxablePaise: number;
  ltcgTaxablePaise: number;
  stcgTaxPaise: number;
  ltcgTaxPaise: number;
  cessPaise: number;
  capitalGainsTaxPaise: number;
  /** Losses left over to carry forward, as positive amounts. */
  carryShortTermPaise: number;
  carryLongTermPaise: number;
  speculativePaise: number;
  businessPaise: number;
  slabGainPaise: number;
  sttPaise: number;
  chargesPaise: number;
}

const pct = (x: number, bps: number): number => Math.round((x * bps) / 10_000);
const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

/** Short-term loss sets off short-term then long-term gains; long-term loss only long-term gains. */
export function setOff(st: number, lt: number): { st: number; lt: number; carryShort: number; carryLong: number } {
  if (st < 0) {
    const left = lt + st;
    return left >= 0 ? { st: 0, lt: left, carryShort: 0, carryLong: 0 } : { st: 0, lt: 0, carryShort: lt > 0 ? -left : -st, carryLong: lt < 0 ? -lt : 0 };
  }
  if (lt < 0) return { st, lt: 0, carryShort: 0, carryLong: -lt };
  return { st, lt, carryShort: 0, carryLong: 0 };
}

/** The report for one financial year (a trade belongs to the year it was closed in). */
export function taxReport(all: readonly TaxTrade[], year: string, brought: BroughtForward = { shortTermPaise: 0, longTermPaise: 0 }): TaxReport {
  const mine = all.filter((t) => financialYear(t.closedOn) === year);
  const by = (c: TaxClass): number[] => mine.filter((t) => classify(t) === c).map(taxableOf);
  const stcg = sum(by('stcg'));
  const ltcg = sum(by('ltcg'));
  const s = setOff(stcg - brought.shortTermPaise, ltcg - brought.longTermPaise);
  const exempt = Math.min(s.lt, TAX_FACTS.ltcgExemptPaise);
  const stTaxable = s.st;
  const ltTaxable = s.lt - exempt;
  const stTax = pct(stTaxable, TAX_FACTS.stcgBps);
  const ltTax = pct(ltTaxable, TAX_FACTS.ltcgBps);
  const cess = pct(stTax + ltTax, TAX_FACTS.cessBps);
  return {
    year, trades: mine.length, stcgPaise: stcg, ltcgPaise: ltcg, stcgAfterSetOffPaise: s.st, ltcgAfterSetOffPaise: s.lt, ltcgExemptPaise: exempt,
    stcgTaxablePaise: stTaxable, ltcgTaxablePaise: ltTaxable, stcgTaxPaise: stTax, ltcgTaxPaise: ltTax, cessPaise: cess, capitalGainsTaxPaise: stTax + ltTax + cess,
    carryShortTermPaise: s.carryShort, carryLongTermPaise: s.carryLong,
    speculativePaise: sum(by('speculative')), businessPaise: sum(by('business')), slabGainPaise: sum(by('slab')),
    sttPaise: sum(mine.map((t) => t.sttPaise)), chargesPaise: sum(mine.map((t) => t.chargesPaise)),
  };
}

/** The financial years that have at least one closed trade, newest first. */
export const taxYears = (all: readonly TaxTrade[]): string[] => [...new Set(all.map((t) => financialYear(t.closedOn)))].sort().reverse();
