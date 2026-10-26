/// <reference lib="dom" />
import { canonicalJson } from '@trading/core';
import { describe, expect, it } from 'vitest';
import { MemoryKv } from './kv';
import { NetworkPolicyError, auditedFetch } from './audit';
import type { RawFetch } from './audit';
import { LATEST_KEY, freshness, pullSnapshot, readVerified } from './client';
import type { PullDeps } from './client';
import { manifestBytes, payloadHashOf } from './envelope';
import type { Envelope, Manifest } from './envelope';
import { pinnedEd25519 } from './verifier';

const ORIGIN = 'https://snapshots.example.test';
const toHex = (b: ArrayBuffer): string =>
  [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

const pair = (await crypto.subtle.generateKey('Ed25519', true, [
  'sign',
  'verify',
])) as CryptoKeyPair;
const other = (await crypto.subtle.generateKey('Ed25519', true, [
  'sign',
  'verify',
])) as CryptoKeyPair;
const publicHex = toHex(await crypto.subtle.exportKey('raw', pair.publicKey));
const verifier = pinnedEd25519({ k1: publicHex });

async function publish(
  asOf: string,
  payload: unknown = { n: asOf },
  opts: { key?: CryptoKeyPair; keyId?: string } = {},
) {
  const manifest: Manifest = {
    version: 1,
    snapshotId: `snap-${asOf}`,
    asOf,
    createdAt: 1,
    payloadHash: payloadHashOf(payload),
    keyId: opts.keyId ?? 'k1',
  };
  const sig = await crypto.subtle.sign(
    'Ed25519',
    (opts.key ?? pair).privateKey,
    manifestBytes(manifest) as unknown as ArrayBuffer,
  );
  const env: Envelope = { manifest, payload, signature: toHex(sig) };
  return JSON.stringify(env);
}

/** A fake publisher: file name to (status, body). */
function host(
  files: Record<string, { status: number; body: string } | Error>,
): RawFetch & { calls: string[] } {
  const calls: string[] = [];
  const fn = ((url: string) => {
    calls.push(url);
    const hit = files[url.slice(url.lastIndexOf('/') + 1)] ?? { status: 404, body: '' };
    if (hit instanceof Error) return Promise.reject(hit);
    return Promise.resolve({ status: hit.status, text: () => Promise.resolve(hit.body) });
  }) as unknown as RawFetch & { calls: string[] };
  fn.calls = calls;
  return fn;
}

function deps(raw: RawFetch, kv = new MemoryKv(), today = '2026-06-10'): PullDeps {
  return { net: auditedFetch(ORIGIN, raw), origin: ORIGIN, verifier, kv, today };
}

describe('pulling the signed snapshot', () => {
  it('stores a good snapshot, then reports the same one as unchanged', async () => {
    const body = await publish('2026-06-10');
    const kv = new MemoryKv();
    const r = raw({ 'base_tickets_20260610.json': { status: 200, body } });
    expect((await pullSnapshot(deps(r, kv))).status).toBe('updated');
    expect(await kv.get(LATEST_KEY)).toBe(body);
    expect((await pullSnapshot(deps(r, kv))).status).toBe('unchanged');
  });

  it('falls back to an earlier session when today is not published yet', async () => {
    const body = await publish('2026-06-09');
    const r = raw({ 'base_tickets_20260609.json': { status: 200, body } });
    const res = await pullSnapshot(deps(r));
    expect(res.status).toBe('updated');
    expect(r.calls.map((u) => u.slice(-13, -5))).toEqual(['20260610', '20260609']);
  });

  it.each([
    [
      'a changed payload',
      async () => (await publish('2026-06-10')).replace('"n":"2026-06-10"', '"n":"forged"'),
      'does not match',
    ],
    [
      'a signature from another key',
      async () => publish('2026-06-10', undefined, { key: other }),
      'signature',
    ],
    [
      'an unknown key id',
      async () => publish('2026-06-10', undefined, { keyId: 'k9' }),
      'signature',
    ],
    ['a snapshot dated in the future', async () => publish('2026-06-11'), 'after the day'],
    ['a file in the wrong format', async () => '{"hello":1}', 'expected format'],
    ['text that is not JSON', async () => 'not json', 'expected format'],
  ])('refuses %s and keeps the previous snapshot', async (_, make, why) => {
    const kv = new MemoryKv();
    const good = await publish('2026-06-09');
    await kv.set(LATEST_KEY, good);
    const r = raw({ 'base_tickets_20260610.json': { status: 200, body: await make() } });
    const res = await pullSnapshot(deps(r, kv));
    expect(res.status).toBe('kept-previous');
    expect(res.status === 'kept-previous' && res.reason).toContain(why);
    expect(await kv.get(LATEST_KEY)).toBe(good);
  });

  it('refuses an older snapshot than the one it holds (no rollback)', async () => {
    const kv = new MemoryKv();
    const newer = await publish('2026-06-09');
    await kv.set(LATEST_KEY, newer);
    const r = raw({
      'base_tickets_20260610.json': { status: 200, body: await publish('2026-06-05') },
    });
    const res = await pullSnapshot(deps(r, kv));
    expect(res.status === 'kept-previous' && res.reason).toContain('older than the stored');
    expect(await kv.get(LATEST_KEY)).toBe(newer);
  });

  it('keeps the previous snapshot when the host fails, is unreachable, sends too much, or has nothing', async () => {
    const kv = new MemoryKv();
    const good = await publish('2026-06-09');
    await kv.set(LATEST_KEY, good);
    const cases: Array<[Record<string, { status: number; body: string } | Error>, string]> = [
      [{ 'base_tickets_20260610.json': { status: 503, body: '' } }, '503'],
      [{ 'base_tickets_20260610.json': new Error('offline') }, 'could not reach'],
      [{ 'base_tickets_20260610.json': { status: 200, body: 'x'.repeat(50) } }, 'expected format'],
      [{}, 'no snapshot is published'],
    ];
    for (const [files, why] of cases) {
      const res = await pullSnapshot(deps(raw(files), kv));
      expect(res.status === 'kept-previous' && res.reason, why).toContain(why);
    }
    const big = await pullSnapshot({
      ...deps(raw({ 'base_tickets_20260610.json': { status: 200, body: 'y'.repeat(200) } }), kv),
      maxBytes: 100,
    });
    expect(big.status === 'kept-previous' && big.reason).toContain('larger than the limit');
    expect(await kv.get(LATEST_KEY)).toBe(good);
  });
});

describe('the network audit (FR-P2)', () => {
  it('sends only GET requests, only to the allow-listed origin, only for snapshot files, with no query', async () => {
    const r = raw({
      'base_tickets_20260610.json': { status: 200, body: await publish('2026-06-10') },
    });
    const d = deps(r);
    await pullSnapshot(d);
    expect(d.net.sent.length).toBeGreaterThan(0);
    for (const s of d.net.sent) {
      expect(s.method).toBe('GET');
      const u = new URL(s.url);
      expect(u.origin).toBe(ORIGIN);
      expect(u.pathname).toMatch(/^\/base_tickets_\d{8}\.json$/);
      expect(u.search).toBe('');
    }
  });

  it('refuses before sending anything: another origin, another path, a query, credentials, plain http', async () => {
    const r = raw({});
    const net = auditedFetch(ORIGIN, r);
    for (const bad of [
      'https://evil.example.test/base_tickets_20260610.json',
      `${ORIGIN}/api/users`,
      `${ORIGIN}/base_tickets_20260610.json?device=abc`,
      `${ORIGIN}/base_tickets_20260610.json#frag`,
      'https://user:pw@snapshots.example.test/base_tickets_20260610.json',
    ])
      await expect(net.get(bad)).rejects.toThrow(NetworkPolicyError);
    expect(r.calls).toEqual([]);
    expect(() => auditedFetch('http://snapshots.example.test', r)).toThrow(NetworkPolicyError);
  });
});

describe('how old a snapshot is', () => {
  it('counts trading sessions, not days: stale after more than three missed sessions', () => {
    // 2026-06-08 is a Monday; the sessions after Monday up to Friday are Tuesday to Friday.
    expect(freshness('2026-06-08', '2026-06-08')).toMatchObject({
      sessionsBehind: 0,
      state: 'fresh',
    });
    expect(freshness('2026-06-08', '2026-06-11')).toMatchObject({
      sessionsBehind: 3,
      state: 'fresh',
    });
    expect(freshness('2026-06-08', '2026-06-12')).toMatchObject({
      sessionsBehind: 4,
      state: 'stale',
    });
    expect(freshness('2026-06-12', '2026-06-15')).toMatchObject({
      sessionsBehind: 1,
      state: 'fresh',
    }); // over a weekend
  });

  it('counts a date outside the calendar as stale', () => {
    expect(freshness('1990-01-01', '2026-06-08').state).toBe('stale');
  });
});

describe('reading the stored snapshot', () => {
  it('returns it when it still verifies and nothing when the stored copy was changed', async () => {
    const kv = new MemoryKv();
    const body = await publish('2026-06-10');
    await kv.set(LATEST_KEY, body);
    expect((await readVerified(kv, verifier))?.manifest.asOf).toBe('2026-06-10');
    await kv.set(LATEST_KEY, body.replace('"n":"2026-06-10"', '"n":"edited"'));
    expect(await readVerified(kv, verifier)).toBeNull();
    expect(await readVerified(new MemoryKv(), verifier)).toBeNull();
  });

  it('is signed over the canonical manifest, whatever order the keys arrive in', async () => {
    const body = JSON.parse(await publish('2026-06-10')) as Envelope;
    const reordered = JSON.stringify({
      signature: body.signature,
      payload: body.payload,
      manifest: JSON.parse(canonicalJson(body.manifest)),
    });
    const kv = new MemoryKv();
    await kv.set(LATEST_KEY, reordered);
    expect(await readVerified(kv, verifier)).not.toBeNull();
  });
});

function raw(
  files: Record<string, { status: number; body: string } | Error>,
): RawFetch & { calls: string[] } {
  return host(files);
}
