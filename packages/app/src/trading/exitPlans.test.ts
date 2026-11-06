import { describe, expect, it } from 'vitest';
import { LEARNING_MARKET_FORMAT, LEARNING_MARKET_VERSION } from '@trading/core';
import type { BarUnadj, CompactBar, LearningMarket } from '@trading/core';
import { MemoryKv } from '../store/kv';
import { exitEvent, readExitPlan } from './exitPlans';
import type { ExitPlan } from './exitPlans';
import { realMarket } from './market';
import type { OrderForm } from './orderRequest';
import { PaperSession } from './paperSession';

const b = (date: string, open: number, high: number, low: number, close: number): BarUnadj => ({
  instrumentId: 'X',
  date,
  open,
  high,
  low,
  close,
  volume: 1_000,
  provider: 'nse-bhavcopy',
  snapshotId: 't',
  disputed: false,
  circuitFlag: 'none',
});
const plan = (over: Partial<ExitPlan> = {}): ExitPlan => ({
  id: 'p',
  instrumentId: 'X',
  quantity: 10,
  stopPaise: 9_000,
  targetPaise: 12_000,
  exitDate: '2026-10-21',
  mode: 'auto',
  startDate: '2026-10-14',
  status: 'active',
  ...over,
});

describe('exit plan rules (owner, 2026-11-06)', () => {
  const bars = [
    b('2026-10-14', 10_000, 15_000, 5_000, 10_000), // the start day itself never counts
    b('2026-10-15', 10_000, 10_500, 9_500, 10_200),
    b('2026-10-16', 10_200, 11_000, 9_800, 10_900),
    b('2026-10-19', 10_900, 11_200, 10_500, 11_000),
    b('2026-10-20', 11_000, 11_300, 10_800, 11_100),
    b('2026-10-21', 11_100, 11_400, 10_900, 11_250),
  ];

  it('sells at the close of the exit date when no price level was reached first', () => {
    expect(exitEvent(plan(), bars)).toEqual({ kind: 'date', date: '2026-10-21', pricePaise: 11_250 });
  });

  it('a stop or target reached earlier comes first; a gap past it sells at the open', () => {
    expect(exitEvent(plan({ targetPaise: 11_200 }), bars)).toEqual({ kind: 'target', date: '2026-10-19', pricePaise: 11_200 });
    expect(exitEvent(plan({ stopPaise: 9_600 }), bars)).toEqual({ kind: 'stop', date: '2026-10-15', pricePaise: 9_600 });
    const gap = [...bars.slice(0, 1), b('2026-10-15', 8_500, 8_800, 8_400, 8_600)];
    expect(exitEvent(plan(), gap)).toEqual({ kind: 'stop', date: '2026-10-15', pricePaise: 8_500 });
  });

  it('takes the stop when one day touches both levels (a daily bar cannot say which came first)', () => {
    expect(exitEvent(plan({ stopPaise: 9_900, targetPaise: 10_400 }), bars)?.kind).toBe('stop');
  });

  it('a holiday exit date sells on the next session; nothing yet when the date is still ahead', () => {
    expect(exitEvent(plan({ exitDate: '2026-10-18' }), bars)?.date).toBe('2026-10-19');
    expect(exitEvent(plan({ exitDate: '2026-11-30' }), bars)).toBeNull();
  });

  it('checks what was typed against the holding and the last close', () => {
    const read = (stop: string, target: string, exitDate: string, quantity = '10') =>
      readExitPlan({ quantity, stop, target, exitDate, mode: 'ask' }, 10, 10_000, '2026-10-16');
    expect(read('90', '120', '2026-10-21')).toEqual({ ok: true, quantity: 10, stopPaise: 9_000, targetPaise: 12_000, exitDate: '2026-10-21' });
    expect(read('', '', '2026-10-19').ok).toBe(true);
    expect(read('', '', '').ok).toBe(false);
    expect(read('101', '', '').ok).toBe(false);
    expect(read('', '99', '').ok).toBe(false);
    expect(read('', '', '2026-10-16').ok).toBe(false);
    expect(read('', '', '2026-10-18').ok).toBe(false);
    expect(read('90', '', '', '11').ok).toBe(false);
  });
});

