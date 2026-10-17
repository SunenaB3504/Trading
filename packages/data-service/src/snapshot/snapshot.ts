import { canonicalJson, sha256Hex } from '@trading/core';
import type { BarAdj, BarUnadj, Clock, CorporateAction } from '@trading/core';
import { verifyAdjustment } from '../canonical/adjusted';
import type { SeriesStore } from '../canonical/seriesStore';

/** `verified` only when no bar is disputed and every adjusted series matches its action table. */
export type SnapshotStatus = 'verified' | 'unverified';

export interface SeriesEntry {
  instrumentId: string;
  firstDate: string;
  lastDate: string;
  bars: number;
  disputedBars: number;
  /** SHA-256 of the unadjusted bars, the corporate actions and the adjusted bars (FR-D6). */
  barsHash: string;
  actionsHash: string;
  adjustedHash: string;
  adjustmentMismatches: number;
}

/** FR-D6. The id covers the content only, so the same inputs always give the same id. */
export interface DataSnapshot {
  id: string;
  createdAt: number;
  /** Last session the snapshot may contain; later bars and actions are left out (point in time). */
  asOf: string;
  providers: string[];
  status: SnapshotStatus;
  series: SeriesEntry[];
}

/** What a snapshot froze: bars stamped with the snapshot id, and the actions used. */
export interface FrozenSeries {
  instrumentId: string;
  bars: BarUnadj[];
  adjusted: BarAdj[];
  actions: CorporateAction[];
}

export interface SnapshotRequest {
  store: SeriesStore;
  clock: Clock;
  asOf: string;
  /** Defaults to every instrument in the store. */
  instruments?: readonly string[];
}

const withoutSnapshotId = <T extends { snapshotId: string }>(items: readonly T[]): unknown[] =>
  items.map((item) => {
    const copy: Record<string, unknown> = { ...item };
    delete copy.snapshotId;
    return copy;
  });

const hashOf = (value: unknown): string => sha256Hex(canonicalJson(value));

function entryFor(f: FrozenSeries): SeriesEntry {
  const first = f.bars[0];
  const last = f.bars[f.bars.length - 1];
  return {
    instrumentId: f.instrumentId,
    firstDate: first?.date ?? '',
    lastDate: last?.date ?? '',
    bars: f.bars.length,
    disputedBars: f.bars.filter((b) => b.disputed).length,
    barsHash: hashOf(withoutSnapshotId(f.bars)),
    actionsHash: hashOf(f.actions),
    adjustedHash: hashOf(withoutSnapshotId(f.adjusted)),
    adjustmentMismatches: verifyAdjustment(f.bars, f.adjusted, f.actions).length,
  };
}

function contentOf(
  asOf: string,
  frozen: readonly FrozenSeries[],
): Pick<DataSnapshot, 'asOf' | 'providers' | 'status' | 'series'> {
  const series = frozen.map(entryFor);
  const providers = [...new Set(frozen.flatMap((f) => f.bars.map((b) => b.provider)))].sort();
  const clean = series.every((e) => e.disputedBars === 0 && e.adjustmentMismatches === 0);
  return { asOf, providers, status: clean ? 'verified' : 'unverified', series };
}

const idOf = (content: ReturnType<typeof contentOf>): string => hashOf(content);

function freezeOne(store: SeriesStore, instrumentId: string, asOf: string): FrozenSeries {
  const bars = store.unadjusted(instrumentId).filter((b) => b.date <= asOf);
  const actions = store.corporateActions(instrumentId).filter((a) => a.exDate <= asOf);
  const adjusted = store
    .adjusted(instrumentId, { includeDividends: false, asOf })
    .filter((b) => b.date <= asOf);
  return { instrumentId, bars, adjusted, actions };
}

function stamp(frozen: FrozenSeries, snapshotId: string): FrozenSeries {
  return {
    ...frozen,
    bars: frozen.bars.map((b) => ({ ...b, snapshotId })),
    adjusted: frozen.adjusted.map((b) => ({ ...b, snapshotId })),
  };
}

/**
 * Freezes the chosen series as of a date and hashes them (FR-D6). Bars carry the snapshot id they
 * were frozen under, but the id is computed without it, so it cannot depend on itself.
 */
export function createSnapshot(req: SnapshotRequest): {
  snapshot: DataSnapshot;
  frozen: FrozenSeries[];
} {
  const ids = [...(req.instruments ?? req.store.instruments())].sort();
  const raw = ids.map((id) => freezeOne(req.store, id, req.asOf)).filter((f) => f.bars.length > 0);
  const content = contentOf(req.asOf, raw);
  const id = idOf(content);
  return {
    snapshot: { id, createdAt: req.clock.now(), ...content },
    frozen: raw.map((f) => stamp(f, id)),
  };
}

/** Recomputes the id and every hash from the frozen series; empty means nothing was altered. */
export function verifySnapshot(snapshot: DataSnapshot, frozen: readonly FrozenSeries[]): string[] {
  const problems: string[] = [];
  const content = contentOf(snapshot.asOf, frozen);
  if (idOf(content) !== snapshot.id) problems.push('snapshot id does not match its content');
  const recorded = new Map(snapshot.series.map((e) => [e.instrumentId, e]));
  for (const e of content.series) {
    const r = recorded.get(e.instrumentId);
    if (r === undefined) problems.push(`${e.instrumentId}: series not in the snapshot record`);
    else if (canonicalJson(r) !== canonicalJson(e))
      problems.push(`${e.instrumentId}: hash differs`);
  }
  if (recorded.size !== content.series.length) problems.push('series count differs');
  for (const f of frozen) {
    if (f.bars.some((b) => b.snapshotId !== snapshot.id))
      problems.push(`${f.instrumentId}: a bar carries a different snapshot id`);
  }
  return problems;
}
