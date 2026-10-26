import { describe, expect, it } from 'vitest';
import { checkMistakes } from './check';
import type { MistakeFill, MistakeInput, MistakeOrder } from './check';

// Hand-worked cases for the mistake checker (SSD v4.1 §6.2). Account ₹10,00,000 = 100,000,000 paise.
const LIMITS = { maxPositionPct: 20, averagingDownPct: 5, revengeLossPct: 2, maxTradesPerWeek: 10 };
const CAPITAL = 100_000_000;

const order = (id: string, date: string, over: Partial<MistakeOrder> = {}): MistakeOrder => ({ id, instrumentId: 'A', side: 'buy', type: 'market', date, ...over });
const fill = (orderId: string, date: string, quantity: number, pricePaise: number, over: Partial<MistakeFill> = {}): MistakeFill => ({ orderId, instrumentId: 'A', side: 'buy', quantity, pricePaise, date, ...over });
const run = (over: Partial<MistakeInput>) =>
  checkMistakes({ orders: [], fills: [], journalExit: new Set(), capitalPaise: CAPITAL, limits: LIMITS, ...over });
const rules = (over: Partial<MistakeInput>) => run(over).map((f) => f.rule);

describe('no exit plan', () => {
  const buy = order('o1', '2026-03-02');
  it('flags a buy with neither a stop order nor a written exit', () => {
    expect(run({ orders: [buy] })).toEqual([{ rule: 'no_exit_plan', orderId: 'o1', date: '2026-03-02', detail: 'Bought without a stop-loss order or a written exit plan.' }]);
  });
  it('is satisfied by a journal exit note', () => {
    expect(rules({ orders: [buy], journalExit: new Set(['o1']) })).toEqual([]);
  });
  it('is satisfied by a sell stop order on the same stock given that day or later, not another stock or an earlier day', () => {
    const stop = (over: Partial<MistakeOrder>) => order('s1', '2026-03-02', { side: 'sell', type: 'stop', ...over });
    expect(rules({ orders: [buy, stop({})] })).toEqual([]);
    expect(rules({ orders: [buy, stop({ type: 'stop_limit', date: '2026-03-03' })] })).toEqual([]);
    expect(rules({ orders: [buy, stop({ instrumentId: 'B' })] })).toEqual(['no_exit_plan']);
    expect(rules({ orders: [buy, stop({ date: '2026-02-27' })] })).toEqual(['no_exit_plan']);
    expect(rules({ orders: [buy, stop({ type: 'limit' })] })).toEqual(['no_exit_plan']);
  });
  it('does not flag a sell', () => {
    expect(rules({ orders: [order('o2', '2026-03-02', { side: 'sell' })] })).toEqual([]);
  });
});

describe('position too large', () => {
  const exit = new Set(['b1', 'b2']);
  it('flags a position worth more than 20% of the account and not exactly 20%', () => {
    // 1000 shares at ₹250 = ₹2,50,000 = 25%
    expect(rules({ journalExit: exit, fills: [fill('b1', '2026-03-03', 1000, 25_000)] })).toEqual(['position_too_large']);
    // 800 shares at ₹250 = ₹2,00,000 = exactly 20%
    expect(rules({ journalExit: exit, fills: [fill('b1', '2026-03-03', 800, 25_000)] })).toEqual([]);
  });
  it('counts what is already held: only the buy that takes it over is flagged', () => {
    const f = run({ journalExit: exit, fills: [fill('b1', '2026-03-03', 500, 25_000), fill('b2', '2026-03-04', 400, 25_000)] });
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ rule: 'position_too_large', orderId: 'b2' });
    expect(f[0]?.detail).toBe('The position in A was worth ₹225000.00 after this buy, over 20% of ₹1000000.00.');
  });
  it('follows the profile setting', () => {
    expect(rules({ journalExit: exit, fills: [fill('b1', '2026-03-03', 500, 25_000)], limits: { ...LIMITS, maxPositionPct: 10 } })).toEqual(['position_too_large']);
  });
});

