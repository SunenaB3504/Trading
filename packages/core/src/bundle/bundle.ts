import { GENESIS_HASH, appendEvent, verifyChain } from '../audit';
import type { AuditEvent } from '../domain/ledger';
import { canonicalJson, sha256Hex } from '../hash';
import { hmacSha256Hex } from '../hash/hmac';

/**
 * A portable copy of the owner's book (FR-X1, FR-X2). The items are the records that rebuild the book;
 * every item gets an event in a hash chain, the whole file carries a checksum, and a keyed signature
 * says it was made by the holder of a key. The checksum and chain make any edit visible; the signature
 * says who made it, but only to someone who holds the key.
 */
export const BUNDLE_FORMAT = 'mock-trading-bundle';
export const BUNDLE_VERSION = 1;

export interface BundleHeader {
  format: typeof BUNDLE_FORMAT;
  version: number;
  createdAt: number;
  snapshotId: string;
  /** SHA-256 of the signing key, so a holder can tell which key to use. Never the key itself. */
  keyId: string | null;
}

export interface Bundle<T> {
  header: BundleHeader;
  items: T[];
  chain: AuditEvent[];
  /** SHA-256 over header, items and chain. */
  checksum: string;
  /** HMAC-SHA256 of the checksum with the signing key, or null when the bundle was not signed. */
  signature: string | null;
}

export interface BundleInput<T> {
  createdAt: number;
  snapshotId: string;
  items: readonly T[];
  /** When the item entered the book; items must be given in this order. */
  at: (item: T) => number;
  /** Signing key as hex; none produces an unsigned bundle. */
  keyHex: string | null;
}

export const keyIdOf = (keyHex: string): string => sha256Hex(keyHex.toLowerCase());
const itemRef = (item: unknown): string => sha256Hex(canonicalJson(item));

function chainOf<T>(items: readonly T[], at: (item: T) => number): AuditEvent[] {
  const events: AuditEvent[] = [];
  for (const item of items) {
    events.push(
      appendEvent(events[events.length - 1] ?? null, {
        type: 'bundle.item',
        payloadRef: itemRef(item),
        createdAt: at(item),
      }),
    );
  }
  return events;
}

const checksumOf = <T>(b: Pick<Bundle<T>, 'header' | 'items' | 'chain'>): string =>
  sha256Hex(canonicalJson({ header: b.header, items: b.items, chain: b.chain }));

export function buildBundle<T>(input: BundleInput<T>): Bundle<T> {
  const header: BundleHeader = {
    format: BUNDLE_FORMAT,
    version: BUNDLE_VERSION,
    createdAt: input.createdAt,
    snapshotId: input.snapshotId,
    keyId: input.keyHex === null ? null : keyIdOf(input.keyHex),
  };
  const items = [...input.items];
  const chain = chainOf(items, input.at);
  const checksum = checksumOf({ header, items, chain });
  return {
    header,
    items,
    chain,
    checksum,
    signature: input.keyHex === null ? null : hmacSha256Hex(input.keyHex, checksum),
  };
}

export type RefusalReason =
  | 'not_a_bundle'
  | 'unsupported_version'
  | 'checksum_mismatch'
  | 'chain_broken'
  | 'items_do_not_match_chain'
  | 'signature_mismatch'
  | 'wrong_key';

/** `signed`: checksum, chain and signature all verified. `checked`: checksum and chain verified, no key to check the signature. */
export type VerifyLevel = 'signed' | 'checked';

export type BundleVerdict =
  | { ok: true; level: VerifyLevel; head: string; count: number; unsigned: boolean }
  | { ok: false; reason: RefusalReason; detail: string };

const refuse = (reason: RefusalReason, detail: string): BundleVerdict => ({
  ok: false,
  reason,
  detail,
});

function shapeProblem(b: unknown): BundleVerdict | null {
  const x = b as Partial<Bundle<unknown>> | null;
  const header = x?.header;
  if (
    x === null ||
    typeof x !== 'object' ||
    header === undefined ||
    header.format !== BUNDLE_FORMAT
  )
    return refuse('not_a_bundle', 'this is not a mock-trading bundle');
  if (header.version !== BUNDLE_VERSION)
    return refuse(
      'unsupported_version',
      `bundle version ${String(header.version)} is not supported`,
    );
  if (!Array.isArray(x.items) || !Array.isArray(x.chain) || typeof x.checksum !== 'string')
    return refuse('not_a_bundle', 'the bundle is missing parts');
  return null;
}

function chainProblem(b: Bundle<unknown>): BundleVerdict | null {
  const v = verifyChain(b.chain);
  if (!v.ok) return refuse('chain_broken', `event ${v.index}: ${v.reason}`);
  if (b.chain.length !== b.items.length)
    return refuse('items_do_not_match_chain', 'the number of items differs from the chain');
  const wrong = b.items.findIndex((item, i) => b.chain[i]?.payloadRef !== itemRef(item));
  return wrong >= 0 ? refuse('items_do_not_match_chain', `item ${wrong} was changed`) : null;
}

function signatureProblem(b: Bundle<unknown>, keyHex: string | null): BundleVerdict | null {
  if (b.signature === null || keyHex === null) return null;
  if (b.header.keyId !== keyIdOf(keyHex))
    return refuse('wrong_key', 'this key did not sign the bundle');
  return hmacSha256Hex(keyHex, b.checksum) === b.signature
    ? null
    : refuse('signature_mismatch', 'the signature does not match');
}

/**
 * Checks a parsed bundle: format, checksum, hash chain, that the items are exactly what the chain
 * recorded, and (when a key is given and the bundle is signed) the signature. A chain that has lost
 * its tail still verifies, so compare `head` with an anchored head where one exists (D16).
 */
export function verifyBundle(bundle: unknown, keyHex: string | null): BundleVerdict {
  const shape = shapeProblem(bundle);
  if (shape !== null) return shape;
  const b = bundle as Bundle<unknown>;
  if (checksumOf(b) !== b.checksum)
    return refuse('checksum_mismatch', 'the file was changed after it was made');
  const problem = chainProblem(b) ?? signatureProblem(b, keyHex);
  if (problem !== null) return problem;
  const head = b.chain[b.chain.length - 1]?.hash ?? GENESIS_HASH;
  const signed = b.signature !== null && keyHex !== null;
  return {
    ok: true,
    level: signed ? 'signed' : 'checked',
    head,
    count: b.items.length,
    unsigned: b.signature === null,
  };
}
