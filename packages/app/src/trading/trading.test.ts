import { buildFixtureScenario, computeCosts, runReplay } from '@trading/core';
import { describe, expect, it } from 'vitest';
import { formatPaise } from '../format/rupees';
import { MemoryKv } from '../store/kv';
import { previewCosts } from './costPreview';
import { toWinLossView } from '../viewModels/winLossView';
import { makeOrderRequest, parseRupees } from './orderRequest';
import type { OrderForm } from './orderRequest';
import { PaperSession, REQUESTS_KEY, demoMarket } from './paperSession';

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
const NOW = () => 1_760_000_000_000;

describe('rupee entry', () => {
  it('reads up to two decimals and refuses anything else', () => {
    expect(parseRupees('1250')).toBe(125_000);
    expect(parseRupees('1250.5')).toBe(125_050);
    expect(parseRupees(' 99.99 ')).toBe(9_999);
    for (const bad of ['', '0', '0.00', '-5', '1.234', '1,250', 'abc', '1e3', '9999999999'])
      expect(parseRupees(bad), bad).toBeNull();
  });
});

describe('order form to order request', () => {
  it('builds a human, next-open order tagged at entry', () => {
    const r = makeOrderRequest(form({ type: 'limit', limit: '1100.50', stop: '950' }), 3);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.request.order).toMatchObject({
      id: 'h-0003',
      side: 'buy',
      type: 'limit',
      quantity: 10,
      limitPaise: 110_050,
      source: 'human',
      fillRuleId: 'next-open@1',
      tradingDate: '2026-03-02',
    });
    expect(r.request).toMatchObject({ intent: 'entry', stopPaise: 95_000 });
    expect(r.request.meta).toEqual({ source: 'human', bucket: null, tags: ['manual'] });
  });

  it('treats a sell as an exit with no stop', () => {
    const r = makeOrderRequest(form({ side: 'sell', stop: '900' }), 1);
    expect(r.ok && r.request).toMatchObject({ intent: 'exit', stopPaise: null });
  });

  it('explains what is wrong with the form in plain words', () => {
    const msg = (o: Partial<OrderForm>) => {
      const r = makeOrderRequest(form(o), 1);
      return r.ok ? 'ok' : r.error;
    };
    expect(msg({ quantity: '0' })).toMatch(/Quantity/);
    expect(msg({ quantity: '2.5' })).toMatch(/Quantity/);
    expect(msg({ date: '2026-03-01' })).toMatch(/trading day/); // a Sunday
    expect(msg({ date: 'tomorrow' })).toMatch(/trading day/);
    expect(msg({ type: 'limit', limit: '' })).toMatch(/limit price/);
    expect(msg({ stop: 'x' })).toMatch(/stop price/);
  });
});

describe('cost preview (FR-T7)', () => {
  const { snapshot } = demoMarket();

  it('matches the cost model for a delivery trade at the last close', () => {
    const p = previewCosts(snapshot, {
      instrumentId: 'AAA',
      side: 'buy',
      quantity: 10,
      date: '2026-03-02',
    });
    expect(p).not.toBeNull();
    const price = p?.estimatedPricePaise ?? 0;
    const direct = computeCosts({
      date: '2026-03-03',
      exchange: 'NSE',
      side: 'buy',
      product: 'delivery',
      turnoverPaise: price * 10,
      chargeDp: false,
    });
    expect(p?.rows.find((r) => r.label === 'Total charges')?.value).toBe(formatPaise(direct.total));
    expect(p?.caveats).toContain('broker.profile-assumed');
  });

  it('charges the DP fee on a sell only, and gives nothing for no quantity or no price history', () => {
    const buy = previewCosts(snapshot, {
      instrumentId: 'AAA',
      side: 'buy',
      quantity: 10,
      date: '2026-03-02',
    });
    const sell = previewCosts(snapshot, {
      instrumentId: 'AAA',
      side: 'sell',
      quantity: 10,
      date: '2026-03-02',
    });
    expect(buy?.rows.find((r) => r.label === 'DP charge')?.value).toBe('₹0.00');
    expect(sell?.rows.find((r) => r.label === 'DP charge')?.value).not.toBe('₹0.00');
    expect(
      previewCosts(snapshot, { instrumentId: 'AAA', side: 'buy', quantity: 0, date: '2026-03-02' }),
    ).toBeNull();
    expect(
      previewCosts(snapshot, { instrumentId: 'AAA', side: 'buy', quantity: 1, date: '2025-01-01' }),
    ).toBeNull();
  });
});

