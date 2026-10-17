import { buildBundle } from '@trading/core';
import { describe, expect, it } from 'vitest';
import { MemoryKv } from '../store/kv';
import { PaperSession, REQUESTS_KEY, demoMarket } from '../trading/paperSession';
import type { OrderForm } from '../trading/orderRequest';
import {
  DEVICE_KEY,
  EXPORT_EVERY_DAYS,
  backupStatus,
  deviceKey,
  exportBundle,
  importBundle,
} from './backupService';

const NOW = 1_760_000_000_000;
const DAY = 86_400_000;
const SNAP = demoMarket().snapshot.id;
const KEY_A = 'a1'.repeat(32);
const form = (over: Partial<OrderForm> = {}): OrderForm => ({
  instrumentId: 'AAA',
  side: 'buy',
  type: 'market',
  quantity: '10',
  limit: '',
  stop: '',
  date: '2026-03-02',
  ...over,
});

async function bookWithTrades(): Promise<MemoryKv> {
  const kv = new MemoryKv();
  const s = await PaperSession.open(kv, () => NOW);
  await s.place(form());
  await s.place(form({ side: 'sell', quantity: '4', date: '2026-04-01' }));
  await s.place(form({ instrumentId: 'BBB', quantity: '3', date: '2026-03-05' }));
  return kv;
}

describe('device key', () => {
  it('is made once, kept, and must be 32 random bytes', async () => {
    const kv = new MemoryKv();
    expect(await deviceKey(kv, () => KEY_A)).toBe(KEY_A);
    expect(await deviceKey(kv, () => 'b2'.repeat(32))).toBe(KEY_A); // the saved one wins
    await expect(deviceKey(new MemoryKv(), () => 'short')).rejects.toThrow(RangeError);
  });
});

describe('export and import of the book (FR-X1, FR-X2)', () => {
  it('exports a signed bundle that verifies and notes the time of the export', async () => {
    const kv = await bookWithTrades();
    const out = await exportBundle(kv, SNAP, NOW, () => KEY_A);
    expect(out.count).toBe(3);
    expect(out.keyHex).toBe(KEY_A);
    expect(out.text).not.toContain(KEY_A);
    const fresh = new MemoryKv();
    const r = await importBundle(fresh, out.text, KEY_A, SNAP, NOW);
    expect(r).toEqual({ ok: true, count: 3, level: 'signed', unsigned: false });
    expect(await backupStatus(kv, NOW)).toMatchObject({ daysSince: 0, due: false });
  });

  it('restores the same book on an empty device (clear the store, then import)', async () => {
    const kv = await bookWithTrades();
    const before = await (await PaperSession.open(kv, () => NOW)).view();
    const out = await exportBundle(kv, SNAP, NOW, () => KEY_A);
    const restored = new MemoryKv(); // a cleared browser store
    const r = await importBundle(restored, out.text, '', SNAP, NOW);
    expect(r).toMatchObject({ ok: true, count: 3, level: 'checked' }); // no key on the new device
    expect(await (await PaperSession.open(restored, () => NOW)).view()).toEqual(before);
    const withKey = await importBundle(new MemoryKv(), out.text, KEY_A.toUpperCase(), SNAP, NOW);
    expect(withKey).toMatchObject({ ok: true, level: 'signed' });
  });

  it("uses this device's own key to check a bundle it signed, without typing it", async () => {
    const kv = await bookWithTrades();
    const out = await exportBundle(kv, SNAP, NOW, () => KEY_A);
    expect(await importBundle(kv, out.text, '', SNAP, NOW)).toMatchObject({ level: 'signed' });
  });

  it('refuses a file with one changed character and leaves the book as it was', async () => {
    const kv = await bookWithTrades();
    const out = await exportBundle(kv, SNAP, NOW, () => KEY_A);
    const target = new MemoryKv();
    await target.set(REQUESTS_KEY, '"untouched"');
    const at = out.text.indexOf('"quantity":10') + 12;
    const broken = out.text.slice(0, at) + '9' + out.text.slice(at + 1);
    const r = await importBundle(target, broken, KEY_A, SNAP, NOW);
    expect(r).toMatchObject({ ok: false });
    expect(r.ok ? '' : r.message).toMatch(/changed after it was made/);
    expect(await target.get(REQUESTS_KEY)).toBe('"untouched"');
  });

  it('refuses text that is cut off, a foreign file, the wrong key and another data snapshot', async () => {
    const kv = await bookWithTrades();
    const out = await exportBundle(kv, SNAP, NOW, () => KEY_A);
    const msg = async (text: string, key = '', snap = SNAP) => {
      const r = await importBundle(new MemoryKv(), text, key, snap, NOW);
      return r.ok ? 'ok' : r.message;
    };
    expect(await msg(out.text.slice(0, 200))).toMatch(/could not be read/);
    expect(await msg('{"a":1}')).toMatch(/not a bundle made by this app/);
    expect(await msg(out.text, 'ff'.repeat(32))).toMatch(/key you gave did not sign/);
    expect(await msg(out.text, '', 'other-snapshot')).toMatch(
      /data snapshot fixture-v1, not other-snapshot/,
    );
  });

  it('refuses a correctly chained bundle whose items are not orders', async () => {
    const odd = buildBundle({
      createdAt: NOW,
      snapshotId: SNAP,
      items: [{ foo: 1 }],
      at: () => 1,
      keyHex: null,
    });
    const r = await importBundle(new MemoryKv(), JSON.stringify(odd), '', SNAP, NOW);
    expect(r.ok ? '' : r.message).toMatch(/not in the expected form/);
  });

  it('exports an empty book and does not store the key anywhere but the device', async () => {
    const kv = new MemoryKv();
    const out = await exportBundle(kv, SNAP, NOW, () => KEY_A);
    expect(out.count).toBe(0);
    expect(await kv.get(DEVICE_KEY)).toBe(KEY_A);
    expect(await importBundle(new MemoryKv(), out.text, '', SNAP, NOW)).toMatchObject({
      ok: true,
      count: 0,
    });
  });
});

describe('export reminder (FR-X4)', () => {
  it('is due when never exported or after a week, and not before', async () => {
    const kv = new MemoryKv();
    expect(await backupStatus(kv, NOW)).toEqual({ lastExportAt: null, daysSince: null, due: true });
    await exportBundle(kv, SNAP, NOW, () => KEY_A);
    expect(await backupStatus(kv, NOW + 3 * DAY)).toMatchObject({ daysSince: 3, due: false });
    expect(await backupStatus(kv, NOW + EXPORT_EVERY_DAYS * DAY)).toMatchObject({
      daysSince: 7,
      due: true,
    });
  });
});
