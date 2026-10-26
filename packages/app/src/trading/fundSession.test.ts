import { describe, expect, it } from 'vitest';
import type { FundsMarket } from '@trading/core';
import { applyImport, exportProfile, previewImport, readBackup } from '../backup/backupService';
import { ProfileStore } from '../profiles/profiles';
import { MemorySecureStore } from '../secure/secureStore';
import { MemoryKv } from '../store/kv';
import type { KeyValueStore } from '../store/kv';
import { fundNoteLines } from './fundNote';
import { FundSession, makeFundOrder, navText, rupeesToPaise, unitsText, unitsToMilli } from './fundSession';
import type { FundForm } from './fundSession';
import { demoMarket } from './market';

const NOW = 1_760_000_000_000;
const KEY = 'a1'.repeat(32);

/** One equity fund: NAV ₹100 on 2 Mar 2026, ₹110 on the 3rd, ₹115 on the 5th, ₹120 on the 6th. */
const MARKET: FundsMarket = {
  format: 'learning-funds',
  version: 1,
  builtAt: 1,
  source: 'test',
  funds: [{ id: '1', name: 'Test Index Fund', kind: 'Index fund', isin: null, rules: 'equity', firstDate: '2026-03-02', lastDate: '2026-03-06' }],
  navs: {
    '1': [
      ['2026-03-02', 1_000_000],
      ['2026-03-03', 1_100_000],
      ['2026-03-05', 1_150_000],
      ['2026-03-06', 1_200_000],
    ],
  },
  disputed: [],
};

const form = (over: Partial<FundForm> = {}): FundForm => ({
  fundId: '1',
  action: 'buy',
  date: '2026-03-02',
  beforeCutoff: true,
  amount: '10000',
  units: 'all',
  dayOfMonth: '5',
  instalments: '2',
  ...over,
});

const open = (kv: KeyValueStore = new MemoryKv()) => FundSession.open(kv, () => NOW, MARKET);

describe('fund form parsing', () => {
  it('reads rupees, units and NAVs exactly', () => {
    expect(rupeesToPaise('2500.50')).toBe(250_050);
    expect(rupeesToPaise('5000')).toBe(500_000);
    expect(rupeesToPaise('1e3')).toBeNull();
    expect(rupeesToPaise('12.345')).toBeNull();
    expect(unitsToMilli('12.5')).toBe(12_500);
    expect(unitsToMilli('ALL')).toBe('all');
    expect(unitsToMilli('0')).toBeNull();
    expect(unitsToMilli('1.2345')).toBeNull();
    expect(unitsText(99_995)).toBe('99.995');
    expect(unitsText(12_000)).toBe('12');
    expect(navText(1_591_770)).toBe('₹159.1770');
  });

  it('explains a bad date, amount, SIP day and instalment count', () => {
    expect(makeFundOrder(form({ date: '2 Mar' }), 1)).toEqual({ ok: false, error: 'Enter the date as YYYY-MM-DD.' });
    expect(makeFundOrder(form({ amount: '50' }), 1)).toEqual({ ok: false, error: 'The smallest purchase is ₹100.00.' });
    expect(makeFundOrder(form({ action: 'sip', dayOfMonth: '30' }), 1)).toEqual({ ok: false, error: 'The SIP day must be from 1 to 28.' });
    expect(makeFundOrder(form({ action: 'sip', instalments: '0' }), 1)).toEqual({ ok: false, error: 'A SIP can have 1 to 60 instalments.' });
    expect(makeFundOrder(form({ action: 'redeem', units: 'lots' }), 1)).toMatchObject({ ok: false });
  });
});

