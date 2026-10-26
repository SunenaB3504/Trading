import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applicableNavDate, exitLoadPpm, runFunds, sipDates } from './index';
import type { FundInfo, FundOrder } from './index';

// Hand-worked cases for the mutual fund practice account (MIP v4.1 Stage 3). 2026 calendar: Fri 10-16, Mon 10-19,
// Tue 10-20 holiday (Dussehra), Wed 10-21; Sat 10-03 and Sat 12-05 are weekends.
const CAPITAL = 100_000_000; // ₹10,00,000

const fund = (id: string, rules: FundInfo['rules'], rows: [string, number][]): FundInfo => ({ id, rules, navs: rows });
const order = (o: Partial<FundOrder> & Pick<FundOrder, 'id' | 'action' | 'date'>): FundOrder => ({
  fundId: 'F',
  beforeCutoff: true,
  ...o,
});
const run = (f: FundInfo, orders: FundOrder[], asOf = '2026-12-31') => runFunds([f], orders, CAPITAL, asOf);

describe('which NAV an order gets (cut-off 3 pm)', () => {
  it('before the cut-off on a business day: that day', () => {
    expect(applicableNavDate('2026-10-19', true)).toBe('2026-10-19');
  });
  it('after the cut-off: the next business day', () => {
    expect(applicableNavDate('2026-10-19', false)).toBe('2026-10-21'); // Tuesday is a holiday
    expect(applicableNavDate('2026-10-16', false)).toBe('2026-10-19'); // over the weekend
  });
  it('on a weekend or a holiday, even before the cut-off: the next business day', () => {
    expect(applicableNavDate('2026-10-17', true)).toBe('2026-10-19');
    expect(applicableNavDate('2026-10-20', true)).toBe('2026-10-21');
  });
});

describe('purchase', () => {
  const f = fund('F', 'equity', [['2026-10-19', 1_000_000], ['2026-10-21', 1_100_000]]);
  it('takes 0.005% stamp duty out of the amount and buys units to three decimals', () => {
    // ₹1,000 at NAV 100.0000: stamp 5 paise, 99,995 paise buys 9.9995 units, kept as 9.999
    const r = run(f, [order({ id: 'a', action: 'buy', date: '2026-10-19', amountPaise: 100_000 })]);
    expect(r.txns[0]).toMatchObject({ status: 'done', navDate: '2026-10-19', unitsMilli: 9_999, stampPaise: 5, cashPaise: -100_000 });
    expect(r.cashPaise).toBe(CAPITAL - 100_000);
    expect(r.holdings[0]).toMatchObject({ unitsMilli: 9_999, costPaise: 100_000, navE4: 1_100_000, valuePaise: 109_989 });
  });
  it('an order after the cut-off buys at the next day’s NAV', () => {
    const r = run(f, [order({ id: 'a', action: 'buy', date: '2026-10-19', beforeCutoff: false, amountPaise: 100_000 })]);
    expect(r.txns[0]).toMatchObject({ navDate: '2026-10-21', navE4: 1_100_000, unitsMilli: 9_090 }); // 99,995 / 110 = 909.04 → 9.090
  });
  it('is refused below ₹100, above the cash, or for an unknown fund', () => {
    const r = run(f, [
      order({ id: 'a', action: 'buy', date: '2026-10-19', amountPaise: 9_999 }),
      order({ id: 'b', action: 'buy', date: '2026-10-19', amountPaise: CAPITAL + 1 }),
      order({ id: 'c', action: 'buy', date: '2026-10-19', amountPaise: 100_000, fundId: 'NOPE' }),
    ]);
    expect(r.txns.map((t) => [t.status, t.reason])).toEqual([
      ['rejected', 'below_minimum_amount'],
      ['rejected', 'insufficient_cash'],
      ['rejected', 'unknown_fund'],
    ]);
    expect(r.cashPaise).toBe(CAPITAL);
  });
  it('waits, not fails, when the NAV for its day is not published yet, and settles when it is', () => {
    const o = order({ id: 'a', action: 'buy', date: '2026-10-21', amountPaise: 100_000, beforeCutoff: false });
    expect(run(f, [o]).txns[0]).toMatchObject({ status: 'pending', reason: 'nav_not_published_yet' });
    const longer = fund('F', 'equity', [['2026-10-19', 1_000_000], ['2026-10-21', 1_100_000], ['2026-10-22', 1_200_000]]);
    expect(run(longer, [o]).txns[0]).toMatchObject({ status: 'done', navDate: '2026-10-22' });
  });
});

