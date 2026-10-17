import { describe, expect, it } from 'vitest';
import { FixedClock } from '../clock';
import { istToUtcMillis } from '../calendar';
import { buildFixtureScenario, runReplay } from '../replay';
import type { ReplaySnapshot } from '../replay';
import { PaperExecutionAdapter } from './paperAdapter';
import type { IExecutionAdapter, OrderRequest } from './types';

// Mirrors fixtures/golden/replay_scenario_v1.json: the adapter must reproduce the replay exactly.
const GOLDEN = 'e0b425cce01d3276c53909e3af23d198a90d49d14f140fafca9a8a2be9b4b3a8';

const scenario = buildFixtureScenario();
const requests = (): OrderRequest[] =>
  scenario.orders.map((o) => ({
    order: o.order,
    intent: o.intent,
    stopPaise: o.stopPaise,
    meta: o.meta,
  }));
const make = (snapshot: () => ReplaySnapshot = () => scenario.snapshot) =>
  new PaperExecutionAdapter(
    snapshot,
    scenario.config,
    new FixedClock(istToUtcMillis('2026-06-30', '16:00')),
  );
async function placeAll(a: IExecutionAdapter): Promise<void> {
  for (const r of requests()) await a.placeOrder(r, `key-${r.order.id}`);
}

describe('paper adapter equals the replay (same engine, same hash)', () => {
  it('reproduces the golden report hash when the same twelve orders are placed and settled', async () => {
    const a = make();
    await placeAll(a);
    expect(a.settle()).toBe(12);
    expect(a.result().reportHash).toBe(GOLDEN);
    const direct = runReplay(scenario.snapshot, scenario.orders, scenario.config);
    expect(JSON.stringify(a.result().report)).toBe(JSON.stringify(direct.report));
    expect(JSON.stringify(a.result().outcomes)).toBe(JSON.stringify(direct.outcomes));
  });

  it('returns cash and positions that match the report', async () => {
    const a = make();
    await placeAll(a);
    a.settle();
    const report = a.result().report;
    expect(Number.isSafeInteger(await a.getCashBalance())).toBe(true);
    expect(await a.getCashBalance()).toBe(report.cashPaise);
    const positions = await a.getPositions();
    const held = report.positions.filter((p) => p.quantity > 0);
    expect(positions.map((p) => [p.instrumentId, p.quantity, p.basisPaise])).toEqual(
      held.map((p) => [p.instrumentId, p.quantity, p.basisPaise]),
    );
  });

  it('lists every order with its outcome and the reason it did not fill', async () => {
    const a = make();
    await placeAll(a);
    a.settle();
    const orders = await a.getOrders();
    expect(orders).toHaveLength(12);
    const states = Object.fromEntries(orders.map((o) => [o.orderId, o.state]));
    expect(states.o01).toBe('filled');
    expect(orders.filter((o) => o.state !== 'filled').every((o) => o.reason !== null)).toBe(true);
  });
});

describe('placement', () => {
  it('returns the same result for the same key and request, and places the order once', async () => {
    const a = make();
    const r = requests()[0] as OrderRequest;
    const first = await a.placeOrder(r, 'k');
    const again = await a.placeOrder(r, 'k');
    expect(first).toEqual({ status: 'accepted', orderId: r.order.id });
    expect(again).toEqual(first);
    expect(await a.getOrders()).toHaveLength(1);
  });

  it('refuses a key reused for a different request', async () => {
    const a = make();
    const [r1, r2] = requests() as [OrderRequest, OrderRequest];
    await a.placeOrder(r1, 'k');
    expect(await a.placeOrder(r2, 'k')).toEqual({
      status: 'rejected',
      reasonCode: 'idempotency_key_reused',
    });
  });

  it('rejects orders that are malformed, duplicated or for an unknown instrument', async () => {
    const a = make();
    const r = requests()[0] as OrderRequest;
    const code = async (req: OrderRequest, key: string) => {
      const x = await a.placeOrder(req, key);
      return x.status === 'rejected' ? x.reasonCode : x.status;
    };
    expect(await code({ ...r, order: { ...r.order, quantity: 0 } }, 'a')).toBe('invalid_quantity');
    expect(await code({ ...r, order: { ...r.order, quantity: 1.5 } }, 'b')).toBe(
      'invalid_quantity',
    );
    expect(await code({ ...r, order: { ...r.order, limitPaise: 100 } }, 'c')).toBe(
      'limit_price_mismatch',
    );
    expect(await code({ ...r, order: { ...r.order, instrumentId: 'ZZZ' } }, 'd')).toBe(
      'unknown_instrument',
    );
    expect(await code(r, 'e')).toBe('accepted');
    expect(await code(r, 'f')).toBe('duplicate_order_id');
  });
});

describe('cancel and the wait for data', () => {
  it('keeps an order pending until its fill session has a bar, then fills it', async () => {
    let upTo = '2026-01-12';
    const snap = (): ReplaySnapshot => ({
      ...scenario.snapshot,
      bars: Object.fromEntries(
        Object.entries(scenario.snapshot.bars).map(([id, bars]) => [
          id,
          bars.filter((b) => b.date <= upTo),
        ]),
      ),
    });
    const a = make(snap);
    const r = requests()[0] as OrderRequest; // placed 2026-01-12 after the close
    await a.placeOrder(r, 'k');
    expect(a.settle()).toBe(0);
    expect((await a.getOrders())[0]?.state).toBe('pending');
    upTo = '2026-01-13';
    expect(a.settle()).toBe(1);
    expect((await a.getOrders())[0]).toMatchObject({ state: 'filled', filledQuantity: 80 });
    expect(await a.getPositions()).toEqual([
      expect.objectContaining({ instrumentId: 'AAA', quantity: 80 }),
    ]);
  });

  it('cancels a pending order so it is never filled, and refuses to cancel anything else', async () => {
    const a = make();
    const r = requests()[0] as OrderRequest;
    await a.placeOrder(r, 'k');
    expect(await a.cancelOrder(r.order.id)).toEqual({ status: 'cancelled', orderId: r.order.id });
    expect(a.settle()).toBe(0);
    expect(await a.getOrders()).toEqual([
      expect.objectContaining({
        orderId: r.order.id,
        state: 'cancelled',
        reason: 'cancelled_by_user',
      }),
    ]);
    expect(await a.getPositions()).toEqual([]);
    expect(await a.cancelOrder(r.order.id)).toMatchObject({ reasonCode: 'already_final' });
    expect(await a.cancelOrder('nope')).toMatchObject({ reasonCode: 'unknown_order' });
    const b = make();
    await b.placeOrder(r, 'k');
    b.settle();
    expect(await b.cancelOrder(r.order.id)).toMatchObject({ reasonCode: 'already_final' });
  });
});
