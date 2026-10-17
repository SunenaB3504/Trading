import { describe, expect, it } from 'vitest';
import { appendEvent } from '../audit';
import type { AuditEvent } from '../domain/ledger';
import { canonicalJson, sha256Hex } from '../hash';
import { hmacSha256, hmacSha256Hex, toHex, utf8Encode } from '../hash';
import { buildBundle, keyIdOf, verifyBundle } from './index';
import type { Bundle } from './index';

describe('HMAC-SHA256 against the RFC 4231 test vectors', () => {
  const hmac = (key: Uint8Array, text: string): string => toHex(hmacSha256(key, utf8Encode(text)));

  it('matches test case 1 (20-byte key)', () => {
    expect(hmac(new Uint8Array(20).fill(0x0b), 'Hi There')).toBe(
      'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7',
    );
  });

  it('matches test case 2 (short text key)', () => {
    expect(hmac(utf8Encode('Jefe'), 'what do ya want for nothing?')).toBe(
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    );
  });

  it('matches test case 6 (key longer than the block, hashed first)', () => {
    expect(
      hmac(
        new Uint8Array(131).fill(0xaa),
        'Test Using Larger Than Block-Size Key - Hash Key First',
      ),
    ).toBe('60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54');
  });

  it('takes a hex key and refuses anything else', () => {
    expect(hmacSha256Hex('4a656665', 'what do ya want for nothing?')).toBe(
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    );
    expect(() => hmacSha256Hex('xyz', 'a')).toThrow(RangeError);
    expect(() => hmacSha256Hex('abc', 'a')).toThrow(RangeError);
  });
});

interface Item {
  id: string;
  at: number;
  qty: number;
}
const items: Item[] = [
  { id: 'a', at: 1_000, qty: 10 },
  { id: 'b', at: 2_000, qty: 5 },
  { id: 'c', at: 2_000, qty: 7 },
];
const KEY = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
const OTHER = 'ff'.repeat(32);
const make = (keyHex: string | null = KEY, list: readonly Item[] = items) =>
  buildBundle({ createdAt: 9_000, snapshotId: 'snap-1', items: list, at: (i) => i.at, keyHex });
const roundTrip = (b: Bundle<Item>): unknown => JSON.parse(JSON.stringify(b));

describe('building and verifying a bundle (FR-X1, FR-X2)', () => {
  it('verifies a signed bundle with its key, and as checked-only without the key', () => {
    const b = roundTrip(make());
    expect(verifyBundle(b, KEY)).toMatchObject({
      ok: true,
      level: 'signed',
      count: 3,
      unsigned: false,
    });
    expect(verifyBundle(b, null)).toMatchObject({ ok: true, level: 'checked', count: 3 });
  });

  it('verifies an unsigned bundle by checksum and chain alone', () => {
    const b = roundTrip(make(null));
    expect(verifyBundle(b, null)).toMatchObject({ ok: true, level: 'checked', unsigned: true });
    expect(verifyBundle(b, KEY)).toMatchObject({ ok: true, level: 'checked', unsigned: true });
  });

  it('records the key by its hash and never the key itself', () => {
    const b = make();
    expect(b.header.keyId).toBe(keyIdOf(KEY));
    expect(JSON.stringify(b)).not.toContain(KEY);
  });

  it('chains one event per item and the head moves when an item changes', () => {
    const b = make();
    expect(b.chain).toHaveLength(3);
    const first = verifyBundle(roundTrip(b), null);
    const changed = verifyBundle(
      roundTrip(make(KEY, [{ ...items[0]!, qty: 11 }, ...items.slice(1)])),
      null,
    );
    expect(first.ok && changed.ok && first.head !== changed.head).toBe(true);
  });

  it('accepts an empty book', () => {
    expect(verifyBundle(roundTrip(make(KEY, [])), KEY)).toMatchObject({ ok: true, count: 0 });
  });

  it('is deterministic: the same book gives the same bytes', () => {
    expect(JSON.stringify(make())).toBe(JSON.stringify(make()));
  });
});

describe('refusing a bundle that was altered', () => {
  const text = JSON.stringify(make());

  it('refuses a file with a single changed character (acceptance test)', () => {
    for (const at of [20, 120, 260, Math.floor(text.length / 2), text.length - 40]) {
      const broken = text.slice(0, at) + (text[at] === 'x' ? 'y' : 'x') + text.slice(at + 1);
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(broken);
      } catch {
        continue; // unreadable text is refused before verification
      }
      expect(verifyBundle(parsed, KEY).ok, `char ${at}`).toBe(false);
    }
  });

  it('refuses an edited item even when the checksum is recomputed, because the chain recorded the original', () => {
    const b = roundTrip(make()) as Bundle<Item>;
    (b.items[1] as Item).qty = 500;
    b.checksum = sha256Hex(canonicalJson({ header: b.header, items: b.items, chain: b.chain }));
    expect(verifyBundle(b, null)).toMatchObject({ ok: false, reason: 'items_do_not_match_chain' });
  });

  it('refuses a dropped item, a reordered item and a chain with a broken link', () => {
    const rebuilt = (mutate: (b: Bundle<Item>) => void): unknown => {
      const b = roundTrip(make()) as Bundle<Item>;
      mutate(b);
      b.checksum = sha256Hex(canonicalJson({ header: b.header, items: b.items, chain: b.chain }));
      return b;
    };
    expect(
      verifyBundle(
        rebuilt((b) => b.items.pop()),
        null,
      ),
    ).toMatchObject({
      reason: 'items_do_not_match_chain',
    });
    expect(
      verifyBundle(
        rebuilt((b) => b.items.reverse()),
        null,
      ),
    ).toMatchObject({
      reason: 'items_do_not_match_chain',
    });
    expect(
      verifyBundle(
        rebuilt((b) => ((b.chain[1] as AuditEvent).prevHash = '1'.repeat(64))),
        null,
      ),
    ).toMatchObject({
      reason: 'chain_broken',
    });
  });

  it('refuses a forged bundle that rebuilds chain and checksum without the key', () => {
    const forged = roundTrip(
      buildBundle({
        createdAt: 9_000,
        snapshotId: 'snap-1',
        items: [{ id: 'z', at: 1, qty: 1 }],
        at: (i) => i.at,
        keyHex: null,
      }),
    ) as Bundle<Item>;
    forged.header.keyId = keyIdOf(KEY);
    forged.checksum = sha256Hex(
      canonicalJson({ header: forged.header, items: forged.items, chain: forged.chain }),
    );
    forged.signature = 'ab'.repeat(32);
    expect(verifyBundle(forged, KEY)).toMatchObject({ ok: false, reason: 'signature_mismatch' });
  });

  it('refuses the wrong key, a foreign file and an unsupported version', () => {
    expect(verifyBundle(roundTrip(make()), OTHER)).toMatchObject({
      ok: false,
      reason: 'wrong_key',
    });
    expect(verifyBundle({ hello: 1 }, null)).toMatchObject({ ok: false, reason: 'not_a_bundle' });
    expect(verifyBundle(null, null)).toMatchObject({ ok: false, reason: 'not_a_bundle' });
    const b = roundTrip(make()) as Bundle<Item>;
    (b.header as { version: number }).version = 2;
    expect(verifyBundle(b, null)).toMatchObject({ ok: false, reason: 'unsupported_version' });
  });

  it('keeps the chain events consistent with the audit module', () => {
    const e = appendEvent(null, {
      type: 'bundle.item',
      payloadRef: sha256Hex(canonicalJson(items[0])),
      createdAt: 1_000,
    });
    expect(make().chain[0]).toEqual(e);
  });
});
