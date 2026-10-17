import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ProviderError,
  classify,
  isoDate,
  mergeActions,
  parseActionsFile,
  toCorporateActions,
} from '../index';
import type { NseAction } from '../index';

// Real `bc` files from NSE's daily PR zips (fixtures/providers), equity series only.
const fixture = (day: string): string =>
  readFileSync(join(process.cwd(), 'fixtures', 'providers', `nse_pr_bc_${day}.csv`), 'utf8');
const day = (d: string) => parseActionsFile(fixture(d));
const find = (actions: readonly NseAction[], symbol: string, type: string) =>
  actions.find((a) => a.symbol === symbol && a.type === type);

describe('reading the purpose text', () => {
  it.each([
    ['BONUS 1:3', 'bonus', { numerator: 4, denominator: 3 }, null],
    ['BONUS 1:1', 'bonus', { numerator: 2, denominator: 1 }, null],
    ['BONUS 1:2', 'bonus', { numerator: 3, denominator: 2 }, null],
    ['FVSPLT FRM RS 10 TO RE 1', 'split', { numerator: 10, denominator: 1 }, null],
    ['FV SPLT FRM RS10TO RS2', 'split', { numerator: 5, denominator: 1 }, null],
    ['FV SPLT FRM RS 10 TO RS1', 'split', { numerator: 10, denominator: 1 }, null],
    ['FVSPLT FRM RS100 TO RS 1', 'split', { numerator: 100, denominator: 1 }, null],
    ['FV SPLT FRM RS 10 TO RS 2.5', 'split', { numerator: 4, denominator: 1 }, null],
    ['DIV - RS 6.75 PER SH', 'dividend', null, 675],
    ['INT DIV -  RS 1.40 PER SH', 'dividend', null, 140],
    ['AGM / DIV - RS 17 PER SHARE', 'dividend', null, 1700],
    ['AGM/DIV - RE 1 PER SHARE', 'dividend', null, 100],
    ['AGM/DIV-4/SPLDIV-50.5', 'dividend', null, 5450],
    ['DIVIDEND', 'dividend', null, null],
  ] as const)('%s', (text, type, ratio, paise) => {
    expect(classify(text)).toEqual({ type, ratio, dividendPaise: paise });
  });

  it.each([
    ['RIGHTS 1:10 @PRM RS 95/-', 'rights'],
    ['RGHTS 1:2 PRM RS 11', 'rights'],
    ['DEMERGER', 'demerger'],
    ['MERGER', 'merger'],
    ['SCHEME OF ARRANGEMENT', 'arrangement'],
    ['CAPITAL REDUCTION', 'capital_reduction'],
    ['BUYBACK', 'buyback'],
  ] as const)('keeps %s apart as %s', (text, type) => {
    expect(classify(text)?.type).toBe(type);
  });

  it.each([
    'ANNUAL GENERAL MEETING',
    'EGM',
    'INTEREST PAYMENT',
    'DIV/REDEMPTION',
    'REDEMPTION',
    'STP',
  ])('ignores %s', (text) => {
    expect(classify(text)).toBeNull();
  });

  it('reads both date styles NSE has used and refuses blanks', () => {
    expect(isoDate('28/10/2024')).toBe('2024-10-28');
    expect(isoDate('2/3/2020')).toBe('2020-03-02');
    expect(isoDate('2025-10-17')).toBe('2025-10-17');
    expect(isoDate(' ')).toBeNull();
    expect(isoDate('soon')).toBeNull();
  });
});