describe('fund practice account (MIP v4.1 Stage 3)', () => {
  it('a ₹10,000 purchase at ₹100 buys 99.995 units after ₹0.50 stamp duty', async () => {
    const s = await open();
    expect(await s.place(form())).toEqual({ ok: true, orderId: 'f-0001' });
    const v = s.view();
    expect(v.cash).toBe('₹9,90,000.00');
    expect(v.holdings[0]).toMatchObject({ units: '99.995', cost: '₹10,000.00', value: '₹11,999.40' });
    expect(v.total).toBe('₹10,01,999.40');
    expect(fundNoteLines(v.txns[0]!.txn, 'Test Index Fund')).toContainEqual(['of which stamp duty', '₹0.50']);
  });

  it('an order after 3 pm gets the next business day NAV, skipping the 3 March holiday', async () => {
    const s = await open();
    await s.place(form({ beforeCutoff: false }));
    expect(s.view().txns[0]?.line).toContain('on 2026-03-05');
  });

  it('selling everything four days later pays the 1% exit load and STT, and the note shows both', async () => {
    const s = await open();
    await s.place(form());
    await s.place(form({ action: 'redeem', date: '2026-03-06' }));
    const v = s.view();
    expect(v.holdings).toEqual([]);
    expect(v.cash).toBe('₹10,01,879.29');
    const note = fundNoteLines(v.txns[0]!.txn, 'Test Index Fund');
    expect(note).toContainEqual(['Exit load', '₹119.99']);
    expect(note).toContainEqual(['STT', '₹0.12']);
    expect(note).toContainEqual(['Cash received', '₹11,879.29']);
  });

  it('refuses orders the account cannot honour and does not save them', async () => {
    const kv = new MemoryKv();
    const s = await open(kv);
    expect(await s.place(form({ amount: '2000000' }))).toEqual({ ok: false, error: 'Order rejected: not enough cash in the fund account.' });
    expect(await s.place(form({ action: 'redeem' }))).toEqual({ ok: false, error: 'Order rejected: no units to sell.' });
    expect(await s.place(form({ fundId: 'nope' }))).toEqual({ ok: false, error: 'Choose a fund.' });
    expect(s.orderCount).toBe(0);
    expect((await open(kv)).orderCount).toBe(0);
  });

  it('a SIP buys instalments on their days and leaves later ones waiting for NAVs', async () => {
    const s = await open();
    await s.place(form({ action: 'sip', amount: '5000' }));
    const v = s.view();
    const first = v.txns.find((t) => t.txn.instalment === 1);
    const second = v.txns.find((t) => t.txn.instalment === 2);
    expect(first).toMatchObject({ status: 'done' });
    expect(first?.line).toContain('43.476 units');
    expect(second).toMatchObject({ status: 'pending', reason: 'the NAV for that day is not published yet' });
  });

  it('keeps its orders on the device and rebuilds the same account', async () => {
    const kv = new MemoryKv();
    await (await open(kv)).place(form());
    expect((await open(kv)).view()).toEqual((await open(kv)).view());
    expect((await open(kv)).view().cash).toBe('₹9,90,000.00');
  });
});

describe('fund orders in a profile backup', () => {
  it('are exported, counted in the preview and restored on another device', async () => {
    const kv = new MemoryKv();
    const profiles = new ProfileStore(kv, new MemorySecureStore(), () => NOW, () => KEY);
    const profile = await profiles.create('Sunil');
    const s = await open(profiles.scope(profile.id));
    await s.place(form());
    await s.place(form({ action: 'sip', amount: '5000' }));
    const snapshotId = demoMarket().snapshot.id;
    const out = await exportProfile({ device: kv, profileKv: profiles.scope(profile.id), profile, snapshotId, now: NOW, randomHex: () => KEY });
    const phoneKv = new MemoryKv();
    const phone = new ProfileStore(phoneKv, new MemorySecureStore(), () => NOW, () => 'b2'.repeat(32));
    await phone.create('Neil');
    const read = await readBackup(phoneKv, out.text, '', snapshotId);
    if (!read.ok) throw new Error(read.message);
    expect(read.backup.funds).toHaveLength(2);
    expect(await previewImport(read.backup, phone)).toMatchObject({ target: 'fresh', replaces: 'Neil', fundOrdersInFile: 2 });
    const target = await applyImport(read.backup, phone, NOW);
    const back = await FundSession.open(phone.scope(target.id), () => NOW, MARKET);
    expect(back.view()).toEqual(s.view());
  });

  it('are refused when a fund order in the file is malformed', async () => {
    const kv = new MemoryKv();
    const profiles = new ProfileStore(kv, new MemorySecureStore(), () => NOW, () => KEY);
    const profile = await profiles.create('Sunil');
    const snapshotId = demoMarket().snapshot.id;
    const out = await exportProfile({ device: kv, profileKv: profiles.scope(profile.id), profile, snapshotId, now: NOW, randomHex: () => KEY });
    const bundle = JSON.parse(out.text) as { items: unknown[] };
    bundle.items.push({ t: 'fund', order: { id: 1 } });
    const r = await readBackup(kv, JSON.stringify(bundle), KEY, snapshotId);
    expect(r.ok).toBe(false);
  });
});