describe('paper session through the execution adapter', () => {
  it('fills a buy at the next open and leaves the same cash as a direct replay of that order', async () => {
    const kv = new MemoryKv();
    const s = await PaperSession.open(kv, NOW);
    const placed = await s.place(form());
    expect(placed).toEqual({ ok: true, orderId: 'h-0001' });
    const view = await s.view();
    expect(view.orders).toEqual([expect.objectContaining({ id: 'h-0001', state: 'filled' })]);
    expect(view.positions).toEqual([
      expect.objectContaining({ instrumentId: 'AAA', quantity: 10 }),
    ]);

    const sc = buildFixtureScenario();
    const built = makeOrderRequest(form(), 1);
    if (!built.ok) throw new Error('form should be valid');
    const direct = runReplay(sc.snapshot, [built.request], sc.config);
    expect(view.cash).toBe(formatPaise(direct.report.cashPaise));
  });

  it('shows a sell with nothing to sell as rejected, with the reason', async () => {
    const s = await PaperSession.open(new MemoryKv(), NOW);
    await s.place(form({ side: 'sell' }));
    const view = await s.view();
    expect(view.orders[0]).toMatchObject({ state: 'rejected' });
    expect(view.orders[0]?.reason).toMatch(/ledger/);
    expect(view.cash).toBe(formatPaise(100_000_000));
  });

  it('reports a bad form without placing anything', async () => {
    const kv = new MemoryKv();
    const s = await PaperSession.open(kv, NOW);
    expect(await s.place(form({ quantity: 'x' }))).toMatchObject({ ok: false });
    expect((await s.view()).orders).toEqual([]);
    expect(await kv.get(REQUESTS_KEY)).toBeNull();
  });

  it('rebuilds the same book from the saved orders after a restart', async () => {
    const kv = new MemoryKv();
    const a = await PaperSession.open(kv, NOW);
    await a.place(form());
    await a.place(form({ instrumentId: 'BBB', quantity: '5', date: '2026-03-05' }));
    await a.place(form({ side: 'sell', quantity: '4', date: '2026-04-01' }));
    const before = await a.view();
    const b = await PaperSession.open(kv, NOW);
    expect(await b.view()).toEqual(before);
    expect(before.orders).toHaveLength(3);
    await b.place(form({ quantity: '1', date: '2026-05-04' }));
    expect((await b.view()).orders.map((o) => o.id)).toEqual([
      'h-0004',
      'h-0003',
      'h-0002',
      'h-0001',
    ]);
  });
});

describe('Ledger A beside Ledger B (FR-L2, FR-L3)', () => {
  it('shows an empty book with no portfolio line, tied to the snapshot', async () => {
    const s = await PaperSession.open(new MemoryKv(), NOW);
    const c = s.comparison();
    expect(c).toMatchObject({
      snapshotId: 'fixture-v1',
      benchmark: 'none loaded',
      portfolio: [],
      trades: [],
    });
  });

  it('shows a closed round trip with your return, staying-in returns, timing and the path after the exit', async () => {
    const s = await PaperSession.open(new MemoryKv(), NOW);
    await s.place(form({ quantity: '10', date: '2026-03-02' }));
    await s.place(form({ side: 'sell', quantity: '10', date: '2026-04-01' }));
    const c = s.comparison();
    expect(c.trades).toHaveLength(1);
    const card = c.trades[0];
    expect(card?.title).toMatch(/^AAA, 10 shares, 2026-03-04 to 2026-04-0\d/);
    const labels = card?.lines.map((l) => l.label);
    expect(labels).toEqual([
      'Net return on cost',
      'Index over the same windows',
      'Best and worst during the hold',
      'After the exit',
    ]);
    expect(card?.lines[0]?.market).toMatch(/^staying in: \+5 .*\+20 .*\+60 .* sessions$/);
    expect(card?.lines[1]?.market).toBe('no benchmark loaded');
    expect(card?.lines[3]?.market).toMatch(/^\+1 .*, \+5 .*, \+20 /);
    expect(c.portfolio).toHaveLength(1);
    expect(c.portfolio[0]?.market).toMatch(/equal-weight buy and hold .*; cash 0\.0%/);
  });

  it('shows an open position as open, without a post-exit line', async () => {
    const s = await PaperSession.open(new MemoryKv(), NOW);
    await s.place(form({ quantity: '5', date: '2026-03-02' }));
    const card = s.comparison().trades[0];
    expect(card?.title).toMatch(/since 2026-03-04, open$/);
    expect(card?.lines.map((l) => l.label)).not.toContain('After the exit');
    expect(card?.lines[0]?.label).toBe('Return on cost so far');
  });
});

describe('win/loss report from the owner book (FR-W1 to FR-W4)', () => {
  it('is empty with no trades, and warns about small samples with one trade, in both views', async () => {
    const s = await PaperSession.open(new MemoryKv(), NOW);
    const empty = toWinLossView(s.report(), 'net');
    expect(empty.headline[0]).toEqual({ label: 'Closed trades', value: '0' });
    expect(empty.warnings[0]).toMatch(/No closed trades yet/);
    await s.place(form({ quantity: '10', date: '2026-03-02' }));
    await s.place(form({ side: 'sell', quantity: '10', date: '2026-04-01' }));
    const net = toWinLossView(s.report(), 'net');
    const gross = toWinLossView(s.report(), 'gross');
    expect(net.headline[0]).toEqual({ label: 'Closed trades', value: '1' });
    expect(net.warnings.join(' ')).toMatch(/Only 1 closed trades/);
    expect(net.warnings.join(' ')).toMatch(/At least two closed trades/);
    expect(net.warnings.join(' ')).toMatch(/after all costs/);
    expect(gross.warnings.join(' ')).toMatch(/before brokerage/);
    expect(net.headline.at(-1)?.label).toBe('Net profit');
    expect(gross.headline.at(-1)?.label).toBe('Gross profit');
    expect(net.breakdowns.find((t) => t.title === 'By stock')?.rows).toEqual([
      expect.objectContaining({ key: 'AAA', count: '1', thin: true }),
    ]);
  });

  it('gives intervals once there are two trades, and the same numbers each time', async () => {
    const s = await PaperSession.open(new MemoryKv(), NOW);
    await s.place(form({ quantity: '10', date: '2026-03-02' }));
    await s.place(form({ side: 'sell', quantity: '10', date: '2026-03-20' }));
    await s.place(form({ instrumentId: 'CCC', quantity: '10', date: '2026-03-02' }));
    await s.place(form({ instrumentId: 'CCC', side: 'sell', quantity: '10', date: '2026-03-24' }));
    const a = toWinLossView(s.report(), 'net');
    expect(a.headline.find((r) => r.label === 'Win rate')?.value).toMatch(/95% interval/);
    expect(a.headline.find((r) => r.label === 'Closed trades')?.value).toBe('2');
    expect(toWinLossView(s.report(), 'net')).toEqual(a);
  });
});
