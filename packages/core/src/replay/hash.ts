import { canonicalJson, sha256Hex } from '../hash';
import type { ReplayResult } from './types';

/** Rounds analytics ratios so the hash does not depend on the last bits of a float. */
const q = (x: number | null): number | null => (x === null ? null : Number(x.toFixed(12)));

/**
 * The report hash: SHA-256 of a canonical view of everything a replay produced. Money is integer;
 * ratios are rounded to 12 places before hashing.
 */
export function reportHashOf(r: Omit<ReplayResult, 'reportHash'>): string {
  const s = r.summary;
  return sha256Hex(
    canonicalJson({
      snapshotId: r.snapshotId,
      outcomes: r.outcomes,
      fills: r.fills,
      entries: r.state.entries.map((e) => [
        e.txnId,
        e.account,
        e.instrumentId,
        e.amountPaise,
        e.quantityDelta,
      ]),
      trades: r.state.trades.map((t) => [t.id, t.grossPnlPaise, t.netPnlPaise]),
      report: r.report,
      summary: {
        ...s,
        winRate: q(s.winRate),
        avgWin: q(s.avgWin),
        avgLoss: q(s.avgLoss),
        payoffRatio: q(s.payoffRatio),
        expectancy: q(s.expectancy),
        profitFactor: q(s.profitFactor),
        costDrag: q(s.costDrag),
      },
    }),
  );
}
