import { describe, expect, it } from 'vitest';
import { MemoryKv } from '../store/kv';
import { makeOrderRequest } from './orderRequest';
import type { OrderForm } from './orderRequest';
import { describeOrder, priceWords, reasonText } from './orderText';
import { PaperSession } from './paperSession';

const form = (over: Partial<OrderForm> = {}): OrderForm => ({
  instrumentId: 'AAA',
  side: 'sell',
  type: 'stop',
  quantity: '10',
  limit: '',
  stop: '',
  trigger: '950',
  validity: 'day',
  until: '',
  date: '2026-03-02',
  ...over,
});
const NOW = () => 1_760_000_000_000;
const msg = (o: Partial<OrderForm>) => {
  const r = makeOrderRequest(form(o), 1);
  return r.ok ? 'ok' : r.error;
};

describe('stop and GTT order forms (MIP v4.1 Stage 3)', () => {
  it('builds a stop-loss sell with the protective direction by default', () => {
    const r = makeOrderRequest(form(), 1);
    expect(r.ok && r.request.order).toMatchObject({
      type: 'stop',
      triggerPaise: 95_000,
      triggerWhen: 'at_or_below',
      limitPaise: null,
      validity: 'day',
      validUntil: null,
    });
  });

  it('builds a breakout buy rising to the trigger, and a sell target when asked', () => {
    const buy = makeOrderRequest(form({ side: 'buy', trigger: '1100' }), 1);
    expect(buy.ok && buy.request.order.triggerWhen).toBe('at_or_above');
    const target = makeOrderRequest(form({ when: 'at_or_above', trigger: '1200', validity: 'gtt', until: '2026-06-30' }), 1);
    expect(target.ok && target.request.order).toMatchObject({ triggerWhen: 'at_or_above', validity: 'gtt', validUntil: '2026-06-30' });
  });

  it('keeps a plain order free of trigger fields', () => {
    const r = makeOrderRequest(form({ type: 'market', trigger: '' }), 1);
    expect(r.ok && r.request.order).toMatchObject({ triggerPaise: null, triggerWhen: null, validity: 'day' });
  });

  it('explains each mistake in plain words', () => {
    expect(msg({ trigger: '' })).toMatch(/trigger price/);
    expect(msg({ type: 'stop_limit', limit: '' })).toMatch(/limit price/);
    expect(msg({ type: 'stop_limit', limit: '960' })).toMatch(/at or below the trigger/);
    expect(msg({ type: 'stop_limit', side: 'buy', limit: '940' })).toMatch(/at or above the trigger/);
    expect(msg({ type: 'market', validity: 'gtt' })).toMatch(/cannot be good till triggered/);
    expect(msg({ validity: 'gtt', until: '2026-03-01' })).toMatch(/last valid day/);
    expect(msg({ type: 'stop_limit', limit: '940' })).toBe('ok');
  });

  it('describes each type in words a learner can read', () => {
    const o = (over: Partial<OrderForm>) => {
      const r = makeOrderRequest(form(over), 1);
      if (!r.ok) throw new Error(r.error);
      return r.request.order;
    };
    expect(priceWords(o({}))).toBe('stop-loss market (SL-M) when the price falls to ₹950.00');
    expect(priceWords(o({ type: 'stop_limit', limit: '940', validity: 'gtt' }))).toBe(
      'stop-loss limit (SL) when the price falls to ₹950.00, then limit ₹940.00, good till triggered',
    );
    expect(reasonText('trigger_not_reached')).toBe('the price never reached your trigger');
  });

  it('keeps a GTT stop waiting, shows it in the order list, and cancelling is not needed for a day order that expires', async () => {
    const s = await PaperSession.open(new MemoryKv(), NOW);
    expect((await s.place(form({ side: 'buy', type: 'market', trigger: '' }))).ok).toBe(true);
    const gtt = await s.place(form({ trigger: '500', validity: 'gtt' }));
    expect(gtt).toMatchObject({ ok: true, state: 'pending' });
    const day = await s.place(form({ trigger: '500' }));
    expect(day).toMatchObject({ ok: true, state: 'expired' });
    const v = await s.view();
    expect(v.orders.find((o) => o.line.includes('good till triggered'))?.state).toBe('pending');
    expect(v.orders.find((o) => o.id === 'h-0003')?.reason).toBe('the price never reached your trigger');
    expect(v.positions[0]?.quantity).toBe(10);
  });

  it('fills a GTT target when the price rises to it, at the trigger or the gap-up open', async () => {
    const s = await PaperSession.open(new MemoryKv(), NOW);
    await s.place(form({ side: 'buy', type: 'market', trigger: '' }));
    const target = await s.place(form({ when: 'at_or_above', trigger: '1200', validity: 'gtt' }));
    expect(target).toMatchObject({ ok: true, state: 'filled' });
    const v = await s.view();
    expect(v.positions).toEqual([]);
    expect(describeOrder({ orderId: 'x', state: 'filled', reason: null, requestedQuantity: 10, filledQuantity: 10, tradingDate: null, riskReasons: [] }, undefined)).toBe('10');
  });

  it('cancels a waiting GTT order, keeps the cancellation after a reload, and refuses to cancel a filled one', async () => {
    const kv = new MemoryKv();
    const s = await PaperSession.open(kv, NOW);
    await s.place(form({ side: 'buy', type: 'market', trigger: '' }));
    await s.place(form({ trigger: '500', validity: 'gtt' }));
    expect(await s.cancel('h-0002')).toEqual({ ok: true });
    expect((await s.cancel('h-0001')).ok).toBe(false); // the buy has filled
    expect((await s.cancel('h-0002')).ok).toBe(false); // already cancelled
    const again = await PaperSession.open(kv, NOW);
    const line = (await again.view()).orders.find((o) => o.id === 'h-0002');
    expect([line?.state, line?.reason]).toEqual(['cancelled', 'you cancelled it']);
  });

  it('refuses to sell what is not held once the trigger is reached, shown as the ledger reason', async () => {
    const s = await PaperSession.open(new MemoryKv(), NOW);
    const r = await s.place(form({ when: 'at_or_above', trigger: '1200', validity: 'gtt' }));
    expect(r.ok).toBe(true);
    const line = (await s.view()).orders[0];
    expect(line?.state).toBe('rejected');
    expect(line?.reason).toMatch(/cannot sell 10/);
  });
});
