import { ELIGIBILITY_V1, assignBucket, evaluateEligibility } from '@trading/core';
import type { RuleId } from '@trading/core';
import type { UniverseEntry } from './types';

export interface RuleLine {
  rule: RuleId;
  pass: boolean;
  text: string;
  assumed: boolean;
}

export interface UniverseRow {
  symbol: string;
  name: string;
  eligible: boolean;
  /** The first rule that failed with its reason, or null when eligible (SSD §10.1). */
  firstFailure: string | null;
  rules: RuleLine[];
  /** Series, band and surveillance, in words. */
  flags: string[];
  bucket: string;
  bucketWhy: string;
  /** Inputs the bucket rule could not use. */
  gaps: string[];
}

export type Filter = 'all' | 'eligible' | 'not_eligible';

const GAP_TEXT: Record<string, string> = {
  size_unknown: 'size rank not available for this date',
  volatility_unknown: 'volatility needs price history',
  beta_unknown: 'beta needs price history and the index',
  band_unknown: 'price band not recorded',
  asm_unknown: 'ASM list is recorded only from the day capture began',
  sector_unknown: 'no sector tag',
};

function flagsOf(e: UniverseEntry): string[] {
  const s = e.status;
  const out = [`series ${s.series}`];
  out.push(s.bandPct === null ? 'no fixed price band' : `price band ${s.bandPct}%`);
  if (s.tradeForTrade) out.push('trade-for-trade');
  if (s.gsmStage !== null)
    out.push(`GSM stage ${s.gsmStage}${s.gsmStage === 0 ? ' (shortlisted only)' : ''}`);
  out.push('ASM status not recorded');
  return out;
}

function bucketText(e: UniverseEntry): Pick<UniverseRow, 'bucket' | 'bucketWhy' | 'gaps'> {
  const r = assignBucket(e.bucket);
  return {
    bucket: r.bucket ?? 'none',
    bucketWhy:
      r.bucket === null
        ? 'no bucket rule was met with the inputs known'
        : r.reasons.join(', ').replace(/_/g, ' '),
    gaps: r.partial.map((p) => GAP_TEXT[p] ?? p),
  };
}

/** Eligibility, bucket and status of each instrument as readable rows (UC1, FR-U6, FR-U7). */
export function toUniverseRows(
  entries: readonly UniverseEntry[],
  filter: Filter = 'all',
): UniverseRow[] {
  return entries
    .map((e): UniverseRow => {
      const el = evaluateEligibility(e.facts, ELIGIBILITY_V1);
      return {
        symbol: e.symbol,
        name: e.name,
        eligible: el.eligible,
        firstFailure:
          el.firstFailure === null ? null : `${el.firstFailure.rule}: ${el.firstFailure.reason}`,
        rules: el.results.map((r) => ({
          rule: r.rule,
          pass: r.pass,
          text: r.reason,
          assumed: e.assumed.includes(r.rule),
        })),
        flags: flagsOf(e),
        ...bucketText(e),
      };
    })
    .filter((r) => filter === 'all' || (filter === 'eligible') === r.eligible);
}
