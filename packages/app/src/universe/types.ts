import type { BucketInputs, InstrumentFacts, RuleId } from '@trading/core';

/** One instrument as the universe screen needs it: the eligibility facts, the bucket facts and the status flags. */
export interface UniverseEntry {
  symbol: string;
  name: string;
  isin: string | null;
  facts: InstrumentFacts;
  bucket: BucketInputs;
  /** Exchange series, band and surveillance, as recorded for the date. */
  status: {
    series: string;
    bandPct: number | null;
    tradeForTrade: boolean;
    gsmStage: number | null;
  };
  /** Eligibility rules whose inputs were assumed rather than measured; the screen marks them. */
  assumed: RuleId[];
}

export interface UniverseSource {
  /** What the data is and how far to trust it, shown above the list. */
  description: string;
  asOf: string;
  load(): Promise<UniverseEntry[]>;
}
