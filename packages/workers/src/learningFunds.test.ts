import { describe, expect, it } from 'vitest';
import { amfiLatest, assembleFunds, isoDate, readSpecs, toNavs } from './learningFunds';
import type { SchemeHistory } from './learningFunds';

const h: SchemeHistory = {
  meta: { scheme_name: 'UTI Nifty 50 Index Fund - Direct Plan - Growth', isin_growth: 'INF789F01XA0' },
  data: [
    { date: '23-10-2026', nav: '159.17700' },
    { date: '22-10-2026', nav: '159.78040' },
    { date: '22-10-2026', nav: '1.00000' },
    { date: '21-10-2026', nav: 'N.A.' },
  ],
};
const amfi = ['Scheme Code;ISIN;ISIN2;Name;Plan;Option;Net Asset Value;Date', '', 'Open Ended', '120716;INF789F01XA0;-;UTI Nifty 50 Index Fund;Direct Plan;Growth;159.177;23-Oct-2026'].join('\n');

describe('fund NAV build (MIP v4.1 Stage 2)', () => {
  it('reads dates and NAVs, oldest first, dropping unreadable and repeated rows', () => {
    expect(isoDate('23-10-2026')).toBe('2026-10-23');
    expect(isoDate('2026-10-23')).toBeNull();
    expect(toNavs(h)).toEqual([['2026-10-22', 1_597_804], ['2026-10-23', 1_591_770]]);
  });

  it('reads AMFI latest NAVs and spec lines', () => {
    expect(amfiLatest(amfi).get('120716')).toEqual({ date: '2026-10-23', nav: 1_591_770 });
    expect(readSpecs('# c\n120716;Index fund;equity\n119800;Liquid;liquid\n1;Odd;whatever\n\n')).toEqual([
      { code: '120716', kind: 'Index fund', rules: 'equity' },
      { code: '119800', kind: 'Liquid', rules: 'liquid' },
      { code: '1', kind: 'Odd', rules: 'other' },
    ]);
  });

  it('assembles funds and flags a NAV that disagrees with AMFI', () => {
    const specs = [{ code: '120716', kind: 'Index fund', rules: 'equity' as const }, { code: '999', kind: 'Gone', rules: 'other' as const }];
    const ok = assembleFunds(specs, new Map([['120716', h]]), amfiLatest(amfi), 7);
    expect(ok.funds.map((f) => f.id)).toEqual(['120716']);
    expect(ok.funds[0]).toMatchObject({ rules: 'equity', firstDate: '2026-10-22', lastDate: '2026-10-23' });
    expect(ok.disputed).toEqual([]);
    const bad = assembleFunds(specs, new Map([['120716', h]]), new Map([['120716', { date: '2026-10-23', nav: 1 }]]), 7);
    expect(bad.disputed).toEqual(['120716']);
  });
});
