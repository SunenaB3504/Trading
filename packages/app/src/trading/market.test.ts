import { LEARNING_MARKET_FORMAT, LEARNING_MARKET_VERSION } from '@trading/core';
import type { CompactBar, LearningMarket } from '@trading/core';
import { describe, expect, it } from 'vitest';
import { exportProfile, readBackup, applyImport } from '../backup/backupService';
import { ProfileStore } from '../profiles/profiles';
import { MemorySecureStore } from '../secure/secureStore';
import { MemoryKv } from '../store/kv';
import { PRACTICE_CAPITAL_PAISE, demoMarket, realMarket, requestsKey } from './market';
import { previewCosts } from './costPreview';
import type { OrderForm } from './orderRequest';
import { PaperSession, REQUESTS_KEY } from './paperSession';

const DAYS = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'];
const series = (start: number): CompactBar[] =>
  DAYS.map((d, i): CompactBar => [d, start + i * 1_000, start + i * 1_000 + 2_000, start + i * 1_000 - 2_000, start + i * 1_000 + 500, 50_000, 0]);

const file: LearningMarket = {
  format: LEARNING_MARKET_FORMAT,
  version: LEARNING_MARKET_VERSION,
  id: 'nse-learning-v1',
  builtAt: 1,
  source: 'test',
  from: '2026-10-12',
  to: '2026-10-16',
  tradableFrom: '2020-04-01',
  instruments: [
    { id: 'TATAMOTORS', symbol: 'TMPV', requested: 'TATAMOTORS', isin: 'INE155A01022', firstDate: '2026-10-12', lastDate: '2026-10-16' },
    { id: 'RELIANCE', symbol: 'RELIANCE', requested: 'RELIANCE', isin: 'INE002A01018', firstDate: '2026-10-12', lastDate: '2026-10-16' },
  ],
  bars: { TATAMOTORS: series(70_000), RELIANCE: series(300_000) },
  actions: [],
  missing: [],
};
const NOW = 1_760_000_000_000;
const form = (over: Partial<OrderForm> = {}): OrderForm => ({
  instrumentId: 'RELIANCE',
  side: 'buy',
  type: 'market',
  quantity: '10',
  limit: '',
  stop: '',
  date: '2026-10-14',
  ...over,
});

describe('real-price market (MIP v4.1 Stage 2, laptop slice)', () => {
  const m = realMarket(file);

  it('lists stocks by symbol, starts with ₹10 lakh and a date whose next session has prices', () => {
    expect(m.instruments).toEqual(['RELIANCE', 'TATAMOTORS']);
    expect(m.symbols.TATAMOTORS).toBe('TMPV');
    expect(m.config.capitalPaise).toBe(PRACTICE_CAPITAL_PAISE);
    expect(m.defaultDate).toBe('2026-10-15');
    expect(realMarket(file)).toBe(m); // decoded once per file
  });

  it('fills a real order at the next session open and shows the trading symbol', async () => {
    const s = await PaperSession.open(new MemoryKv(), () => NOW, m);
    const r = await s.place(form({ instrumentId: 'TATAMOTORS' }));
    expect(r).toMatchObject({ ok: true, state: 'filled', dataEnds: '2026-10-16' });
    const v = await s.view();
    expect(v.positions[0]).toMatchObject({ symbol: 'TMPV', quantity: 10 });
    expect(v.orders[0]?.line).toMatch(/buy 10 of 10 TMPV, market, decided 2026-10-14/);
  });

  it('refuses an order before the charges table starts', async () => {
    const s = await PaperSession.open(new MemoryKv(), () => NOW, realMarket({ ...file, tradableFrom: '2026-10-15' }));
    const r = await s.place(form({ date: '2026-10-14' }));
    expect(r).toMatchObject({ ok: false });
    expect(r.ok ? '' : r.error).toMatch(/from 2026-10-15/);
  });

  it('gives no cost preview, and no error, for a date before the charges table starts (UAT-6 R5)', () => {
    const old = realMarket({
      ...file,
      instruments: [{ id: 'GITANJALI', symbol: 'GITANJALI', requested: 'GITANJALI', isin: null, firstDate: '2018-01-01', lastDate: '2019-04-01' }],
      bars: { GITANJALI: [['2018-01-01', 6_000, 6_200, 5_900, 6_100, 1_000, 0], ['2019-04-01', 2_000, 2_100, 1_900, 2_050, 1_000, 0]] },
    });
    for (const date of ['2018-01-02', '2019-04-01', '2026-10-15']) {
      const args = { instrumentId: 'GITANJALI', side: 'buy' as const, quantity: 10, date };
      expect(() => previewCosts(old.snapshot, args), date).not.toThrow();
    }
    expect(previewCosts(old.snapshot, { instrumentId: 'GITANJALI', side: 'buy', quantity: 10, date: '2018-01-02' })).toBeNull();
    // after the table starts, the last price before the date is used (here the 2019 close)
    expect(previewCosts(old.snapshot, { instrumentId: 'GITANJALI', side: 'buy', quantity: 10, date: '2026-10-15' })?.estimatedPricePaise).toBe(2_050);
  });

  it('keeps the demo book and the real book apart, the demo one under its old key', async () => {
    const kv = new MemoryKv();
    await (await PaperSession.open(kv, () => NOW, m)).place(form());
    await (await PaperSession.open(kv, () => NOW)).place(form({ instrumentId: 'AAA', date: '2026-03-02' }));
    expect(await kv.keys()).toEqual([REQUESTS_KEY, `${REQUESTS_KEY}@nse-learning-v1`]);
    expect(requestsKey(demoMarket().id, REQUESTS_KEY)).toBe(REQUESTS_KEY);
    expect((await (await PaperSession.open(kv, () => NOW, m)).view()).orders).toHaveLength(1);
  });

  it('backs up and restores both books of a profile', async () => {
    let n = 0;
    const hex = () => (++n).toString(16).padStart(16, '0').repeat(4);
    const make = async () => {
      const kv = new MemoryKv();
      const profiles = new ProfileStore(kv, new MemorySecureStore(), () => NOW, hex);
      return { kv, profiles, profile: await profiles.create('Sunil') };
    };
    const a = await make();
    const scope = a.profiles.scope(a.profile.id);
    await (await PaperSession.open(scope, () => NOW, m)).place(form());
    await (await PaperSession.open(scope, () => NOW)).place(form({ instrumentId: 'AAA', date: '2026-03-02' }));
    const out = await exportProfile({ device: a.kv, profileKv: scope, profile: a.profile, snapshotId: demoMarket().id, now: NOW, randomHex: () => 'a1'.repeat(32) });
    expect(out.count).toBe(2);
    const b = await make();
    const read = await readBackup(b.kv, out.text, '', demoMarket().id);
    if (!read.ok) throw new Error(read.message);
    expect(Object.keys(read.backup.books).sort()).toEqual(['fixture-v1', 'nse-learning-v1']);
    const target = await applyImport(read.backup, b.profiles, NOW);
    const restored = b.profiles.scope(target.id);
    expect((await (await PaperSession.open(restored, () => NOW, m)).view()).orders).toHaveLength(1);
    expect((await (await PaperSession.open(restored, () => NOW)).view()).orders).toHaveLength(1);
  });
});
