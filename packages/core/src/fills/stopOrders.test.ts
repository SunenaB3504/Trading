import { describe, expect, it } from 'vitest';
import { istToUtcMillis } from '../calendar';
import type { BarUnadj } from '../domain/market';
import type { Order } from '../domain/trading';
import { fillOrder } from './index';
import type { FillContext } from './index';

// Hand-worked cases for SL-M, SL and GTT orders (MIP v4.1 Stage 3). Calendar 2026: Fri 10-16 trades, Mon 10-19
// trades, Tue 10-20 is a holiday, Wed 10-21, Thu 10-22 and Fri 10-23 trade. Orders are placed Friday after the close.
const MON = '2026-10-19';
const WED = '2026-10-21';
const THU = '2026-10-22';

const bar = (open: number, high: number, low: number, close: number): BarUnadj => ({
  instrumentId: 'i1',
  date: MON,
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
const ctx = (b: BarUnadj | null): FillContext => ({
  bar: b,
  prevClosePaise: 10_000,
  bandPct: null,
  suspended: false,
  eligible: true,
  tickPaise: 5,
});
const days = (d: Record<string, BarUnadj>) => (_id: string, date: string) => ctx(d[date] ?? null);

interface Spec {
  side: 'buy' | 'sell';
  type: 'stop' | 'stop_limit' | 'limit';
  trigger?: number;
  when?: 'at_or_below' | 'at_or_above';
  limit?: number;
  gtt?: boolean;
  until?: string;
}
const make = (s: Spec): Order => ({
  id: 'o1',
  decisionId: 'd1',
  instrumentId: 'i1',
  side: s.side,
  type: s.type,
  quantity: 10,
  limitPaise: s.limit ?? null,
  triggerPaise: s.trigger ?? null,
  triggerWhen: s.when ?? null,
  validUntil: s.until ?? null,
  validity: s.gtt === true ? 'gtt' : 'day',
  placedAt: istToUtcMillis('2026-10-16', '15:45'),
  tradingDate: '2026-10-16',
  status: 'open',
  source: 'human',
  rationale: '',
  fillRuleId: 'next-open@1',
  blockedReason: null,
});
const sellStop = (over: Partial<Spec> = {}) =>
  make({ side: 'sell', type: 'stop', trigger: 9_500, when: 'at_or_below', ...over });
const run = (o: Order, d: Record<string, BarUnadj>) => fillOrder(o, 'exit', days(d));

describe('SL-M (stop-market) sell, trigger 95.00 at or below', () => {
  it('fills at the trigger when the session trades through it', () => {
    const r = run(sellStop(), { [MON]: bar(9_800, 9_900, 9_450, 9_600) });
    expect([r.status, r.fill?.pricePaise, r.fill?.tradingDate]).toEqual(['filled', 9_500, MON]);
  });
  it('fills at the open when the session opens already below the trigger (a gap)', () => {
    expect(run(sellStop(), { [MON]: bar(9_400, 9_450, 9_300, 9_350) }).fill?.pricePaise).toBe(9_400);
  });
  it('fills when the open is exactly the trigger', () => {
    expect(run(sellStop(), { [MON]: bar(9_500, 9_600, 9_450, 9_550) }).fill?.pricePaise).toBe(9_500);
  });
  it('expires, saying the trigger was not reached, when the low stays above it', () => {
    const r = run(sellStop(), { [MON]: bar(9_800, 9_900, 9_600, 9_700) });
    expect([r.status, r.blockedReason]).toEqual(['expired', 'trigger_not_reached']);
  });
  it('does not fill a day order the day after: it lives one session', () => {
    const r = run(sellStop(), {
      [MON]: bar(9_800, 9_900, 9_600, 9_700),
      [WED]: bar(9_400, 9_450, 9_300, 9_350),
    });
    expect(r.status).toBe('expired');
  });
});

describe('SL-M buy (breakout), trigger 102.00 at or above', () => {
  const buyStop = () => make({ side: 'buy', type: 'stop', trigger: 10_200, when: 'at_or_above' });
  it('fills at the trigger when the session trades up through it', () => {
    expect(run(buyStop(), { [MON]: bar(10_000, 10_300, 9_950, 10_250) }).fill?.pricePaise).toBe(10_200);
  });
  it('fills at the open when it gaps above the trigger', () => {
    expect(run(buyStop(), { [MON]: bar(10_300, 10_400, 10_250, 10_350) }).fill?.pricePaise).toBe(10_300);
  });
  it('does not fill when the high stays below the trigger', () => {
    expect(run(buyStop(), { [MON]: bar(10_000, 10_150, 9_950, 10_100) }).status).toBe('expired');
  });
});

describe('SL (stop-limit)', () => {
  const sellSl = () =>
    make({ side: 'sell', type: 'stop_limit', trigger: 9_500, when: 'at_or_below', limit: 9_450 });
  it('sell: fills at the trigger when the limit is still satisfied there', () => {
    expect(run(sellSl(), { [MON]: bar(9_800, 9_900, 9_450, 9_600) }).fill?.pricePaise).toBe(9_500);
  });
  it('sell: a gap below the limit that never recovers leaves it unfilled (the danger of SL)', () => {
    const r = run(sellSl(), { [MON]: bar(9_400, 9_450, 9_300, 9_350) });
    expect([r.status, r.blockedReason]).toEqual(['expired', 'limit_not_reached']);
  });
  it('sell: a gap below the limit that recovers past it fills at the limit', () => {
    expect(run(sellSl(), { [MON]: bar(9_400, 9_480, 9_300, 9_350) }).fill?.pricePaise).toBe(9_450);
  });
  it('sell: a gap that opens at or above the limit fills at the open', () => {
    expect(run(sellSl(), { [MON]: bar(9_460, 9_470, 9_300, 9_350) }).fill?.pricePaise).toBe(9_460);
  });
  const buySl = () =>
    make({ side: 'buy', type: 'stop_limit', trigger: 10_200, when: 'at_or_above', limit: 10_250 });
  it('buy: a gap above the limit that never comes back is unfilled', () => {
    expect(run(buySl(), { [MON]: bar(10_300, 10_400, 10_250, 10_350) }).status).toBe('expired');
  });
  it('buy: a gap above the limit that comes back through it fills at the limit', () => {
    expect(run(buySl(), { [MON]: bar(10_300, 10_400, 10_200, 10_350) }).fill?.pricePaise).toBe(10_250);
  });
});

describe('GTT (good till triggered)', () => {
  const none = bar(9_800, 9_900, 9_600, 9_700);
  it('waits through quiet sessions and fills on the session that sets it off, skipping the holiday', () => {
    const r = run(sellStop({ gtt: true }), {
      [MON]: none,
      [WED]: none,
      [THU]: bar(9_600, 9_650, 9_450, 9_500),
    });
    expect([r.status, r.fill?.tradingDate, r.fill?.pricePaise]).toEqual(['filled', THU, 9_500]);
    expect(r.attempts.map((a) => a.date)).toEqual([MON, WED, THU]);
  });
  it('stays open, not expired, while the data has not reached a session', () => {
    expect(run(sellStop({ gtt: true }), { [MON]: none, [WED]: none }).status).toBe('open');
  });
  it('expires after its last valid session', () => {
    const r = run(sellStop({ gtt: true, until: MON }), {
      [MON]: none,
      [WED]: bar(9_000, 9_100, 8_900, 9_000),
    });
    expect([r.status, r.blockedReason]).toEqual(['expired', 'trigger_not_reached']);
  });
  it('a target (sell when the price rises to 105.00) fills at the open if it gaps above', () => {
    const target = make({ side: 'sell', type: 'stop', trigger: 10_500, when: 'at_or_above', gtt: true });
    const r = run(target, { [MON]: none, [WED]: bar(10_600, 10_700, 10_550, 10_650) });
    expect([r.status, r.fill?.pricePaise, r.fill?.tradingDate]).toEqual(['filled', 10_600, WED]);
  });
  it('a good-till-cancelled limit buy waits for the price to come to it', () => {
    const buy = make({ side: 'buy', type: 'limit', limit: 9_000, gtt: true });
    const r = run(buy, { [MON]: none, [WED]: bar(9_100, 9_150, 8_950, 9_050) });
    expect([r.status, r.fill?.pricePaise, r.fill?.tradingDate]).toEqual(['filled', 9_000, WED]);
  });
});
