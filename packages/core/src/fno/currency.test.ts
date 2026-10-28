import { describe, expect, it } from 'vitest';
import { applyFill, marginOf, openBook } from './book';
import { contractId, contractName, futureExpiries, isListed, optionExpiries, parseContract } from './contracts';
import type { Contract } from './contracts';
import { fnoCosts } from './costs';
import { fnoDataFrom } from './facts';
import { quote } from './quote';
import { orderProblem } from './simulate';

const FUT = (expiry: string): Contract => ({ u: 'USDINR', kind: 'FUT', expiry, strike: null });
const bar = (date: string, open: number, close: number) => ({ date, open, close });

describe('USD/INR futures', () => {
  it('has a contract id, a name and no options', () => {
    const c = FUT('2026-07-29');
    expect(parseContract(contractId(c))).toEqual(c);
    expect(contractName(c)).toBe('USD/INR 2026-07-29 future');
    expect(optionExpiries('USDINR', '2026-07-01')).toEqual([]);
    expect(isListed({ u: 'USDINR', kind: 'CE', expiry: '2026-07-29', strike: 95 }, '2026-07-01', 95)).toBe(false);
  });

  it('expires two working days before the last working day of the month', () => {
    // July 2026 ends on a Friday (the 31st): the 29th is the expiry. January 2026 ends on a Saturday: the last working day is the 30th, so the 28th.
    expect(futureExpiries('2026-07-01', 'USDINR')[0]).toBe('2026-07-29');
    expect(futureExpiries('2026-01-05', 'USDINR')[0]).toBe('2026-01-28');
    expect(futureExpiries('2026-07-29', 'USDINR')[0]).toBe('2026-08-27');
    expect(futureExpiries('2026-07-01', 'USDINR')).toHaveLength(3);
  });

  it('is priced as the rate plus 2.5% a year of carry, to a whole paisa', () => {
    const data = fnoDataFrom({ USDINR: [bar('2026-07-01', 9500, 9500), bar('2026-07-02', 9500, 9500)] });
    const q = quote(FUT('2026-07-29'), data, '2026-07-01', 'close');
    expect(q?.paise).toBe(Math.round(9500 * Math.exp(0.025 * (28 / 365))));
    expect(q?.vol).toBeNull();
  });

  it('a lot of 1,000 dollars: 10 paise a dollar is 100 rupees; margin 3% of ₹95,000; no STT', () => {
    const c = FUT('2026-07-29');
    let s = applyFill(openBook(100_000_000), c, 'buy', 1, 9500, '2026-07-01');
    expect(marginOf(s, () => 9500)).toBe(285_000);
    s = applyFill(s, c, 'sell', 1, 9510, '2026-07-02');
    expect(s.trades[s.trades.length - 1]?.grossPaise).toBe(10_000);
    const k = fnoCosts('FUT', 'sell', 9_500_000, 'USDINR');
    expect(k.sttPaise).toBe(0);
    expect(k.exchangePaise).toBe(38);
    expect(k.totalPaise).toBe(2000 + 38 + Math.round(((2000 + 38) * 18) / 100));
    expect(fnoCosts('FUT', 'sell', 9_500_000).sttPaise).toBeGreaterThan(0);
  });

  it('the sessions are the days every given underlying has a price, and the other index has none', () => {
    const data = fnoDataFrom({ USDINR: [bar('2026-07-01', 1, 1), bar('2026-07-02', 1, 1), bar('2026-07-03', 1, 1)], NIFTY: [bar('2026-07-02', 1, 1), bar('2026-07-03', 1, 1)] });
    expect(data.dates).toEqual(['2026-07-02', '2026-07-03']);
    expect(data.spot('BANKNIFTY', '2026-07-02', 'close')).toBeNull();
    expect(orderProblem(data, '2026-07-02', FUT('2026-07-29'), 1)).toBeNull();
    expect(orderProblem(data, '2026-07-02', FUT('2026-09-29'), 1)).toMatch(/not open/);
  });
});
