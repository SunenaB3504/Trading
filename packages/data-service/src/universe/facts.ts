import { mulPaise, previousRegularTradingDay } from '@trading/core';
import type { BarUnadj, EligibilityConfig, InstrumentFacts } from '@trading/core';

export interface FactsInput {
  instrumentId: string;
  /** Canonical unadjusted bars, ascending. */
  bars: readonly BarUnadj[];
  /** NSE series on the last session before the window, or null if it did not trade. */
  latestSeries: string | null;
  /** First session our data covers at all. */
  dataStart: string;
  /** First day of the evaluation window; everything is measured strictly before it. */
  windowStart: string;
  listingDate: string | null;
  knownMergerInWindow: boolean;
  providerCoverage: number | null;
}

/** The `count` regular sessions before `windowStart`, newest first; stops at the calendar's start. */
function lookbackDates(windowStart: string, count: number): string[] {
  const out: string[] = [];
  let d = windowStart;
  try {
    for (let i = 0; i < count; i += 1) {
      d = previousRegularTradingDay(d);
      out.push(d);
    }
  } catch {
    /* reached the start of the supported calendar */
  }
  return out;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1
    ? (s[mid] as number)
    : Math.round(((s[mid - 1] as number) + (s[mid] as number)) / 2);
}

/**
 * Measures an instrument as it stood at the start of the window, using only earlier data
 * (point in time, SSD principle 3). Liquidity is the median of close x volume over the lookback,
 * an approximation of the exchange's traded value; a session before the first listing is not a
 * missing session.
 */
export function buildFacts(input: FactsInput, config: EligibilityConfig): InstrumentFacts {
  const first = input.bars[0];
  if (first === undefined) throw new Error(`no bars for ${input.instrumentId}`);
  const byDate = new Map(input.bars.map((b) => [b.date, b]));
  const dates = lookbackDates(input.windowStart, config.warmUpSessions).filter(
    (d) => d >= first.date,
  );
  const present = dates.flatMap((d) => {
    const bar = byDate.get(d);
    return bar === undefined ? [] : [mulPaise(bar.close, bar.volume)];
  });
  const enough = present.length >= Math.max(1, Math.ceil(config.warmUpSessions / 2));
  return {
    instrumentId: input.instrumentId,
    series: input.latestSeries,
    listingDate: input.listingDate,
    firstSeen: first.date,
    dataStart: input.dataStart,
    sessionsBeforeStart: input.bars.filter((b) => b.date < input.windowStart).length,
    medianTradedValuePaise: enough ? median(present) : null,
    missingSessions: dates.length - present.length,
    knownMergerInWindow: input.knownMergerInWindow,
    providerCoverage: input.providerCoverage,
  };
}
