import { addDays, previousRegularTradingDay, tradingDaysBetween } from '@trading/core';
import type { KeyValueStore } from '../store/kv';
import type { AuditedFetch } from './audit';
import { envelopeSchema, manifestBytes, payloadHashOf } from './envelope';
import type { Envelope, Manifest } from './envelope';
import type { SignatureVerifier } from './verifier';

/**
 * The download-only snapshot pull (SSD §7.6, FR-P1, FR-P3, WP-3.9). It asks for today's signed file (and, if the
 * publisher has not made it yet, one of the last few sessions), checks it end to end, and only then replaces the
 * stored copy. A failed check, an older snapshot or a network error keeps the previous snapshot exactly as it was.
 * Nothing is sent but the GET for the file (see `auditedFetch`).
 */
export const LATEST_KEY = 'snapshot/latest';
export const DEFAULT_MAX_BYTES = 20_000_000;
export const DEFAULT_TRIES = 4;
export const DEFAULT_MAX_AGE_SESSIONS = 3;

export interface PullDeps {
  net: AuditedFetch;
  origin: string;
  verifier: SignatureVerifier;
  kv: KeyValueStore;
  /** Today's date in IST (YYYY-MM-DD). */
  today: string;
  maxBytes?: number;
  tries?: number;
}

export type PullResult =
  | { status: 'updated'; manifest: Manifest }
  | { status: 'unchanged'; manifest: Manifest }
  | { status: 'kept-previous'; reason: string; manifest: Manifest | null };

const fileName = (date: string): string => `base_tickets_${date.replaceAll('-', '')}.json`;

/** Why a downloaded envelope is not acceptable, or null. Order matters: cheap checks first, signature last. */
async function problem(
  env: Envelope,
  deps: PullDeps,
  fileDate: string,
  stored: Manifest | null,
): Promise<string | null> {
  const m = env.manifest;
  if (payloadHashOf(env.payload) !== m.payloadHash)
    return 'the payload does not match its manifest hash';
  if (m.asOf > deps.today || m.asOf > fileDate)
    return 'the snapshot is dated after the day it was asked for';
  if (stored !== null && m.asOf < stored.asOf)
    return `older than the stored snapshot (${m.asOf} is before ${stored.asOf})`;
  const ok = await deps.verifier.verify(manifestBytes(m), env.signature, m.keyId);
  return ok ? null : 'the signature does not verify';
}

async function storedManifest(kv: KeyValueStore): Promise<Manifest | null> {
  const text = await kv.get(LATEST_KEY);
  if (text === null) return null;
  const parsed = envelopeSchema.safeParse(safeJson(text));
  return parsed.success ? parsed.data.manifest : null;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** The days to ask for: today, then earlier sessions, newest first. */
function candidateDates(today: string, tries: number): string[] {
  const out = [today];
  let d = today;
  try {
    for (let i = 1; i < tries; i += 1) {
      d = previousRegularTradingDay(d);
      out.push(d);
    }
  } catch {
    /* before the start of the calendar: ask for fewer days */
  }
  return out;
}

type Fetched =
  { kind: 'missing' } | { kind: 'failed'; reason: string } | { kind: 'file'; text: string };

/** One GET for one day's file: missing (404), failed, or the text. */
async function fetchDay(deps: PullDeps, date: string): Promise<Fetched> {
  let res: { status: number; text: string };
  try {
    res = await deps.net.get(`${deps.origin}/${fileName(date)}`);
  } catch (e) {
    return {
      kind: 'failed',
      reason: `could not reach the snapshot host (${e instanceof Error ? e.message : 'error'})`,
    };
  }
  if (res.status === 404) return { kind: 'missing' };
  if (res.status !== 200)
    return { kind: 'failed', reason: `the snapshot host answered ${String(res.status)}` };
  if (res.text.length > (deps.maxBytes ?? DEFAULT_MAX_BYTES))
    return { kind: 'failed', reason: 'the snapshot file is larger than the limit' };
  return { kind: 'file', text: res.text };
}

/** Checks a downloaded file and, if it is good and new, stores it. */
async function accept(
  deps: PullDeps,
  text: string,
  date: string,
  stored: Manifest | null,
): Promise<PullResult> {
  const keep = (reason: string): PullResult => ({
    status: 'kept-previous',
    reason,
    manifest: stored,
  });
  const parsed = envelopeSchema.safeParse(safeJson(text));
  if (!parsed.success) return keep('the snapshot file is not in the expected format');
  const why = await problem(parsed.data, deps, date, stored);
  if (why !== null) return keep(why);
  if (stored !== null && stored.snapshotId === parsed.data.manifest.snapshotId)
    return { status: 'unchanged', manifest: stored };
  await deps.kv.set(LATEST_KEY, text);
  return { status: 'updated', manifest: parsed.data.manifest };
}

export async function pullSnapshot(deps: PullDeps): Promise<PullResult> {
  const stored = await storedManifest(deps.kv);
  for (const date of candidateDates(deps.today, deps.tries ?? DEFAULT_TRIES)) {
    const got = await fetchDay(deps, date);
    if (got.kind === 'missing') continue;
    if (got.kind === 'failed')
      return { status: 'kept-previous', reason: got.reason, manifest: stored };
    return accept(deps, got.text, date, stored);
  }
  return {
    status: 'kept-previous',
    reason: 'no snapshot is published for the last few sessions',
    manifest: stored,
  };
}

export interface Freshness {
  asOf: string;
  /** Regular and special sessions after the snapshot date, up to and including today. */
  sessionsBehind: number;
  /** `stale` means signal-dependent displays must show GRAY-NODATA (FR-P3, FR-S11). */
  state: 'fresh' | 'stale';
}

/** How old a snapshot is, counted in trading sessions by the calendar (not in days). A calendar error counts as stale. */
export function freshness(
  asOf: string,
  today: string,
  maxAgeSessions: number = DEFAULT_MAX_AGE_SESSIONS,
): Freshness {
  let behind: number;
  try {
    behind = asOf >= today ? 0 : tradingDaysBetween(addDays(asOf, 1), today).length;
  } catch {
    return { asOf, sessionsBehind: Number.POSITIVE_INFINITY, state: 'stale' };
  }
  return { asOf, sessionsBehind: behind, state: behind > maxAgeSessions ? 'stale' : 'fresh' };
}

/** The stored snapshot, checked again on every read in case the stored copy was changed; null if absent or bad. */
export async function readVerified(
  kv: KeyValueStore,
  verifier: SignatureVerifier,
): Promise<Envelope | null> {
  const text = await kv.get(LATEST_KEY);
  if (text === null) return null;
  const parsed = envelopeSchema.safeParse(safeJson(text));
  if (!parsed.success) return null;
  const env = parsed.data;
  if (payloadHashOf(env.payload) !== env.manifest.payloadHash) return null;
  return (await verifier.verify(manifestBytes(env.manifest), env.signature, env.manifest.keyId))
    ? env
    : null;
}
