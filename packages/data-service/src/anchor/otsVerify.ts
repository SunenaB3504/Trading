import { sha256Bytes } from '@trading/core';
import type { HttpClient } from '../http/fetchPolicy';
import { bitcoinCommitments, parseProof } from './otsUpgrade';

/**
 * Checks the Bitcoin attestations in an OpenTimestamps proof against the chain (WP-4.5, D16). For each attestation
 * the calendar names a block height. We fetch that block's 80-byte header from public block explorers (GET only),
 * and accept it only if: the header hashes to the block id the explorer reported, the hash meets the proof-of-work
 * target written in the header, and the header's Merkle root is the value the proof ends in. The proof then shows
 * the digest existed no later than the block time. What this does not prove: that this block is on the best chain
 * (an explorer could show a real but orphaned block), so two independent explorers must agree on the header.
 */
export interface BlockSource {
  name: string;
  /** Block id (hex, as displayed) at a height, or null if unknown. */
  hashAt(http: HttpClient, height: number): Promise<string | null>;
  /** The 80-byte header (hex) of a block id, or null. */
  header(http: HttpClient, hash: string): Promise<string | null>;
}

const hex = (b: Uint8Array): string => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (s: string): Uint8Array =>
  Uint8Array.from((s.match(/../g) ?? []).map((h) => parseInt(h, 16)));

async function getText(http: HttpClient, url: string): Promise<string | null> {
  try {
    const res = await http.get(url, {});
    return res.status === 200 ? new TextDecoder().decode(res.body).trim() : null;
  } catch {
    return null;
  }
}

/** An Esplora-style explorer: blockstream.info and mempool.space share these routes. */
const esplora = (name: string, base: string): BlockSource => ({
  name,
  hashAt: (http, height) => getText(http, `${base}/api/block-height/${String(height)}`),
  header: (http, hash) => getText(http, `${base}/api/block/${hash}/header`),
});

export const DEFAULT_BLOCK_SOURCES: readonly BlockSource[] = [
  esplora('blockstream.info', 'https://blockstream.info'),
  esplora('mempool.space', 'https://mempool.space'),
];

export interface BitcoinCheck {
  height: number;
  ok: boolean;
  /** Block time (UTC seconds) when ok. */
  blockTime: number | null;
  /** Explorers that gave this header. */
  confirmedBy: string[];
  reason: string | null;
}

/** The compact `bits` field as the 256-bit target. */
function targetOf(bits: number): bigint {
  const exp = bits >>> 24;
  const mant = BigInt(bits & 0x7fffff);
  return exp <= 3 ? mant >> BigInt(8 * (3 - exp)) : mant << BigInt(8 * (exp - 3));
}

const le = (b: Uint8Array, at: number, n: number): number =>
  [...b.subarray(at, at + n)].reduce((acc, x, i) => acc + x * 2 ** (8 * i), 0);

/** Why a header cannot vouch for this block id and Merkle root, or null. */
export function headerProblem(
  headerHex: string,
  hash: string,
  merkleRoot: Uint8Array,
): string | null {
  if (!/^[0-9a-f]{160}$/.test(headerHex)) return 'the header is not 80 bytes';
  const header = unhex(headerHex);
  const shown = hex(Uint8Array.from(sha256Bytes(sha256Bytes(header))).reverse());
  if (shown !== hash) return 'the header does not hash to the block id';
  if (BigInt(`0x${shown}`) > targetOf(le(header, 72, 4)))
    return 'the header fails its proof-of-work target';
  if (hex(header.subarray(36, 68)) !== hex(merkleRoot))
    return 'the Merkle root is not the one the proof ends in';
  return null;
}

async function checkOne(
  http: HttpClient,
  sources: readonly BlockSource[],
  height: number,
  merkleRoot: Uint8Array,
): Promise<BitcoinCheck> {
  const fail = (reason: string, by: string[] = []): BitcoinCheck => ({
    height,
    ok: false,
    blockTime: null,
    confirmedBy: by,
    reason,
  });
  const good: Array<{ name: string; header: string }> = [];
  const problems: string[] = [];
  for (const src of sources) {
    const hash = await src.hashAt(http, height);
    const header = hash === null ? null : await src.header(http, hash);
    if (hash === null || header === null) {
      problems.push(`${src.name}: no answer`);
      continue;
    }
    const why = headerProblem(header, hash, merkleRoot);
    if (why !== null) return fail(`${src.name}: ${why}`);
    good.push({ name: src.name, header });
  }
  const first = good[0];
  if (first === undefined) return fail(problems.join('; '));
  if (new Set(good.map((g) => g.header)).size > 1)
    return fail('the explorers disagree on the header');
  if (good.length < 2)
    return fail(`only one explorer answered (${first.name}); two must agree`, [first.name]);
  return {
    height,
    ok: true,
    blockTime: le(unhex(first.header), 68, 4),
    confirmedBy: good.map((g) => g.name),
    reason: null,
  };
}

/** Checks every Bitcoin attestation in a `.ots` file. A proof with none returns an empty list. */
export async function verifyBitcoinAttestations(
  file: Uint8Array,
  http: HttpClient,
  sources: readonly BlockSource[] = DEFAULT_BLOCK_SOURCES,
): Promise<BitcoinCheck[]> {
  const out: BitcoinCheck[] = [];
  for (const c of bitcoinCommitments(parseProof(file)))
    out.push(await checkOne(http, sources, c.height, c.merkleRoot));
  return out;
}
