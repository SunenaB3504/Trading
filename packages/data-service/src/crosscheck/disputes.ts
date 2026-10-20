import { canonicalJson, sha256Hex } from '@trading/core';
import { compareSeries } from './crossCheck';
import type { Discrepancy, PricePoint, SuspectedAction } from './crossCheck';

/**
 * The disputes list and the two-provider coverage figure for rule E7 (WP-2.9, FR-D4, D4). One check per
 * symbol; the list is what the owner reviews. Nothing is corrected silently: a disputed day stays flagged,
 * and a day counts toward coverage only when both providers have it AND agree within the tolerance.
 */

export interface SymbolCheck {
  symbol: string;
  /** Sessions in our (primary) series. */
  sessions: number;
  /** Sessions both providers cover. */
  compared: number;
  /** Compared sessions on which close and volume agree. */
  agreeing: number;
  /** The second provider had no usable series at all. */
  otherMissing: boolean;
  /** agreeing / sessions: the figure rule E7 tests against the threshold; null if the other provider is missing. */
  coverage: number | null;
  discrepancies: Discrepancy[];
  suspectedActions: SuspectedAction[];
  onlyInPrimary: number;
  onlyInOther: number;
}

/** `other` is null when the second provider has nothing for the symbol. */
export function checkSymbol(
  symbol: string,
  primary: readonly PricePoint[],
  other: readonly PricePoint[] | null,
  toleranceBps?: number,
  volumeToleranceBps?: number,
): SymbolCheck {
  if (other === null || other.length === 0)
    return {
      symbol,
      sessions: primary.length,
      compared: 0,
      agreeing: 0,
      otherMissing: true,
      coverage: null,
      discrepancies: [],
      suspectedActions: [],
      onlyInPrimary: primary.length,
      onlyInOther: 0,
    };
  const r = compareSeries(primary, other, toleranceBps, volumeToleranceBps);
  return {
    symbol,
    sessions: primary.length,
    compared: r.compared,
    agreeing: r.agreeing,
    otherMissing: false,
    coverage: primary.length === 0 ? 0 : r.agreeing / primary.length,
    discrepancies: r.discrepancies,
    suspectedActions: r.suspectedActions,
    onlyInPrimary: r.onlyInPrimary.length,
    onlyInOther: r.onlyInOther.length,
  };
}

export interface DisputeEntry extends Discrepancy {
  symbol: string;
}

export interface DisputesList {
  symbols: number;
  withoutSecondProvider: string[];
  /** Symbols below the E7 threshold, with their coverage. */
  belowThreshold: Array<{ symbol: string; coverage: number | null }>;
  /** Symbols whose disputes look like a missing split or bonus in our corporate-action table. */
  suspectedMissingActions: Array<{ symbol: string; actions: SuspectedAction[] }>;
  entries: DisputeEntry[];
  threshold: number;
  hash: string;
}

/** The list for the owner: sorted by symbol, date and field so the same checks give the same hash. */
export function buildDisputesList(checks: readonly SymbolCheck[], threshold: number): DisputesList {
  const sorted = [...checks].sort((a, b) => (a.symbol < b.symbol ? -1 : 1));
  const entries = sorted.flatMap((c) =>
    c.discrepancies.map((d): DisputeEntry => ({ ...d, symbol: c.symbol })),
  );
  entries.sort(
    (a, b) =>
      (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0) ||
      (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) ||
      (a.field < b.field ? -1 : 1),
  );
  const body = {
    symbols: sorted.length,
    withoutSecondProvider: sorted.filter((c) => c.otherMissing).map((c) => c.symbol),
    belowThreshold: sorted
      .filter((c) => c.coverage === null || c.coverage < threshold)
      .map((c) => ({ symbol: c.symbol, coverage: c.coverage })),
    suspectedMissingActions: sorted
      .filter((c) => c.suspectedActions.length > 0)
      .map((c) => ({ symbol: c.symbol, actions: c.suspectedActions })),
    entries,
    threshold,
  };
  return { ...body, hash: sha256Hex(canonicalJson(body)) };
}
