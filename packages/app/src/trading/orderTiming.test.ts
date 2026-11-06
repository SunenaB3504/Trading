import { describe, expect, it } from 'vitest';
import { istToUtcMillis, LEARNING_MARKET_FORMAT, LEARNING_MARKET_VERSION } from '@trading/core';
import type { CompactBar, LearningMarket } from '@trading/core';
import { MemoryKv } from '../store/kv';
import { demoMarket, realMarket } from './market';
import type { OrderForm } from './orderRequest';
import { applyTiming, defaultTiming, marketNow, timingText, today } from './orderTiming';
import { PaperSession } from './paperSession';

// Friday 6 Nov 2026 is a trading day; 7 and 8 Nov are not regular sessions (Saturday; Sunday's muhurat session) and 10 Nov is a holiday
const FRI_2PM = istToUtcMillis('2026-11-06', '14:00');
const FRI_4PM = istToUtcMillis('2026-11-06', '16:00');
const form = (over: Partial<OrderForm> = {}): OrderForm => ({ instrumentId: 'X', side: 'buy', type: 'market', quantity: '10', limit: '', stop: '', date: '', ...over });

describe('when an order trades (owner, 2026-11-06)', () => {
  it("offers today's close only before 15:30 on a trading day, otherwise the next trading day", () => {
    expect(today(FRI_2PM)).toEqual({ date: '2026-11-06', closeOpen: true });
    expect(today(FRI_4PM).closeOpen).toBe(false);
    expect(defaultTiming(FRI_2PM)).toEqual({ when: 'today', date: '2026-11-06' });
    expect(defaultTiming(FRI_4PM)).toEqual({ when: 'date', date: '2026-11-09' });
  });

  it("makes a market order a close fill for that day, given now", () => {
    expect(applyTiming(form(), { when: 'today', date: '' }, FRI_2PM)).toEqual({ ok: true, form: form({ date: '2026-11-06', fillAt: 'close', placedAt: FRI_2PM }) });
    expect(applyTiming(form(), { when: 'date', date: '2026-11-11' }, FRI_4PM)).toMatchObject({ ok: true, form: { date: '2026-11-11', fillAt: 'close' } });
    expect(timingText(form(), { when: 'today', date: '' }, FRI_2PM)).toBe("at today's close (2026-11-06)");
  });

  it('refuses a close that has happened, a day without a session and a date past the calendar', () => {
    expect(applyTiming(form(), { when: 'today', date: '' }, FRI_4PM).ok).toBe(false);
    expect(applyTiming(form(), { when: 'date', date: '2026-11-06' }, FRI_4PM).ok).toBe(false);
    expect(applyTiming(form(), { when: 'date', date: '2026-11-05' }, FRI_2PM).ok).toBe(false);
    const holiday = applyTiming(form(), { when: 'date', date: '2026-11-07' }, FRI_2PM);
    expect(holiday).toMatchObject({ ok: false, error: expect.stringContaining('2026-11-09') as unknown });
    expect(applyTiming(form(), { when: 'date', date: '2027-01-04' }, FRI_2PM).ok).toBe(false);
    expect(applyTiming(form(), { when: 'date', date: '6-11-2026' }, FRI_2PM).ok).toBe(false);
  });

  it('watches a limit or stop order from the next session at the earliest, never from a day under way', () => {
    const limit = form({ type: 'limit', limit: '100' });
    // given during Friday's session: placed after Friday's close, so first watched on Monday 9 Nov
    expect(applyTiming(limit, { when: 'today', date: '' }, FRI_2PM)).toEqual({ ok: true, form: { ...limit, date: '2026-11-06' } });
    expect(timingText(limit, { when: 'today', date: '' }, FRI_2PM)).toBe('watched from 2026-11-09');
    // a later start date: placed after the session before it
    expect(applyTiming(limit, { when: 'date', date: '2026-11-12' }, FRI_2PM)).toEqual({ ok: true, form: { ...limit, date: '2026-11-11' } });
  });

  it("uses the device clock on the live market, and the market's own day for demo prices", () => {
    expect(marketNow(demoMarket(), FRI_2PM)).toBe(istToUtcMillis(demoMarket().defaultDate, '16:00'));
  });
});

const bar = (d: string, open: number, close: number): CompactBar => [d, open, close + 100, open - 100, close, 1_000, 0];
const file: LearningMarket = {
  format: LEARNING_MARKET_FORMAT,
  version: LEARNING_MARKET_VERSION,
  id: 'timing-test',
  builtAt: 1,
  source: 't',
  from: '2026-11-04',
  to: '2026-11-06',
  tradableFrom: '2020-04-01',
  instruments: [{ id: 'X', symbol: 'X', requested: 'X', isin: null, firstDate: '2026-11-04', lastDate: '2026-11-06' }],
  bars: { X: [bar('2026-11-04', 10_000, 10_100), bar('2026-11-05', 10_200, 10_300), bar('2026-11-06', 10_400, 10_550)] },
  actions: [],
  missing: [],
};

describe("today's close in the book", () => {
  it("fills at that day's close once its prices are there; waits while they are not", async () => {
    const m = realMarket(file);
    const s = await PaperSession.open(new MemoryKv(), () => 1, m);
    const today6 = applyTiming(form(), { when: 'today', date: '' }, FRI_2PM);
    if (!today6.ok) throw new Error(today6.error);
    expect((await s.place(today6.form)).ok).toBe(true);
    const later = applyTiming(form(), { when: 'date', date: '2026-11-09' }, FRI_2PM);
    if (!later.ok) throw new Error(later.error);
    expect((await s.place(later.form)).ok).toBe(true);
    const v = await s.view();
    expect(v.orders.map((o) => o.state)).toEqual(['pending', 'filled']);
    expect(v.positions[0]?.quantity).toBe(10);
    // bought at the close of the 6th (105.50 a share): the average includes the charges, so it is a little above
    expect(v.positions[0]?.averagePaise).toBeGreaterThanOrEqual(10_550);
    expect(v.positions[0]?.averagePaise).toBeLessThan(10_600);
  });
});