describe('averaging down', () => {
  const exit = new Set(['b1', 'b2']);
  it('flags a buy more than 5% under the average cost of what is held', () => {
    expect(rules({ journalExit: exit, fills: [fill('b1', '2026-03-03', 100, 10_000), fill('b2', '2026-03-04', 100, 9_400)] })).toEqual(['averaging_down']);
  });
  it('does not flag exactly 5% under, a higher price, a first buy or a different stock', () => {
    expect(rules({ journalExit: exit, fills: [fill('b1', '2026-03-03', 100, 10_000), fill('b2', '2026-03-04', 100, 9_500)] })).toEqual([]);
    expect(rules({ journalExit: exit, fills: [fill('b1', '2026-03-03', 100, 10_000), fill('b2', '2026-03-04', 100, 12_000)] })).toEqual([]);
    expect(rules({ journalExit: exit, fills: [fill('b1', '2026-03-03', 100, 10_000), fill('b2', '2026-03-04', 100, 5_000, { instrumentId: 'B' })] })).toEqual([]);
  });
  it('uses the average cost of all lots still held', () => {
    // 100 at 100 and 100 at 110 average 105; 99.50 is 5.2% under
    expect(rules({ journalExit: new Set(['b1', 'b2', 'b3']), fills: [fill('b1', '2026-03-03', 100, 10_000), fill('b2', '2026-03-04', 100, 11_000), fill('b3', '2026-03-05', 10, 9_950)] })).toEqual(['averaging_down']);
  });
});

describe('revenge trading', () => {
  const buy = fill('b1', '2026-03-02', 1000, 10_000);
  const loss = fill('s1', '2026-03-03', 1000, 7_000, { side: 'sell' }); // lost ₹30,000 = 3%
  const exit = new Set(['b1', 'b2', 'b3']);
  it('flags a new buy the next day after a sale that lost over 2% of the account', () => {
    const f = run({ journalExit: exit, fills: [buy, loss, fill('b2', '2026-03-04', 10, 5_000, { instrumentId: 'B' })] }).filter((x) => x.rule === 'revenge_trading');
    expect(f).toMatchObject([{ orderId: 'b2', date: '2026-03-04' }]);
    expect(f[0]?.detail).toBe('A new buy within a day of a sale that lost ₹30000.00, over 2% of the account.');
  });
  it('flags a buy on the same day as the losing sale, but not two days later', () => {
    expect(rules({ journalExit: exit, fills: [buy, loss, fill('b2', '2026-03-03', 10, 5_000, { instrumentId: 'B' })] })).toContain('revenge_trading');
    expect(rules({ journalExit: exit, fills: [buy, loss, fill('b2', '2026-03-05', 10, 5_000, { instrumentId: 'B' })] })).not.toContain('revenge_trading');
  });
  it('needs the loss to be over the limit, and a gain is not a loss', () => {
    const small = fill('s1', '2026-03-03', 1000, 8_000, { side: 'sell' }); // lost exactly 2%
    expect(rules({ journalExit: exit, fills: [buy, small, fill('b2', '2026-03-04', 10, 5_000, { instrumentId: 'B' })] })).not.toContain('revenge_trading');
    const gain = fill('s1', '2026-03-03', 1000, 12_000, { side: 'sell' });
    expect(rules({ journalExit: exit, fills: [buy, gain, fill('b2', '2026-03-04', 10, 5_000, { instrumentId: 'B' })] })).not.toContain('revenge_trading');
  });
});

describe('overtrading', () => {
  const week = (n: number, day = '2026-03-02'): MistakeOrder[] => Array.from({ length: n }, (_, i) => order(`o${String(i)}`, day, { side: 'sell' }));
  it('flags a week with more orders than the limit, once, at the order that broke it', () => {
    const f = run({ orders: week(11) });
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ rule: 'overtrading', orderId: 'o10', detail: '11 orders in one week; your limit is 10.' });
  });
  it('does not flag exactly the limit', () => {
    expect(rules({ orders: week(10) })).toEqual([]);
  });
  it('counts Monday to Sunday: Friday and the next Monday are different weeks', () => {
    const split = [...week(6, '2026-03-06'), ...week(5, '2026-03-09').map((o) => ({ ...o, id: `n${o.id}` }))];
    expect(rules({ orders: split })).toEqual([]);
    const sameWeek = [...week(6, '2026-03-02'), ...week(5, '2026-03-08').map((o) => ({ ...o, id: `n${o.id}` }))]; // Monday and Sunday
    expect(rules({ orders: sameWeek })).toEqual(['overtrading']);
  });
});

