import { sha256Bytes } from '@trading/core';
import type { HttpClient } from '../http/fetchPolicy';
import { DEFAULT_CALENDARS } from './openTimestamps';

/**
 * Upgrading an OpenTimestamps proof (WP-4.5, D16). The calendar first answers with a pending proof; some hours
 * later it can hand out the path that links the digest to a Bitcoin block. This reads the `.ots` file, follows
 * each pending leaf to its commitment, asks that calendar (GET only, only the calendars we trust) for the
 * completed path, and swaps it in. A calendar that has nothing yet leaves the leaf pending; nothing is ever
 * downgraded. The proof is NOT checked against the Bitcoin chain here: it reports the block height the calendar
 * claims, and checking the block header needs an outside source.
 */
const MAGIC_LENGTH = 31;
const TAG_PENDING = '83dfe30d2ef90c8e';
const TAG_BITCOIN = '0588960d73d71901';
const OP_SHA256 = 0x08;
const OP_APPEND = 0xf0;
const OP_PREPEND = 0xf1;
const MAX_DEPTH = 256;

export interface Attestation {
  tag: string;
  payload: Uint8Array;
}
export interface Op {
  tag: number;
  arg: Uint8Array | null;
  next: Node;
}
/** One node of the proof tree, items in the order they were read so the file writes back the same. */
export interface Node {
  items: Array<{ att: Attestation } | { op: Op }>;
}

const hex = (b: Uint8Array): string => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (s: string): Uint8Array =>
  Uint8Array.from((s.match(/../g) ?? []).map((h) => parseInt(h, 16)));
