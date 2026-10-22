import { sha256Bytes } from '@trading/core';
import { describe, expect, it } from 'vitest';
import type { HttpClient } from '../http/fetchPolicy';
import { headerProblem, verifyBitcoinAttestations } from './otsVerify';
import type { BlockSource } from './otsVerify';
import { parseProof, serializeProof } from './otsUpgrade';

const hex = (b: Uint8Array): string => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (s: string): Uint8Array =>
  Uint8Array.from((s.match(/../g) ?? []).map((h) => parseInt(h, 16)));

const DIGEST = sha256Bytes(new TextEncoder().encode('x'));
const MAGIC = unhex(
  '004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e8929401'.slice(0, 62),
);
const BTC_TAG = [0x05, 0x88, 0x96, 0x0d, 0x73, 0xd7, 0x19, 0x01];

/** A proof whose digest is itself the Merkle root, attested at height 100 (varuint 100). */
const proof = Uint8Array.from([...MAGIC, 1, 0x08, ...DIGEST, 0x00, ...BTC_TAG, 1, 100]);

const blockId = (header: Uint8Array): string =>
  hex(Uint8Array.from(sha256Bytes(sha256Bytes(header))).reverse());

/** An 80-byte header with an easy target (bits 0x207fffff), mined by trying nonces. */
function mine(merkleRoot: Uint8Array, time = 1_700_000_000): Uint8Array {
  const bits = 0x207fffff;
  const h = new Uint8Array(80);
  h.set(merkleRoot, 36);
  new DataView(h.buffer).setUint32(68, time, true);
  new DataView(h.buffer).setUint32(72, bits, true);
  for (let nonce = 0; nonce < 1000; nonce += 1) {
    new DataView(h.buffer).setUint32(76, nonce, true);
    if (headerProblem(hex(h), blockId(h), merkleRoot) === null) return h;
  }
  throw new Error('no nonce found');
}

const source = (name: string, header: Uint8Array | null, id?: string): BlockSource => ({
  name,
  hashAt: () => Promise.resolve(header === null ? null : (id ?? blockId(header))),
  header: () => Promise.resolve(header === null ? null : hex(header)),
});
const http: HttpClient = {
  get: () => Promise.resolve({ status: 404, body: new Uint8Array(0), headers: {} }),
};

describe('checking a Bitcoin attestation against block headers', () => {
  it('accepts a header that hashes to its id, meets its target and holds the proof Merkle root', async () => {
    const header = mine(DIGEST);
    const [r] = await verifyBitcoinAttestations(proof, http, [
      source('a', header),
      source('b', header),
    ]);
    expect(r).toMatchObject({ ok: true, height: 100, blockTime: 1_700_000_000 });
    expect(r?.confirmedBy).toEqual(['a', 'b']);
  });

  it('refuses when only one explorer answers', async () => {
    const header = mine(DIGEST);
    const [r] = await verifyBitcoinAttestations(proof, http, [
      source('a', header),
      source('b', null),
    ]);
    expect(r?.ok).toBe(false);
    expect(r?.reason).toContain('two must agree');
  });

  it('refuses when no explorer answers', async () => {
    const [r] = await verifyBitcoinAttestations(proof, http, [source('a', null)]);
    expect(r?.ok).toBe(false);
  });

  it('refuses a header whose Merkle root is not the one the proof ends in', async () => {
    const header = mine(sha256Bytes(new TextEncoder().encode('other')));
    const [r] = await verifyBitcoinAttestations(proof, http, [
      source('a', header),
      source('b', header),
    ]);
    expect(r?.reason).toContain('Merkle root');
  });

  it('refuses a header that does not hash to the block id the explorer gave', async () => {
    const header = mine(DIGEST);
    const [r] = await verifyBitcoinAttestations(proof, http, [
      source('a', header, '00'.repeat(32)),
      source('b', header),
    ]);
    expect(r?.reason).toContain('does not hash to the block id');
  });

  it('refuses a header that fails its proof-of-work target', async () => {
    const h = new Uint8Array(80);
    h.set(DIGEST, 36);
    new DataView(h.buffer).setUint32(72, 0x1d00ffff, true);
    const r = headerProblem(hex(h), blockId(h), DIGEST);
    expect(r).toContain('proof-of-work');
  });

  it('refuses when the two explorers disagree on the header', async () => {
    const a = mine(DIGEST);
    const b = mine(DIGEST, 1_700_000_001);
    const [r] = await verifyBitcoinAttestations(proof, http, [source('a', a), source('b', b)]);
    expect(r?.reason).toContain('disagree');
  });

  it('returns nothing for a proof that has no Bitcoin attestation yet', async () => {
    const pending = serializeProof(parseProof(proof));
    expect(pending.length).toBeGreaterThan(0);
    const none = Uint8Array.from([
      ...MAGIC,
      1,
      0x08,
      ...DIGEST,
      0x00,
      0x83,
      0xdf,
      0xe3,
      0x0d,
      0x2e,
      0xf9,
      0x0c,
      0x8e,
      2,
      1,
      0x61,
    ]);
    expect(await verifyBitcoinAttestations(none, http, [])).toEqual([]);
  });
});
