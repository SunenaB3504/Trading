import type { Bucket } from '../domain/enums';
import { canonicalJson, sha256Hex } from '../hash';

/**
 * Objective, astro-blind bucket rules (SSD §10.2, D35). Every field is a market or reference fact known
 * before the window start; nothing here may import an astro module (the dependency rules enforce it).
 */
export interface BucketRules {
  version: string;
  /** Trailing sessions used for volatility and beta. */
  lookbackSessions: number;
  speculative: { minBeta: number; maxBandPct: number; minGsmStage: number };
  /** AMFI rank at or below this is the large-cap group (proxy for the Nifty 50 until constituents are sourced). */
  steadyMaxRank: number;
  /** AMFI rank at or above this is the small-cap group. */
  underdogsMinRank: number;
  /** Share of each size group counted as low volatility. */
  lowVolFraction: number;
  cyclicalsSectors: readonly string[];
  mundaneSectors: readonly string[];
}

export const BUCKET_RULES_V1: BucketRules = {
  version: 'bucket-v1',
  lookbackSessions: 252,
  speculative: { minBeta: 1.5, maxBandPct: 5, minGsmStage: 1 },
  steadyMaxRank: 100,
  underdogsMinRank: 251,
  lowVolFraction: 1 / 3,
  cyclicalsSectors: [
    'agrochemicals_pesticides',
    'fertilisers',
    'sugar_distilleries',
    'seeds_plantations',
    'renewable_energy',
  ],
  mundaneSectors: [
    'defence_aerospace',
    'oil_gas_upstream_refining',
    'shipping_maritime',
    'strategic_metals_mining',
  ],
};

export const bucketRulesHash = (rules: BucketRules): string => sha256Hex(canonicalJson(rules));

/** Facts at the window start. A null means "not known", which is reported, never read as "no". */
export interface BucketInputs {
  instrumentId: string;
  asOf: string;
  /** Rank in the newest AMFI list usable on `asOf`; null when no list applies (before 2018). */
  amfiRank: number | null;
  /** True when the instrument is in the lowest volatility fraction of its size group (see `lowestFraction`). */
  lowVolatility: boolean | null;
  beta: number | null;
  /** Stage from the GSM list, 0 meaning shortlisted only. */
  gsmStage: number | null;
  /** Any ASM stage; null when ASM was not recorded for the date. */
  asmStage: number | null;
  asmKnown: boolean;
  bandPct: number | null;
  /** True when a security list covered the date, so a null band means "No Band" and not "unknown". */
  bandKnown: boolean;
  /** Registered sector tag from the frozen sector table. */
  sector: string | null;
}

export interface BucketResult {
  instrumentId: string;
  asOf: string;
  bucket: Bucket | null;
  ruleVersion: string;
  rulesHash: string;
  inputsHash: string;
  /** Rule tests that were true. */
  reasons: string[];
  /** Inputs that were unknown, so the rule was applied only in part. */
  partial: string[];
}

const q = (x: number | null): number | null => (x === null ? null : Math.round(x * 1e6) / 1e6);

function speculativeReasons(i: BucketInputs, r: BucketRules['speculative']): string[] {
  const out: string[] = [];
  if (i.beta !== null && i.beta >= r.minBeta) out.push('beta');
  if (i.gsmStage !== null && i.gsmStage >= r.minGsmStage) out.push('gsm');
  if (i.asmStage !== null) out.push('asm');
  if (i.bandPct !== null && i.bandPct <= r.maxBandPct) out.push('narrow_band');
  return out;
}

function partialOf(i: BucketInputs): string[] {
  const out: string[] = [];
  if (i.amfiRank === null) out.push('size_unknown');
  if (i.lowVolatility === null) out.push('volatility_unknown');
  if (i.beta === null) out.push('beta_unknown');
  if (!i.bandKnown) out.push('band_unknown');
  if (!i.asmKnown) out.push('asm_unknown');
  if (i.sector === null) out.push('sector_unknown');
  return out;
}

type Rule = (i: BucketInputs, r: BucketRules) => string[];

const inSectors = (sector: string | null, list: readonly string[]): boolean =>
  sector !== null && list.includes(sector);

const isSmallCap = (i: BucketInputs, r: BucketRules): boolean =>
  i.amfiRank !== null && i.amfiRank >= r.underdogsMinRank;

const isLargeCap = (i: BucketInputs, r: BucketRules): boolean =>
  i.amfiRank !== null && i.amfiRank <= r.steadyMaxRank;

/** Buckets in order of precedence, each with the test that returns why it applies (empty if it does not). */
const ORDER: ReadonlyArray<readonly [Bucket, Rule]> = [
  ['speculative', (i, r) => speculativeReasons(i, r.speculative)],
  ['mundane', (i, r) => (inSectors(i.sector, r.mundaneSectors) ? [`sector:${i.sector}`] : [])],
  ['cyclicals', (i, r) => (inSectors(i.sector, r.cyclicalsSectors) ? [`sector:${i.sector}`] : [])],
  [
    'underdogs',
    (i, r) => (isSmallCap(i, r) && i.lowVolatility === true ? ['small_cap', 'low_volatility'] : []),
  ],
  [
    'steady',
    (i, r) => (isLargeCap(i, r) && i.lowVolatility === true ? ['large_cap', 'low_volatility'] : []),
  ],
];

/**
 * Precedence: speculative, then mundane, then cyclicals, then underdogs, then steady. A name that
 * meets no rule gets no bucket. Unknown inputs never count as met, and are listed in `partial`.
 */
export function assignBucket(i: BucketInputs, rules: BucketRules = BUCKET_RULES_V1): BucketResult {
  let bucket: Bucket | null = null;
  let reasons: string[] = [];
  for (const [name, test] of ORDER) {
    reasons = test(i, rules);
    if (reasons.length > 0) {
      bucket = name;
      break;
    }
  }
  return {
    instrumentId: i.instrumentId,
    asOf: i.asOf,
    bucket,
    ruleVersion: rules.version,
    rulesHash: bucketRulesHash(rules),
    inputsHash: sha256Hex(canonicalJson({ ...i, beta: q(i.beta) })),
    reasons,
    partial: partialOf(i),
  };
}

/**
 * The ids in the lowest `fraction` of a group by value, ties at the cut-off included. A group of fewer
 * than three has no tercile and returns nothing.
 */
export function lowestFraction(values: ReadonlyMap<string, number>, fraction: number): Set<string> {
  const sorted = [...values.entries()].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
  if (sorted.length < 3) return new Set();
  const cut = (sorted[Math.ceil(sorted.length * fraction) - 1] as [string, number])[1];
  return new Set(sorted.filter(([, v]) => v <= cut).map(([id]) => id));
}