const concat = (...parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

class Reader {
  at = 0;
  constructor(readonly bytes: Uint8Array) {}
  byte(): number {
    const b = this.bytes[this.at];
    if (b === undefined) throw new Error('the proof ends too soon');
    this.at += 1;
    return b;
  }
  take(n: number): Uint8Array {
    if (this.at + n > this.bytes.length) throw new Error('the proof ends too soon');
    const out = this.bytes.subarray(this.at, this.at + n);
    this.at += n;
    return out;
  }
  varuint(): number {
    let value = 0;
    for (let shift = 0; shift < 35; shift += 7) {
      const b = this.byte();
      value += (b & 0x7f) * 2 ** shift;
      if ((b & 0x80) === 0) return value;
    }
    throw new Error('a number in the proof is too long');
  }
  varbytes(): Uint8Array {
    return this.take(this.varuint());
  }
  done(): boolean {
    return this.at >= this.bytes.length;
  }
}

function applyOp(tag: number, arg: Uint8Array | null, msg: Uint8Array): Uint8Array {
  if (tag === OP_SHA256) return sha256Bytes(msg);
  if (tag === OP_APPEND && arg !== null) return concat(msg, arg);
  if (tag === OP_PREPEND && arg !== null) return concat(arg, msg);
  throw new Error(`unsupported operation 0x${tag.toString(16)} in the proof`);
}

function readItem(r: Reader, tag: number, msg: Uint8Array, depth: number): Node['items'][number] {
  if (tag === 0x00) return { att: { tag: hex(r.take(8)), payload: r.varbytes() } };
  const arg = tag === OP_APPEND || tag === OP_PREPEND ? r.varbytes() : null;
  return { op: { tag, arg, next: readNode(r, applyOp(tag, arg, msg), depth + 1) } };
}

function readNode(r: Reader, msg: Uint8Array, depth: number): Node {
  if (depth > MAX_DEPTH) throw new Error('the proof is nested too deeply');
  const items: Node['items'] = [];
  let tag = r.byte();
  while (tag === 0xff) {
    items.push(readItem(r, r.byte(), msg, depth));
    tag = r.byte();
  }
  items.push(readItem(r, tag, msg, depth));
  return { items };
}

const varuint = (n: number): Uint8Array => {
  const out: number[] = [];
  let v = n;
  while (v >= 0x80) {
    out.push((v % 0x80) | 0x80);
    v = Math.floor(v / 0x80);
  }
  out.push(v);
  return Uint8Array.from(out);
};
const varbytes = (b: Uint8Array): Uint8Array => concat(varuint(b.length), b);

function writeItem(item: Node['items'][number]): Uint8Array {
  if ('att' in item)
    return concat(Uint8Array.of(0x00), unhex(item.att.tag), varbytes(item.att.payload));
  const { tag, arg, next } = item.op;
  return concat(
    Uint8Array.of(tag),
    arg === null ? new Uint8Array(0) : varbytes(arg),
    writeNode(next),
  );
}

function writeNode(node: Node): Uint8Array {
  const parts = node.items.flatMap((it, i) => [
    i < node.items.length - 1 ? Uint8Array.of(0xff) : new Uint8Array(0),
    writeItem(it),
  ]);
  return concat(...parts);
}

export interface ParsedProof {
  header: Uint8Array;
  digest: Uint8Array;
  root: Node;
}

/** Reads a `.ots` file made for a SHA-256 digest. */
export function parseProof(file: Uint8Array): ParsedProof {
  const r = new Reader(file);
  const header = r.take(MAGIC_LENGTH);
  if (r.varuint() !== 1) throw new Error('only version 1 proofs are supported');
  if (r.byte() !== OP_SHA256) throw new Error('only SHA-256 proofs are supported');
  const digest = r.take(32);
  const root = readNode(r, digest, 0);
  if (!r.done()) throw new Error('unexpected bytes after the proof');
  return { header, digest, root };
}

export function serializeProof(p: ParsedProof): Uint8Array {
  return concat(p.header, Uint8Array.of(1, OP_SHA256), p.digest, writeNode(p.root));
}

export type Leaf =
  | { kind: 'pending'; uri: string }
  | { kind: 'bitcoin'; height: number }
  | { kind: 'unknown'; tag: string };

function leafOf(a: Attestation): Leaf {
  const r = new Reader(a.payload);
  if (a.tag === TAG_PENDING)
    return { kind: 'pending', uri: new TextDecoder().decode(r.varbytes()) };
  if (a.tag === TAG_BITCOIN) return { kind: 'bitcoin', height: r.varuint() };
  return { kind: 'unknown', tag: a.tag };
}

/** Every attestation in the proof. */
export function leaves(node: Node): Leaf[] {
  return node.items.flatMap((it) => ('att' in it ? [leafOf(it.att)] : leaves(it.op.next)));
}

export type ProofStatus = 'attested' | 'pending';

export interface UpgradeResult {
  /** The proof, upgraded where a calendar had the completed path. */
  proof: Uint8Array;
  status: ProofStatus;
  /** Calendar heights claimed by the proof; not checked against the chain. */
  bitcoinHeights: number[];
  pending: string[];
  /** Why a calendar was not used or had nothing, for the log. */
  notes: string[];
}

const TRUSTED_ORIGINS = new Set(DEFAULT_CALENDARS.map((c) => new URL(c).origin));

type Fetch = (uri: string, commitment: Uint8Array) => Promise<Node | string>;

async function fetchUpgrade(
  http: HttpClient,
  uri: string,
  commitment: Uint8Array,
): Promise<Node | string> {
  let origin: string;
  try {
    origin = new URL(uri).origin;
  } catch {
    return `${uri}: not a web address`;
  }
  if (!TRUSTED_ORIGINS.has(origin)) return `${origin}: not a calendar we trust, not asked`;
  try {
    const res = await http.get(`${origin}/timestamp/${hex(commitment)}`, {
      Accept: 'application/vnd.opentimestamps.v1',
    });
    if (res.status === 404) return `${origin}: still pending`;
    if (res.status !== 200) return `${origin}: HTTP ${String(res.status)}`;
    const r = new Reader(res.body);
    const node = readNode(r, commitment, 0);
    return r.done() ? node : `${origin}: unexpected bytes in the answer`;
  } catch (e) {
    return `${origin}: ${e instanceof Error ? e.message : 'failed'}`;
  }
}

/** Walks the tree with the message at each node and swaps each pending leaf the calendar can now complete. */
async function upgradeNode(
  node: Node,
  msg: Uint8Array,
  ask: Fetch,
  notes: string[],
): Promise<Node> {
  const items: Node['items'] = [];
  for (const it of node.items) {
    if ('op' in it) {
      const next = await upgradeNode(it.op.next, applyOp(it.op.tag, it.op.arg, msg), ask, notes);
      items.push({ op: { ...it.op, next } });
      continue;
    }
    const leaf = leafOf(it.att);
    if (leaf.kind !== 'pending') {
      items.push(it);
      continue;
    }
    const got = await ask(leaf.uri, msg);
    if (typeof got === 'string') {
      notes.push(got);
      items.push(it);
    } else items.push(...got.items);
  }
  return { items };
}

/** Tries to complete every pending leaf of a `.ots` file. Safe to call again and again. */
export async function upgradeProof(file: Uint8Array, http: HttpClient): Promise<UpgradeResult> {
  const parsed = parseProof(file);
  const notes: string[] = [];
  const ask: Fetch = (uri, commitment) => fetchUpgrade(http, uri, commitment);
  const root = await upgradeNode(parsed.root, parsed.digest, ask, notes);
  const all = leaves(root);
  const heights = all.flatMap((l) => (l.kind === 'bitcoin' ? [l.height] : []));
  return {
    proof: serializeProof({ ...parsed, root }),
    status: heights.length > 0 ? 'attested' : 'pending',
    bitcoinHeights: heights,
    pending: all.flatMap((l) => (l.kind === 'pending' ? [l.uri] : [])),
    notes,
  };
}

/** Each Bitcoin attestation with the message it vouches for: the block's Merkle root, in the block header's own byte order. */
export function bitcoinCommitments(
  p: ParsedProof,
): Array<{ height: number; merkleRoot: Uint8Array }> {
  const out: Array<{ height: number; merkleRoot: Uint8Array }> = [];
  const walk = (node: Node, msg: Uint8Array): void => {
    for (const it of node.items) {
      if ('op' in it) walk(it.op.next, applyOp(it.op.tag, it.op.arg, msg));
      else {
        const leaf = leafOf(it.att);
        if (leaf.kind === 'bitcoin') out.push({ height: leaf.height, merkleRoot: msg });
      }
    }
  };
  walk(p.root, p.digest);
  return out;
}