describe('holding losers, cutting winners', () => {
  const trade = (id: string, inst: string, from: string, to: string, exitPrice: number): MistakeFill[] => [
    fill(`b${id}`, from, 10, 10_000, { instrumentId: inst }),
    fill(`s${id}`, to, 10, exitPrice, { instrumentId: inst, side: 'sell' }),
  ];
  const exits = new Set(['b1', 'b2', 'b3', 'b4']);
  it('flags losers held at least twice as long as winners', () => {
    const fills = [...trade('1', 'A', '2026-01-05', '2026-02-14', 9_000), ...trade('2', 'B', '2026-01-05', '2026-02-14', 9_000), ...trade('3', 'C', '2026-02-02', '2026-02-07', 11_000), ...trade('4', 'D', '2026-02-02', '2026-02-07', 11_000)];
    const f = run({ journalExit: exits, fills }).filter((x) => x.rule === 'holding_losers');
    expect(f).toHaveLength(1);
    expect(f[0]?.detail).toBe('Losing trades were held 40.0 days on average, winners 5.0.');
  });
  it('needs two winners and two losers, and a real gap', () => {
    const one = [...trade('1', 'A', '2026-01-05', '2026-02-14', 9_000), ...trade('3', 'C', '2026-02-02', '2026-02-07', 11_000), ...trade('4', 'D', '2026-02-02', '2026-02-07', 11_000)];
    expect(rules({ journalExit: exits, fills: one })).not.toContain('holding_losers');
    const even = [...trade('1', 'A', '2026-02-02', '2026-02-12', 9_000), ...trade('2', 'B', '2026-02-02', '2026-02-12', 9_000), ...trade('3', 'C', '2026-02-02', '2026-02-12', 11_000), ...trade('4', 'D', '2026-02-02', '2026-02-12', 11_000)];
    expect(rules({ journalExit: exits, fills: even })).not.toContain('holding_losers');
  });
  it('sells the oldest shares first', () => {
    // 10 bought on 5 Jan and 10 on 5 Feb; selling 10 on 14 Feb uses the January lot: held 40 days
    const fills = [
      fill('b1', '2026-01-05', 10, 10_000, { instrumentId: 'A' }),
      fill('b2', '2026-02-05', 10, 10_000, { instrumentId: 'A' }),
      fill('s1', '2026-02-14', 10, 9_000, { instrumentId: 'A', side: 'sell' }),
      ...trade('3', 'C', '2026-02-02', '2026-02-07', 11_000),
      ...trade('4', 'D', '2026-02-02', '2026-02-07', 11_000),
      ...trade('5', 'E', '2026-01-05', '2026-02-14', 9_000),
    ];
    expect(run({ journalExit: new Set(['b1', 'b2', 'b3', 'b4', 'b5']), fills }).find((x) => x.rule === 'holding_losers')?.detail).toBe('Losing trades were held 40.0 days on average, winners 5.0.');
  });
});

describe('the whole checker', () => {
  const orders = [order('o1', '2026-03-02'), order('o2', '2026-03-03')];
  const fills = [fill('o1', '2026-03-03', 1000, 25_000), fill('o2', '2026-03-04', 100, 20_000)];
  it('gives the same flags whatever order the book is supplied in, oldest first', () => {
    const a = run({ orders, fills });
    expect(run({ orders: [...orders].reverse(), fills: [...fills].reverse() })).toEqual(a);
    expect(a.map((f) => `${f.date} ${f.rule}`)).toEqual([
      '2026-03-02 no_exit_plan',
      '2026-03-03 no_exit_plan',
      '2026-03-03 position_too_large',
      '2026-03-04 averaging_down',
      '2026-03-04 position_too_large',
    ]);
  });
  it('flags nothing for an empty book', () => {
    expect(run({})).toEqual([]);
  });
});
