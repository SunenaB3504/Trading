import { describe, expect, it } from 'vitest';
import { TAX_FACTS, addMonths, classify, estimateStt, financialYear, setOff, taxReport, taxYears, taxableOf } from './index';
import type { TaxTrade } from './index';

const R = 100; // rupees to paise
const trade = (o: Partial<TaxTrade> & Pick<TaxTrade, 'openedOn' | 'closedOn' | 'grossPaise'>): TaxTrade => ({ id: 't', label: 'X', kind: 'equity', chargesPaise: 0, sttPaise: 0, ...o });

describe('dates', () => {
  it('financial years run April to March', () => {
    expect(financialYear('2026-03-31')).toBe('2025-26');
    expect(financialYear('2026-04-01')).toBe('2026-27');
    expect(financialYear('2099-12-31')).toBe('2099-00');
  });
  it('adds months to the same day, or the last day of a shorter month', () => {
    expect(addMonths('2024-02-29', 12)).toBe('2025-02-28');
    expect(addMonths('2025-10-31', 4)).toBe('2026-02-28');
    expect(addMonths('2025-11-15', 12)).toBe('2026-11-15');
  });
  it('more than 12 months is long-term; exactly 12 months, and a same-day trade, are not', () => {
    expect(classify(trade({ openedOn: '2025-01-10', closedOn: '2026-01-10', grossPaise: 1 }))).toBe('stcg');
    expect(classify(trade({ openedOn: '2025-01-10', closedOn: '2026-01-11', grossPaise: 1 }))).toBe('ltcg');
    expect(classify(trade({ openedOn: '2026-01-10', closedOn: '2026-01-10', grossPaise: 1 }))).toBe('speculative');
    expect(classify(trade({ kind: 'derivative', openedOn: '2026-01-10', closedOn: '2026-01-10', grossPaise: 1 }))).toBe('business');
    expect(classify(trade({ kind: 'slab_asset', openedOn: '2026-01-10', closedOn: '2026-05-10', grossPaise: 1 }))).toBe('slab');
  });
});

describe("the guide's worked examples", () => {
  it('short-term: 100 shares 1,000 to 1,500 after 8 months: gain 50,000, tax 10,000 plus cess 400 = 10,400', () => {
    const r = taxReport([trade({ openedOn: '2025-05-02', closedOn: '2026-01-05', grossPaise: 50_000 * R })], '2025-26');
    expect(r.stcgPaise).toBe(50_000 * R);
    expect(r.stcgTaxPaise).toBe(10_000 * R);
    expect(r.cessPaise).toBe(400 * R);
    expect(r.capitalGainsTaxPaise).toBe(10_400 * R);
  });
  it('long-term: 100 shares 1,000 to 4,000 after 2 years: gain 3,00,000, 1,25,000 exempt, tax 21,875 plus cess 875 = 22,750', () => {
    const r = taxReport([trade({ openedOn: '2023-12-01', closedOn: '2025-12-02', grossPaise: 300_000 * R })], '2025-26');
    expect(r.ltcgExemptPaise).toBe(125_000 * R);
    expect(r.ltcgTaxablePaise).toBe(175_000 * R);
    expect(r.ltcgTaxPaise).toBe(21_875 * R);
    expect(r.cessPaise).toBe(875 * R);
    expect(r.capitalGainsTaxPaise).toBe(22_750 * R);
  });
});

describe('set-off and carry-forward', () => {
  it('a short-term loss sets off short-term gains first, then long-term gains', () => {
    expect(setOff(-30, 100)).toEqual({ st: 0, lt: 70, carryShort: 0, carryLong: 0 });
    expect(setOff(-130, 100)).toEqual({ st: 0, lt: 0, carryShort: 30, carryLong: 0 });
    expect(setOff(-50, -20)).toEqual({ st: 0, lt: 0, carryShort: 50, carryLong: 20 });
  });
  it('a long-term loss cannot reduce a short-term gain: it is carried forward', () => {
    expect(setOff(100, -40)).toEqual({ st: 100, lt: 0, carryShort: 0, carryLong: 40 });
  });
  it('the report sets losses off, taxes the rest, and carries what is left', () => {
    const r = taxReport(
      [
        trade({ id: 'a', openedOn: '2025-05-01', closedOn: '2025-09-01', grossPaise: -20_000 * R }),
        trade({ id: 'b', openedOn: '2023-05-01', closedOn: '2025-10-01', grossPaise: 100_000 * R }),
      ],
      '2025-26',
    );
    expect(r.ltcgAfterSetOffPaise).toBe(80_000 * R);
    expect(r.ltcgTaxPaise).toBe(0);
    expect(r.carryShortTermPaise).toBe(0);
  });
  it('losses brought forward reduce this year gains', () => {
    const r = taxReport([trade({ openedOn: '2025-05-01', closedOn: '2025-09-01', grossPaise: 50_000 * R })], '2025-26', { shortTermPaise: 20_000 * R, longTermPaise: 0 });
    expect(r.stcgTaxablePaise).toBe(30_000 * R);
    expect(r.stcgTaxPaise).toBe(6_000 * R);
  });
});

describe('charges and income types', () => {
  it('STT is not deducted from a capital gain but is from business income', () => {
    const cg = trade({ openedOn: '2025-05-01', closedOn: '2025-09-01', grossPaise: 10_000 * R, chargesPaise: 500 * R, sttPaise: 200 * R });
    expect(taxableOf(cg)).toBe(9_700 * R);
    expect(taxableOf({ ...cg, kind: 'derivative' })).toBe(9_500 * R);
  });
  it('intraday and F&O are business income and are not in the capital gains tax', () => {
    const r = taxReport(
      [
        trade({ id: 'i', openedOn: '2025-06-02', closedOn: '2025-06-02', grossPaise: 4_000 * R }),
        trade({ id: 'f', kind: 'derivative', openedOn: '2025-06-02', closedOn: '2025-06-20', grossPaise: -9_000 * R, chargesPaise: 100 * R }),
        trade({ id: 'g', kind: 'slab_asset', openedOn: '2025-06-02', closedOn: '2026-08-01', grossPaise: 1_000 * R }),
      ],
      '2025-26',
    );
    expect(r.speculativePaise).toBe(4_000 * R);
    expect(r.businessPaise).toBe(-9_100 * R);
    expect(r.slabGainPaise).toBe(0);
    expect(r.capitalGainsTaxPaise).toBe(0);
  });
  it('a trade belongs to the year it closed in, and the years are listed newest first', () => {
    const t = [trade({ openedOn: '2026-03-01', closedOn: '2026-04-02', grossPaise: 1 }), trade({ openedOn: '2025-01-01', closedOn: '2025-02-02', grossPaise: 1 })];
    expect(taxYears(t)).toEqual(['2026-27', '2024-25']);
    expect(taxReport(t, '2026-27').trades).toBe(1);
  });
  it('estimates STT: 0.1% each side for delivery, 0.025% on the sale for a same-day trade', () => {
    expect(estimateStt(100_000 * R, 150_000 * R, false)).toBe(250 * R);
    expect(estimateStt(100_000 * R, 150_000 * R, true)).toBe(Math.round((150_000 * R * TAX_FACTS.sttIntradaySellPpm) / 1_000_000));
  });
});
