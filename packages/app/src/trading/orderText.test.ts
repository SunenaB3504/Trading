import { describe, expect, it } from 'vitest';
import { MemoryKv } from '../store/kv';
import { describeOrder, reasonText } from './orderText';
import { PaperSession } from './paperSession';
import { makeOrderRequest } from './orderRequest';
import type { OrderForm } from './orderRequest';

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

describe('reasons in words', () => {
  it('translates the engine codes and leaves an unknown one visible', () => {
    expect(reasonText(null)).toBeNull();
    expect(reasonText('limit_not_reached')).toBe('the price never reached your limit');
    expect(reasonText('circuit_upper')).toMatch(/upper price limit/);
    expect(reasonText('ledger: cannot sell 10: only 0 held')).toBe(
      'you cannot sell 10 shares: you hold 0',
    );
    expect(reasonText('ledger: insufficient cash')).toMatch(/not enough cash/);
    expect(reasonText('something_new')).toBe('something_new');
  });
});

describe('the Orders list lines', () => {
  it('give the side, quantity, instrument, price type, decision date and id, so similar orders differ', async () => {
    const s = await PaperSession.open(new MemoryKv(), () => 1);
    await s.place(form());
    await s.place(form({ type: 'limit', limit: '1000' }));
    await s.place(form({ type: 'limit', limit: '1097.85' }));
    const lines = (await s.view()).orders.map((o) => o.line);
    expect(lines).toEqual([
      'buy 10 of 10 AAA, limit ₹1,097.85, decided 2026-03-02 (h-0003)',
      'buy 10 AAA, limit ₹1,000.00, decided 2026-03-02 (h-0002)',
      'buy 10 of 10 AAA, market, decided 2026-03-02 (h-0001)',
    ]);
  });

  it('show an expired order with its reason in words', async () => {
    const s = await PaperSession.open(new MemoryKv(), () => 1);
    await s.place(form({ type: 'limit', limit: '500' }));
    const order = (await s.view()).orders[0];
    expect(order).toMatchObject({ state: 'expired', reason: 'the price never reached your limit' });
  });

  it('show a sell with no shares refused in words', async () => {
    const s = await PaperSession.open(new MemoryKv(), () => 1);
    await s.place(form({ side: 'sell' }));
    expect((await s.view()).orders[0]?.reason).toBe('you cannot sell 10 shares: you hold 0');
  });

  it('copes with a record whose request is unknown', () => {
    expect(
      describeOrder(
        { requestedQuantity: 5, state: 'pending', filledQuantity: 0 } as never,
        undefined,
      ),
    ).toBe('5');
  });
});

describe('the placed message when the order cannot be decided yet', () => {
  it('says the order stays pending when the decision date is after the data', async () => {
    const s = await PaperSession.open(new MemoryKv(), () => 1);
    const r = await s.place(form({ date: '2026-10-19' }));
    expect(r).toMatchObject({ ok: true, state: 'pending' });
    const filled = await s.place(form());
    expect(filled).toMatchObject({ ok: true, state: 'filled' });
  });
});

describe('form errors are reported together', () => {
  it('lists the quantity, date and limit problems in one message, one per line', () => {
    const r = makeOrderRequest(
      form({ quantity: 'x', date: '2026-03-07', type: 'limit', limit: '' }),
      1,
    );
    expect(r.ok).toBe(false);
    const lines = r.ok ? [] : r.error.split(String.fromCharCode(10));
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatch(/Quantity must be a whole number/);
    expect(lines[1]).toMatch(/regular trading day/);
    expect(lines[2]).toMatch(/Enter the limit price/);
  });

  it('still gives a single message for a single problem', () => {
    const r = makeOrderRequest(form({ quantity: '0' }), 1);
    expect(r.ok ? '' : r.error).toBe('Quantity must be a whole number of shares, at least 1.');
  });
});

describe('a refused sell does not use up the day’s depository charge (found in UAT-2, A10)', () => {
  const roundTrip = async (refusedFirst: boolean) => {
    const s = await PaperSession.open(new MemoryKv(), () => 1);
    if (refusedFirst) await s.place(form({ side: 'sell' })); // nothing held: refused at the fill
    await s.place(form());
    await s.place(form({ side: 'sell' }));
    return s;
  };

  it('charges the same on the real sell whether or not a refused sell came first', async () => {
    const clean = await roundTrip(false);
    const withRefused = await roundTrip(true);
    expect((await withRefused.view()).cash).toBe((await clean.view()).cash);
    const net = (x: PaperSession) => x.report().net.totalPnlPaise;
    expect(net(withRefused)).toBe(net(clean));
    expect(net(clean)).toBe(-3983); // buy charges 13.07 plus sell charges 26.76, no price move
  });

  it('lists the refused sell as rejected and the real sell as filled', async () => {
    const orders = (await (await roundTrip(true)).view()).orders;
    expect(orders.map((o) => o.state)).toEqual(['filled', 'filled', 'rejected']);
  });
});
