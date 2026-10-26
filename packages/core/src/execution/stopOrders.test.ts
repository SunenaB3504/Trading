import { describe, expect, it } from 'vitest';
import { istToUtcMillis } from '../calendar';
import { FixedClock } from '../clock';
import type { BarUnadj } from '../domain/market';
import type { Order } from '../domain/trading';
import { runReplay } from '../replay';
import type { ReplayConfig, ReplaySnapshot } from '../replay';
import { PaperExecutionAdapter } from './paperAdapter';
import type { OrderRequest } from './types';

// A share bought at the Monday 2026-10-19 open for 100.00, then protected by a stop. Tue 10-20 is a holiday.
const MON = '2026-10-19';
const WED = '2026-10-21';
const THU = '2026-10-22';
const FRI = '2026-10-23';

const bar = (date: string, open: number, high: number, low: number, close: number): BarUnadj => ({
  instrumentId: 'X',
  date,
  open,
  high,
  low,
  close,
  volume: 1_000,
  provider: 'test',
  snapshotId: 's',
  disputed: false,
  circuitFlag: 'none',
});
const QUIET = [bar(MON, 10_000, 10_100, 9_900, 10_050), bar(WED, 10_050, 10_150, 9_950, 10_100)];
const CRASH = bar(THU, 9_800, 9_850, 9_400, 9_500);
const snap = (bars: BarUnadj[]): ReplaySnapshot => ({ id: 's', bars: { X: bars }, bandPct: { X: null }, tickPaise: 5 });
const config = (endDate: string): ReplayConfig => ({
  capitalPaise: 100_000_000,
  startAt: istToUtcMillis('2026-10-01', '09:00'),
  endDate,
  actions: [],
});

const base: Order = {
  id: 'o1',
  decisionId: 'd1',
  instrumentId: 'X',
  side: 'buy',
  type: 'market',
  quantity: 10,
  limitPaise: null,
  validity: 'day',
  placedAt: istToUtcMillis('2026-10-16', '15:45'),
  tradingDate: '2026-10-16',
  status: 'open',
  source: 'human',
  rationale: '',
  fillRuleId: 'next-open@1',
  blockedReason: null,
};
const meta = { source: 'human' as const, bucket: null, tags: [] };
const req = (o: Partial<Order>, intent: 'entry' | 'exit' = 'exit'): OrderRequest => ({
  order: { ...base, ...o },
  intent,
  stopPaise: null,
  meta,
});
const buy = req({}, 'entry');
const stop = (o: Partial<Order> = {}) =>
  req({
    id: 'o2',
    side: 'sell',
    type: 'stop',
    triggerPaise: 9_500,
    triggerWhen: 'at_or_below',
    validity: 'gtt',
    placedAt: base.placedAt + 1,
    ...o,
  });

function adapter(bars: () => BarUnadj[], end = FRI): PaperExecutionAdapter {
  return new PaperExecutionAdapter(() => snap(bars()), config(end), new FixedClock(istToUtcMillis(end, '16:00')));
}

describe('stop and GTT orders through the paper adapter', () => {
  it('keeps a GTT stop pending while the price stays above it, then fills it when data shows the drop', async () => {
    let bars = [...QUIET];
    const a = adapter(() => bars);
    await a.placeOrder(buy, 'k1');
    await a.placeOrder(stop(), 'k2');
    expect(a.settle()).toBe(1); // the buy settles; the stop has seen only quiet sessions
    let orders = await a.getOrders();
    expect(orders.find((o) => o.orderId === 'o2')?.state).toBe('pending');
    expect((await a.getPositions())[0]?.quantity).toBe(10);
    bars = [...QUIET, CRASH];
    expect(a.settle()).toBe(1);
    orders = await a.getOrders();
    expect(orders.find((o) => o.orderId === 'o2')).toMatchObject({ state: 'filled', filledQuantity: 10, tradingDate: THU });
    expect(await a.getPositions()).toEqual([]);
    // sold at the 95.00 trigger after buying at the 100.00 open: a loss of 5.00 a share (-5,000 paise in all) plus charges
    expect(a.result().report.realisedPaise).toBe(-5_000);
    expect(a.result().report.feesPaise).toBeGreaterThan(0);
  });

  it('a day stop that is not set off on its one session expires with the reason', async () => {
    const a = adapter(() => QUIET);
    await a.placeOrder(buy, 'k1');
    await a.placeOrder(stop({ validity: 'day' }), 'k2');
    a.settle();
    expect((await a.getOrders()).find((o) => o.orderId === 'o2')).toMatchObject({ state: 'expired', reason: 'trigger_not_reached' });
  });

  it('cancels a waiting GTT order', async () => {
    const a = adapter(() => QUIET);
    await a.placeOrder(buy, 'k1');
    await a.placeOrder(stop(), 'k2');
    a.settle();
    expect(await a.cancelOrder('o2')).toEqual({ status: 'cancelled', orderId: 'o2' });
    expect((await a.getPositions())[0]?.quantity).toBe(10);
  });

  it('refuses orders whose shape does not hold together', async () => {
    const a = adapter(() => QUIET);
    const cases: Array<[string, Partial<Order>]> = [
      ['trigger_mismatch', { triggerPaise: null, triggerWhen: null }],
      ['trigger_mismatch', { id: 'o3', type: 'market', limitPaise: null, validity: 'day' }],
      ['limit_price_mismatch', { id: 'o4', type: 'stop_limit', limitPaise: null }],
      ['limit_beyond_trigger', { id: 'o5', type: 'stop_limit', limitPaise: 9_600 }],
      ['market_order_cannot_be_gtt', { id: 'o6', type: 'market', triggerPaise: null, triggerWhen: null }],
    ];
    for (const [i, [code, over]] of cases.entries()) {
      expect(await a.placeOrder(stop(over), `k${String(i)}`), code).toEqual({ status: 'rejected', reasonCode: code });
    }
  });

  it('gives the same report hash as a replay of the same orders', async () => {
    const bars = [...QUIET, CRASH];
    const a = adapter(() => bars);
    await a.placeOrder(buy, 'k1');
    await a.placeOrder(stop(), 'k2');
    a.settle();
    const direct = runReplay(snap(bars), [buy, stop()], config(FRI));
    expect(a.result().reportHash).toBe(direct.reportHash);
  });

  it('in a replay, a GTT that data never settles is reported as still waiting', () => {
    const r = runReplay(snap(QUIET), [buy, stop()], config(WED));
    expect(r.outcomes.find((o) => o.orderId === 'o2')).toMatchObject({ status: 'expired', reason: 'still_waiting_at_end_of_data' });
  });

  it('cannot sell shares it does not hold: a stop placed before the buy fills is refused by the ledger', () => {
    const early = stop({ placedAt: base.placedAt - 1 });
    const r = runReplay(snap([...QUIET, CRASH]), [buy, early], config(FRI));
    expect(r.outcomes.find((o) => o.orderId === 'o2')?.reason).toMatch(/ledger: cannot sell/);
  });
});
