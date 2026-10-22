import type { Manifest } from './envelope';
import { freshness } from './client';
import type { PullResult } from './client';

/**
 * What the Data tab says about the daily snapshot (WP-3.9). Pure, so the wording is tested without a screen.
 * A stale or missing snapshot is stated plainly: displays that depend on signals then show GRAY-NODATA
 * (FR-P3, FR-S11), never an old value dressed as current.
 */
export interface SnapshotStatus {
  state: 'off' | 'none' | 'fresh' | 'stale';
  headline: string;
  asOf: string | null;
  sessionsBehind: number | null;
  /** Why the last attempt kept the previous snapshot, when it did. */
  lastProblem: string | null;
}

export function snapshotStatus(
  configured: boolean,
  stored: Manifest | null,
  today: string,
  last: PullResult | null,
): SnapshotStatus {
  const lastProblem = last?.status === 'kept-previous' ? last.reason : null;
  if (!configured)
    return {
      state: 'off',
      headline: 'The daily snapshot is not switched on yet. Nothing is downloaded.',
      asOf: null,
      sessionsBehind: null,
      lastProblem: null,
    };
  if (stored === null)
    return {
      state: 'none',
      headline: 'No snapshot has been downloaded yet. Anything that needs it shows GRAY-NODATA.',
      asOf: null,
      sessionsBehind: null,
      lastProblem,
    };
  const f = freshness(stored.asOf, today);
  const behind = Number.isFinite(f.sessionsBehind) ? f.sessionsBehind : null;
  return {
    state: f.state,
    headline:
      f.state === 'fresh'
        ? `Snapshot up to ${stored.asOf}.`
        : `Snapshot up to ${stored.asOf} is out of date; anything that needs it shows GRAY-NODATA.`,
    asOf: stored.asOf,
    sessionsBehind: behind,
    lastProblem,
  };
}
