import { describe, expect, it } from 'vitest';
import { FUNDS_FORMAT, FUNDS_VERSION, parseFundsMarket, parseNav } from './fundsMarket';

describe('fund NAVs', () => {
  it('reads a NAV into ten-thousandths and refuses what is not one', () => {
    expect(parseNav('159.17700')).toBe(1_591_770);
    expect(parseNav('4468.9049')).toBe(44_689_049);
    expect(parseNav('10')).toBe(100_000);
    expect(parseNav('0')).toBeNull();
    expect(parseNav('-1.5')).toBeNull();
    expect(parseNav('12.34567')).toBeNull();
    expect(parseNav('N.A.')).toBeNull();
  });

  it('accepts a well-formed funds file and refuses a broken one', () => {
    const file = {
      format: FUNDS_FORMAT,
      version: FUNDS_VERSION,
      builtAt: 1,
      source: 'test',
      funds: [{ id: '120716', name: 'UTI Nifty 50 Index Fund', kind: 'Index fund', isin: null, firstDate: '2026-10-22', lastDate: '2026-10-23' }],
      navs: { '120716': [['2026-10-22', 1_597_804], ['2026-10-23', 1_591_770]] },
      disputed: [],
    };
    expect(parseFundsMarket(file)?.funds).toHaveLength(1);
    expect(parseFundsMarket({ ...file, navs: { '120716': [['2026-10-22', 0]] } })).toBeNull();
    expect(parseFundsMarket({ ...file, version: 2 })).toBeNull();
  });
});
