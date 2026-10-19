import type { Bucket } from '../domain/enums';
import { canonicalJson, sha256Hex } from '../hash';

/**
 * Choosing the evaluation universe (SSD §10.5, D8, D21): about 100 names drawn from the eligible, bucketed
 * instruments. The draw is astro-blind and reproducible: within each bucket the names are ordered by a hash of
 * the seed and the instrument id, so nothing about returns, size or any astro value can steer it, and the same
 * inputs always give the same universe. Names used in the exploratory pilot are left out (SSD risk table).
 */
export const BUCKETS: readonly Bucket[] = [
  'steady',
  'underdogs',
  'speculative',
  'cyclicals',
  'mundane',
];

export interface UniverseCandidate {
  instrumentId: string;
  /** Passed every eligibility rule as of the window start (delisted names are kept, FR-U9). */
  eligible: boolean;
  bucket: Bucket | null;
}

export interface UniverseConfig {
  version: string;
  /** Seed text for the draw. */
  seed: string;
  size: number;
  /** Share of the universe each bucket should have; the shares sum to 1. */
  shares: Readonly<Record<Bucket, number>>;
  excluded: readonly string[];
}

export const UNIVERSE_V1_DEFAULT = {
  version: 'universe-v1',
  size: 100,
  shares: { steady: 0.2, underdogs: 0.2, speculative: 0.2, cyclicals: 0.2, mundane: 0.2 },
} as const;

export interface UniverseMember {
  instrumentId: string;
  bucket: Bucket;
}

export interface UniverseManifest {
  config: UniverseConfig;
  members: UniverseMember[];
  /** Per bucket: wanted, available (eligible and not excluded) and chosen. A shortfall is reported, never hidden. */
  buckets: Array<{ bucket: Bucket; wanted: number; available: number; chosen: number }>;
  /** Places a short bucket could not fill; they are not moved into other buckets. */
  shortfall: number;
  manifestHash: string;
}

const rankKey = (seed: string, id: string): string => sha256Hex(`${seed}|${id}`);

const byFraction = (a: { b: Bucket; x: number }, b: { b: Bucket; x: number }): number =>
  b.x - Math.floor(b.x) - (a.x - Math.floor(a.x)) || (a.b < b.b ? -1 : 1);

/** Wanted names per bucket by largest remainder, so the counts add up to exactly `size`. */
function wantedPerBucket(cfg: UniverseConfig): Map<Bucket, number> {
  const total = BUCKETS.reduce((n, b) => n + cfg.shares[b], 0);
  if (Math.abs(total - 1) > 1e-9) throw new RangeError('bucket shares must sum to 1');
  const raw = BUCKETS.map((b) => ({ b, x: cfg.shares[b] * cfg.size }));
  const out = new Map(raw.map((r): [Bucket, number] => [r.b, Math.floor(r.x)]));
  let left = cfg.size - [...out.values()].reduce((a, b) => a + b, 0);
  for (const r of [...raw].sort(byFraction)) {
    if (left <= 0) break;
    out.set(r.b, (out.get(r.b) ?? 0) + 1);
    left -= 1;
  }
  return out;
}

const byKey = (a: { id: string; key: string }, b: { id: string; key: string }): number =>
  a.key < b.key ? -1 : a.key > b.key ? 1 : a.id < b.id ? -1 : 1;

/** Draws the universe. Throws on a size below 1, shares that do not sum to 1, or a repeated instrument. */
export function selectUniverse(
  candidates: readonly UniverseCandidate[],
  cfg: UniverseConfig,
): UniverseManifest {
  if (!Number.isInteger(cfg.size) || cfg.size < 1)
    throw new RangeError('size must be a whole number of 1 or more');
  if (new Set(candidates.map((c) => c.instrumentId)).size !== candidates.length)
    throw new Error('an instrument appears twice among the candidates');
  const wanted = wantedPerBucket(cfg);
  const blocked = new Set(cfg.excluded);
  const members: UniverseMember[] = [];
  const buckets = BUCKETS.map((bucket) => {
    const pool = candidates
      .filter((c) => c.eligible && c.bucket === bucket && !blocked.has(c.instrumentId))
      .map((c) => ({ id: c.instrumentId, key: rankKey(cfg.seed, c.instrumentId) }))
      .sort(byKey);
    const want = wanted.get(bucket) ?? 0;
    const chosen = pool.slice(0, want);
    members.push(...chosen.map((c) => ({ instrumentId: c.id, bucket })));
    return { bucket, wanted: want, available: pool.length, chosen: chosen.length };
  });
  members.sort((a, b) => (a.instrumentId < b.instrumentId ? -1 : 1));
  const body = { config: cfg, members, buckets, shortfall: cfg.size - members.length };
  return { ...body, manifestHash: sha256Hex(canonicalJson(body)) };
}