// 2026-10-20 is an exchange holiday
const DAYS = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-19', '2026-10-21', '2026-10-22'];
const bar = (d: string, close: number): CompactBar => [d, close, close + 500, close - 500, close, 1_000, 0];
const closes = [100_000, 100_000, 100_000, 101_000, 102_000, 103_000, 104_000, 105_000];
const fileUpTo = (last: string, lows: Record<string, number> = {}): LearningMarket => ({
  format: LEARNING_MARKET_FORMAT,
  version: LEARNING_MARKET_VERSION,
  id: 'exit-test',
  builtAt: 1,
  source: 't',
  from: '2026-10-12',
  to: last,
  tradableFrom: '2020-04-01',
  instruments: [{ id: 'X', symbol: 'X', requested: 'X', isin: null, firstDate: '2026-10-12', lastDate: last }],
  bars: {
    X: DAYS.filter((d) => d <= last).map((d, i) => {
      const c = bar(d, closes[i] ?? 0);
      return lows[d] === undefined ? c : [c[0], c[1], c[2], lows[d] as number, c[4], c[5], c[6]];
    }),
  },
  actions: [],
  missing: [],
});
const buy: OrderForm = { instrumentId: 'X', side: 'buy', type: 'market', quantity: '10', limit: '', stop: '', date: '2026-10-13' };

describe('exit plans in the book', () => {
  it('auto: when new prices reach the exit date, one sell at that close is made and filled', async () => {
    const kv = new MemoryKv();
    const s = await PaperSession.open(kv, () => 1, realMarket(fileUpTo('2026-10-16')));
    expect((await s.place(buy)).ok).toBe(true);
    expect(await s.setExitPlan('X', { quantity: '10', stop: '900', target: '', exitDate: '2026-10-21', mode: 'auto' })).toEqual({ ok: true });
    expect((await s.view()).positions[0]?.plan?.status).toBe('active');
    // later prices arrive: the stop is never touched, the date comes
    const later = await PaperSession.open(kv, () => 2, realMarket(fileUpTo('2026-10-22')));
    const v = await later.view();
    expect(v.positions).toEqual([]);
    const exit = v.orders.find((o) => o.id === 'x-0001');
    expect(exit?.state).toBe('filled');
    // opening again changes nothing: the plan is done and its order stays the only one
    const again = await PaperSession.open(kv, () => 3, realMarket(fileUpTo('2026-10-22')));
    expect((await again.view()).orders.filter((o) => o.id.startsWith('x-'))).toHaveLength(1);
  });

  it('auto: a stop touched before the date sells at the stop, and the date is never used', async () => {
    const kv = new MemoryKv();
    const s = await PaperSession.open(kv, () => 1, realMarket(fileUpTo('2026-10-16')));
    await s.place(buy);
    await s.setExitPlan('X', { quantity: '10', stop: '1000', target: '', exitDate: '2026-10-22', mode: 'auto' });
    const later = await PaperSession.open(kv, () => 2, realMarket(fileUpTo('2026-10-22', { '2026-10-19': 99_000 })));
    const v = await later.view();
    expect(v.positions).toEqual([]);
    expect(v.orders.filter((o) => o.id.startsWith('x-')).map((o) => o.state)).toEqual(['filled']);
  });

  it('ask: nothing sells; the plan waits as reached until the person confirms, then sells at the next open', async () => {
    const kv = new MemoryKv();
    const s = await PaperSession.open(kv, () => 1, realMarket(fileUpTo('2026-10-16')));
    await s.place(buy);
    await s.setExitPlan('X', { quantity: '6', stop: '', target: '', exitDate: '2026-10-19', mode: 'ask' });
    const later = await PaperSession.open(kv, () => 2, realMarket(fileUpTo('2026-10-21')));
    const held = (await later.view()).positions[0];
    expect(held?.quantity).toBe(10);
    expect(held?.plan).toMatchObject({ status: 'reached', event: { kind: 'date', date: '2026-10-19' } });
    const sold = await later.sellReached('X');
    expect(sold.ok).toBe(true);
    // placed after the 21st: it waits for the next session's prices, then sells 6 of the 10
    expect((await later.view()).positions[0]?.quantity).toBe(10);
    const next = await PaperSession.open(kv, () => 3, realMarket(fileUpTo('2026-10-22')));
    expect((await next.view()).positions[0]).toMatchObject({ quantity: 4, plan: null });
  });

  it('a plan can be changed or taken away before it is reached', async () => {
    const kv = new MemoryKv();
    const s = await PaperSession.open(kv, () => 1, realMarket(fileUpTo('2026-10-16')));
    await s.place(buy);
    await s.setExitPlan('X', { quantity: '10', stop: '', target: '', exitDate: '2026-10-19', mode: 'auto' });
    await s.setExitPlan('X', { quantity: '10', stop: '', target: '', exitDate: '2026-10-21', mode: 'auto' });
    expect((await s.view()).positions[0]?.plan?.exitDate).toBe('2026-10-21');
    await s.removeExitPlan('X');
    const later = await PaperSession.open(kv, () => 2, realMarket(fileUpTo('2026-10-22')));
    expect((await later.view()).positions[0]).toMatchObject({ quantity: 10, plan: null });
  });
});