describe('redemption', () => {
  const rows: [string, number][] = [['2026-10-19', 1_000_000], ['2026-10-21', 1_100_000], ['2027-10-19', 1_300_000]];
  const buy = order({ id: 'a', action: 'buy', date: '2026-10-19', amountPaise: 100_000 });
  it('equity fund within a year: 1% exit load and STT', () => {
    // 9.999 units at 110.0000 = 109,989 paise; load 1% = 1,099.89 → 1,100; STT 0.001% = 1.09989 → 1
    const r = run(fund('F', 'equity', rows), [buy, order({ id: 'b', action: 'redeem', date: '2026-10-21', units: 'all' })]);
    expect(r.txns[1]).toMatchObject({ status: 'done', unitsMilli: 9_999, amountPaise: 109_989, exitLoadPaise: 1_100, sttPaise: 1, cashPaise: 108_888, gainPaise: 9_989 });
    expect(r.cashPaise).toBe(CAPITAL - 100_000 + 108_888);
    expect(r.holdings).toEqual([]);
  });
  it('equity fund after a year: no exit load, still STT', () => {
    const f = fund('F', 'equity', [['2025-10-14', 1_000_000], ['2026-10-21', 1_300_000]]);
    const r = run(f, [
      order({ id: 'a', action: 'buy', date: '2025-10-14', amountPaise: 100_000 }),
      order({ id: 'b', action: 'redeem', date: '2026-10-21', units: 'all' }),
    ]);
    // 9.999 × 130 = 1,299.87 → 129,987 paise; STT 1.29987 → 1; 372 days held, so no load
    expect(r.txns[1]).toMatchObject({ amountPaise: 129_987, exitLoadPaise: 0, sttPaise: 1, cashPaise: 129_986 });
  });
  it('debt fund: no load and no STT', () => {
    const r = run(fund('F', 'debt', rows), [buy, order({ id: 'b', action: 'redeem', date: '2026-10-21', units: 'all' })]);
    expect(r.txns[1]).toMatchObject({ exitLoadPaise: 0, sttPaise: 0, cashPaise: 109_989 });
  });
  it('liquid fund: the first-week load falls day by day', () => {
    expect([0, 1, 5, 6, 30].map((d) => exitLoadPpm('liquid', d))).toEqual([70, 65, 45, 0, 0]);
    const liquid = fund('F', 'liquid', [['2026-10-19', 1_000_000], ['2026-10-21', 1_000_000]]);
    // bought 19th, redeemed 21st: 2 days held → 60 ppm of ₹1,000 (99,990 paise for 9.999 units) = 5.9994 → 6 paise
    const r = run(liquid, [buy, order({ id: 'b', action: 'redeem', date: '2026-10-21', units: 'all' })]);
    expect(r.txns[1]).toMatchObject({ amountPaise: 99_990, exitLoadPaise: 6, sttPaise: 0, cashPaise: 99_984 });
  });
  it('sells the oldest units first, so only the young lot pays the load', () => {
    const f = fund('F', 'equity', [['2025-10-14', 1_000_000], ['2026-10-19', 1_000_000], ['2026-10-21', 1_000_000]]);
    const r = run(f, [
      order({ id: 'a', action: 'buy', date: '2025-10-14', amountPaise: 100_000 }), // 9.999 units, 372 days old on 2026-10-21
      order({ id: 'b', action: 'buy', date: '2026-10-19', amountPaise: 100_000 }), // 9.999 units, 2 days old
      order({ id: 'c', action: 'redeem', date: '2026-10-21', units: 14_999 }), // all of lot a and 5.000 of lot b
    ]);
    // value 99,990 + 50,000 = 149,990; load only on the 50,000 from lot b: 1% = 500; STT 1.4999 → 1
    expect(r.txns[2]).toMatchObject({ amountPaise: 149_990, exitLoadPaise: 500, sttPaise: 1, cashPaise: 149_489, gainPaise: -15 }); // cost: 100,000 + 5,000/9,999 of 100,000 = 50,005
    expect(r.holdings[0]).toMatchObject({ unitsMilli: 4_999, costPaise: 49_995 });
  });
  it('refuses more units than held and nothing at all', () => {
    const f = fund('F', 'equity', rows);
    const r = run(f, [buy, order({ id: 'b', action: 'redeem', date: '2026-10-21', units: 10_000 }), order({ id: 'c', action: 'redeem', date: '2026-10-21', units: 0 })]);
    expect(r.txns.slice(1).map((t) => t.reason)).toEqual(['insufficient_units', 'no_units_to_redeem']);
  });
});