describe('real action files', () => {
  it('finds bonuses in March 2018 with the right ratios and ex-dates', () => {
    const a = day('2018-03-28').actions;
    expect(find(a, 'GAIL', 'bonus')).toMatchObject({
      exDate: '2018-03-27',
      ratio: { numerator: 4, denominator: 3 },
    });
    expect(find(a, 'OIL', 'bonus')?.ratio).toEqual({ numerator: 3, denominator: 2 });
    expect(find(a, 'KELLTONTEC', 'bonus')?.ratio).toEqual({ numerator: 2, denominator: 1 });
  });

  it('finds the October 2021 splits (IRCTC 1-into-5) and a rights issue to review', () => {
    const a = day('2021-10-25').actions;
    expect(find(a, 'IRCTC', 'split')).toMatchObject({
      exDate: '2021-10-28',
      ratio: { numerator: 5, denominator: 1 },
    });
    expect(find(a, 'GPIL', 'split')?.ratio).toEqual({ numerator: 2, denominator: 1 });
    expect(find(a, 'NIPPOBATRY', 'split')?.ratio).toEqual({ numerator: 2, denominator: 1 });
    expect(find(a, 'BHARATGEAR', 'rights')).toBeDefined();
  });

  it('finds the Tata Steel 10-for-1 split of July 2022 and a two-part Bata dividend', () => {
    const a = day('2022-07-22').actions;
    expect(find(a, 'TATASTEEL', 'split')).toMatchObject({
      exDate: '2022-07-28',
      ratio: { numerator: 10, denominator: 1 },
    });
    expect(find(a, 'BATAINDIA', 'dividend')).toMatchObject({
      exDate: '2022-08-04',
      dividendPaise: 5450,
    });
  });

  it('finds the Reliance 1:1 bonus once, although it is listed under two series', () => {
    const f = day('2024-10-25');
    expect(f.actions.filter((a) => a.symbol === 'RELIANCE' && a.type === 'bonus')).toHaveLength(2);
    const merged = mergeActions([f.actions, f.actions]);
    const rel = merged.filter((a) => a.symbol === 'RELIANCE' && a.type === 'bonus');
    expect(rel).toHaveLength(1);
    expect(rel[0]).toMatchObject({ exDate: '2024-10-28', ratio: { numerator: 2, denominator: 1 } });
  });

  it('counts the rows it leaves out and the price events with no ex-date', () => {
    const f = day('2021-10-25');
    expect(f.ignored).toBeGreaterThan(10); // meetings and the like
    expect(f.undated).toBeGreaterThan(0); // capital reductions announced without a date
    const merged = mergeActions([day('2018-03-28').actions, day('2022-07-22').actions]);
    expect([...merged].sort((x, y) => (x.exDate < y.exDate ? -1 : 1))).toEqual(merged);
  });

  it('refuses a file with another header', () => {
    expect(() => parseActionsFile('a,b\n1,2\n')).toThrow(ProviderError);
  });
});

describe("turning the exchange list into the domain's actions", () => {
  const merged = mergeActions([
    day('2024-10-25').actions,
    day('2022-07-22').actions,
    day('2021-10-25').actions,
  ]);
  const ids = new Map([
    ['RELIANCE', 'RELIANCE:INE002A01018'],
    ['TATASTEEL', 'TATASTEEL:INE081A01012'],
    ['BATAINDIA', 'BATAINDIA:X'],
  ]);
  const out = toCorporateActions(merged, (symbol) => ids.get(symbol));

  it('turns splits, bonuses and dividends of known instruments into price-adjusting actions', () => {
    const rel = out.actions.find((a) => a.id === 'RELIANCE-bonus-2024-10-28');
    expect(rel).toMatchObject({
      instrumentId: 'RELIANCE:INE002A01018',
      type: 'bonus',
      ratio: { numerator: 2, denominator: 1 },
      dividendPaisePerShare: null,
      source: 'NSE PR bc',
    });
    expect(out.actions.find((a) => a.id === 'TATASTEEL-split-2022-07-28')?.ratio).toEqual({
      numerator: 10,
      denominator: 1,
    });
    const div = out.actions.find((a) => a.id === 'BATAINDIA-dividend-2022-08-04');
    expect(div).toMatchObject({ type: 'dividend', ratio: null, dividendPaisePerShare: 5450 });
  });

  it('sends rights, schemes, unknown instruments and dividends without an amount to review', () => {
    const review = out.needsReview;
    expect(review.some((a) => a.type === 'rights')).toBe(true);
    expect(review.some((a) => a.symbol === 'IRCTC')).toBe(true); // not in the id map
    expect(out.actions.every((a) => ids.has(a.id.split('-')[0] as string))).toBe(true);
  });
});
