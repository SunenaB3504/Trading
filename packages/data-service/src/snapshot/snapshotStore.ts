import type { DataSnapshot, FrozenSeries } from './snapshot';
import { verifySnapshot } from './snapshot';

export interface StoredSnapshot {
  snapshot: DataSnapshot;
  series: FrozenSeries[];
}

const copyOf = (s: StoredSnapshot): StoredSnapshot => ({
  snapshot: { ...s.snapshot, series: s.snapshot.series.map((e) => ({ ...e })) },
  series: s.series.map((f) => ({
    instrumentId: f.instrumentId,
    bars: f.bars.map((b) => ({ ...b })),
    adjusted: f.adjusted.map((b) => ({ ...b })),
    actions: f.actions.map((a) => ({ ...a })),
  })),
});

/**
 * Snapshots are immutable once stored. Storing the same id again changes nothing (the id is a hash of
 * the content), and anything that fails verification is refused. Reads return copies.
 */
export class SnapshotStore {
  private readonly byId = new Map<string, StoredSnapshot>();

  put(stored: StoredSnapshot): DataSnapshot {
    const problems = verifySnapshot(stored.snapshot, stored.series);
    if (problems.length > 0) throw new Error(`snapshot refused: ${problems.join('; ')}`);
    if (!this.byId.has(stored.snapshot.id)) this.byId.set(stored.snapshot.id, copyOf(stored));
    return (this.byId.get(stored.snapshot.id) as StoredSnapshot).snapshot;
  }

  get(id: string): StoredSnapshot | undefined {
    const s = this.byId.get(id);
    return s === undefined ? undefined : copyOf(s);
  }

  list(): DataSnapshot[] {
    return [...this.byId.values()].map((s) => s.snapshot).sort((a, b) => a.createdAt - b.createdAt);
  }
}
