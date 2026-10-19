import { canonicalJson, sha256Hex } from '../hash';

/**
 * Eligibility thresholds (SSD §10.1), frozen and hashed before any data is pulled (principle 5).
 * Changing any value changes `configHash`, so a universe can always be tied to the rules that built it.
 */
export interface EligibilityConfig {
  version: string;
  /** E1: NSE series that make up the main board (SME and debt series are out). */
  mainBoardSeries: readonly string[];
  /** E2: sessions of history required before the window starts (also the volatility warm-up). */
  warmUpSessions: number;
  /** E5: median daily traded value, in paise, over the lookback; "at least" this much. */
  minMedianTradedValuePaise: number;
  /** E6: most sessions without a bar tolerated in the lookback (suspension or halt). */
  maxMissingSessions: number;
  /** E7: share of sessions that two providers must both cover. */
  minProviderCoverage: number;
}

/** Proposed defaults [D]: Rs 5 crore median value (about 1,000 main-board names on 2025-10-16). */
export const ELIGIBILITY_V1: EligibilityConfig = {
  version: 'elig-v1',
  mainBoardSeries: ['EQ', 'BE', 'BZ'],
  warmUpSessions: 60,
  minMedianTradedValuePaise: 5_000_000_000,
  maxMissingSessions: 5,
  minProviderCoverage: 0.98,
};

export const configHash = (c: EligibilityConfig): string => sha256Hex(canonicalJson(c));

/** What is known about one instrument at the start of the evaluation window (point in time). */
export interface InstrumentFacts {
  instrumentId: string;
  /** NSE series on the last session before the window; null if it did not trade. */
  series: string | null;
  /** Listing date when sourced from the exchange, else null. */
  listingDate: string | null;
  /** First session in our data. */
  firstSeen: string;
  /** First session our data covers at all (so `firstSeen === dataStart` means "listed before that"). */
  dataStart: string;
  sessionsBeforeStart: number;
  /** Median of close x volume over the lookback, in paise; null if too few sessions to say. */
  medianTradedValuePaise: number | null;
  /** Sessions in the lookback with no bar. */
  missingSessions: number;
  /** A merger, demerger or amalgamation already announced to take effect inside the window. */
  knownMergerInWindow: boolean;
  /** Share of sessions covered by two providers; null if not measured. */
  providerCoverage: number | null;
}

export type RuleId = 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7';

export interface RuleResult {
  rule: RuleId;
  pass: boolean;
  reason: string;
}

export interface EligibilityResult {
  instrumentId: string;
  eligible: boolean;
  /** The first rule in order E1 to E7 that failed, recorded with its reason (§10.1). */
  firstFailure: RuleResult | null;
  results: RuleResult[];
  /** Things to carry forward without failing the instrument. */
  flags: string[];
  configHash: string;
}

const res = (rule: RuleId, pass: boolean, reason: string): RuleResult => ({ rule, pass, reason });

function e1(f: InstrumentFacts, c: EligibilityConfig): RuleResult {
  if (f.series === null) return res('E1', false, 'did not trade before the window');
  return c.mainBoardSeries.includes(f.series)
    ? res('E1', true, `main-board series ${f.series}`)
    : res('E1', false, `series ${f.series} is not on the main board (SME, debt or other)`);
}

const e2 = (f: InstrumentFacts, c: EligibilityConfig): RuleResult =>
  f.sessionsBeforeStart >= c.warmUpSessions
    ? res('E2', true, `${String(f.sessionsBeforeStart)} sessions of history`)
    : res(
        'E2',
        false,
        `${String(f.sessionsBeforeStart)} sessions of history, ${String(c.warmUpSessions)} needed`,
      );

const e3 = (f: InstrumentFacts): RuleResult =>
  f.knownMergerInWindow
    ? res('E3', false, 'a merger, demerger or amalgamation is known to take effect in the window')
    : res('E3', true, 'no known merger or demerger in the window');

const e4 = (): RuleResult =>
  res('E4', true, 'splits, bonuses and renames are allowed (adjusted prices, name history)');

/** A rupee amount in words a person reads: crore above one crore, lakh above one lakh, else rupees. */
export function rupeesInWords(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 10_000_000) return `₹${(rupees / 10_000_000).toFixed(2)} crore`;
  if (rupees >= 100_000) return `₹${(rupees / 100_000).toFixed(2)} lakh`;
  return `₹${rupees.toFixed(2)}`;
}

function e5(f: InstrumentFacts, c: EligibilityConfig): RuleResult {
  if (f.medianTradedValuePaise === null)
    return res('E5', false, 'too few sessions to measure liquidity');
  return f.medianTradedValuePaise >= c.minMedianTradedValuePaise
    ? res('E5', true, `median traded value ${rupeesInWords(f.medianTradedValuePaise)}`)
    : res(
        'E5',
        false,
        `median traded value ${rupeesInWords(f.medianTradedValuePaise)} is below ${rupeesInWords(c.minMedianTradedValuePaise)}`,
      );
}

const e6 = (f: InstrumentFacts, c: EligibilityConfig): RuleResult =>
  f.missingSessions <= c.maxMissingSessions
    ? res('E6', true, `${String(f.missingSessions)} sessions without a bar`)
    : res(
        'E6',
        false,
        `${String(f.missingSessions)} sessions without a bar, at most ${String(c.maxMissingSessions)} allowed`,
      );

function e7(f: InstrumentFacts, c: EligibilityConfig): RuleResult {
  if (f.providerCoverage === null) return res('E7', false, 'provider coverage not measured');
  return f.providerCoverage >= c.minProviderCoverage
    ? res(
        'E7',
        true,
        `two providers cover ${String(Math.round(f.providerCoverage * 1000) / 10)}% of sessions`,
      )
    : res(
        'E7',
        false,
        `two providers cover only ${String(Math.round(f.providerCoverage * 1000) / 10)}% of sessions`,
      );
}

function flagsFor(f: InstrumentFacts): string[] {
  const flags: string[] = [];
  if (f.listingDate === null) flags.push('time_assumed');
  if (f.firstSeen === f.dataStart) flags.push('listing_date_before_data_start');
  flags.push('surveillance_status_not_recorded');
  return flags;
}

/**
 * Applies E1 to E7 to one instrument (SSD §10.1). Every rule is evaluated and reported; the first
 * failure in order is recorded. Surveillance and narrow price bands do not fail an instrument (E6
 * allows them) but are flagged until their status is recorded (FR-U7). An instrument without a
 * sourced first-trade timestamp passes but is flagged `time_assumed`, which keeps it out of
 * confirmatory chart-based tests.
 */
export function evaluateEligibility(
  f: InstrumentFacts,
  config: EligibilityConfig = ELIGIBILITY_V1,
): EligibilityResult {
  const results = [
    e1(f, config),
    e2(f, config),
    e3(f),
    e4(),
    e5(f, config),
    e6(f, config),
    e7(f, config),
  ];
  const firstFailure = results.find((r) => !r.pass) ?? null;
  return {
    instrumentId: f.instrumentId,
    eligible: firstFailure === null,
    firstFailure,
    results,
    flags: flagsFor(f),
    configHash: configHash(config),
  };
}