describe('SIP', () => {
  const nav3 = fund('F', 'equity', [['2026-10-05', 1_000_000], ['2026-11-03', 1_000_000], ['2026-12-03', 1_000_000]]);
  it('moves a weekend date to the next business day, then keeps the day each month', () => {
    expect(sipDates('2026-10-01', 3, 3)).toEqual(['2026-10-05', '2026-11-03', '2026-12-03']);
    expect(sipDates('2026-10-04', 3, 2)).toEqual(['2026-11-03', '2026-12-03']); // set up after the 3rd: starts next month
    expect(sipDates('2026-10-01', 5, 3)).toEqual(['2026-10-05', '2026-11-05', '2026-12-07']); // Dec 5 is a Saturday
  });
  it('buys one instalment per month at that day’s NAV', () => {
    const r = run(nav3, [order({ id: 's', action: 'sip', date: '2026-10-01', amountPaise: 100_000, sip: { dayOfMonth: 3, instalments: 3 } })]);
    expect(r.txns.map((t) => [t.instalment, t.navDate, t.status, t.unitsMilli])).toEqual([
      [1, '2026-10-05', 'done', 9_999],
      [2, '2026-11-03', 'done', 9_999],
      [3, '2026-12-03', 'done', 9_999],
    ]);
    expect(r.cashPaise).toBe(CAPITAL - 300_000);
  });
  it('skips an instalment the cash cannot pay, as a bounced SIP, and carries on', () => {
    // a big purchase on the first instalment's NAV date (its id sorts first) leaves ₹500, so no ₹1,000 instalment can be paid
    const tight = runFunds(
      [nav3],
      [
        order({ id: 'big', action: 'buy', date: '2026-10-05', amountPaise: 99_950_000 }),
        order({ id: 's', action: 'sip', date: '2026-10-01', amountPaise: 100_000, sip: { dayOfMonth: 3, instalments: 3 } }),
      ],
      CAPITAL,
      '2026-12-31',
    );
    const sip = tight.txns.filter((t) => t.instalment > 0);
    expect(sip.map((t) => [t.status, t.reason])).toEqual([
      ['skipped', 'insufficient_cash'],
      ['skipped', 'insufficient_cash'],
      ['skipped', 'insufficient_cash'],
    ]);
    expect(tight.cashPaise).toBe(50_000);
  });
});

describe('account figures', () => {
  const f = fund('F', 'equity', [['2026-10-19', 1_000_000], ['2026-10-21', 1_100_000], ['2026-10-22', 1_200_000]]);
  it('values holdings at the last NAV on or before the date and keeps cash plus holdings as equity', () => {
    const o = [order({ id: 'a', action: 'buy', date: '2026-10-19', amountPaise: 100_000 })];
    const early = run(f, o, '2026-10-20');
    expect(early.holdings[0]).toMatchObject({ navDate: '2026-10-19', valuePaise: 99_990 });
    const late = run(f, o, '2026-10-22');
    expect(late.holdings[0]).toMatchObject({ navDate: '2026-10-22', valuePaise: 119_988 });
    expect(late.equityPaise).toBe(late.cashPaise + late.holdingsValuePaise);
  });
  it('gives the same account and hash for the same orders, however they are listed', () => {
    const a = order({ id: 'a', action: 'buy', date: '2026-10-19', amountPaise: 100_000 });
    const b = order({ id: 'b', action: 'redeem', date: '2026-10-21', units: 5_000 });
    expect(run(f, [a, b]).reportHash).toBe(run(f, [b, a]).reportHash);
  });
  it('never lets cash or units go negative, whatever the orders (property)', () => {
    const arb = fc.array(
      fc.record({
        action: fc.constantFrom('buy' as const, 'redeem' as const),
        date: fc.constantFrom('2026-10-19', '2026-10-21', '2026-10-22'),
        amount: fc.integer({ min: 5_000, max: 150_000_000 }),
        units: fc.integer({ min: 0, max: 2_000_000 }),
        before: fc.boolean(),
      }),
      { maxLength: 12 },
    );
    fc.assert(
      fc.property(arb, (rows) => {
        const orders = rows.map((r, i) => order({ id: `o${String(i).padStart(2, '0')}`, action: r.action, date: r.date, beforeCutoff: r.before, amountPaise: r.amount, units: r.units }));
        const r = run(f, orders);
        const unitsOk = r.holdings.every((h) => h.unitsMilli > 0 && h.costPaise >= 0);
        const flow = r.txns.filter((t) => t.status === 'done').reduce((n, t) => n + t.cashPaise, 0);
        return r.cashPaise >= 0 && unitsOk && r.cashPaise === CAPITAL + flow;
      }),
      { numRuns: 300 },
    );
  });
});
