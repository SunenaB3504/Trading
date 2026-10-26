import type { Clock } from '@trading/core';
import type { SeriesStore } from '../canonical/seriesStore';
import type { InstrumentIdentity } from '../canonical/identity';
import type { SnapshotStore } from '../snapshot/snapshotStore';
import type { StatusHistory } from '../status/statusHistory';
import type { Lifecycle } from '../universe/lifecycle';

export interface ServiceRequest {
  method: string;
  /** Path without the query string, for example `/bars`. */
  path: string;
  query: Readonly<Record<string, string>>;
  /** Parsed JSON body, for POST. */
  body?: unknown;
}

export interface ServiceResponse {
  status: number;
  body: unknown;
}

/** Last fetch outcome per provider; the owner of the fetch loop supplies it (FR-D2). */
export interface ProviderHealth {
  provider: string;
  lastFetchAt: number | null;
  lastStatus: number | null;
  ok: boolean;
}

export interface ServiceDeps {
  series: SeriesStore;
  snapshots: SnapshotStore;
  clock: Clock;
  identities: readonly InstrumentIdentity[];
  lifecycles: readonly Lifecycle[];
  providerHealth: () => ProviderHealth[];
  /** Band and surveillance records; without it `/status` reports them as not recorded. */
  statusHistory?: StatusHistory;
  /** The learning app's real-price market file, served whole on `/market` (MIP v4.1 Stage 2, laptop slice). */
  market?: unknown;
}
