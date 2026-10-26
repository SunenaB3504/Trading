import type { LearningMarket } from '@trading/core';
import { LEARNING_MARKET_FORMAT, LEARNING_MARKET_VERSION } from '@trading/core';
import { describe, expect, it } from 'vitest';
import { addDays, dayFileUrl, missingWeekdays, parseDay } from './catchUp';

const HEAD = 'TradDt,TckrSymb,SctySrs,ISIN,OpnPric,HghPric,LwPric,ClsPric,TtlTradgVol';
const csv = [
  HEAD,
  '2026-10-19,RELIANCE,EQ,INE002A01018,1215.00,1230.50,1210.00,1225.25,5000',
  '2026-10-19,RELIANCE,BE,INE002A01018,1.00,1.00,1.00,1.00,1',
  '2026-10-19,TMPV,EQ,INE155A01022,700.00,710.00,690.00,705.00,9000',
  '2026-10-19,BAD,EQ,INE000000000,10.00,9.00,8.00,9.50,1',
].join('\n');

const m: LearningMarket = {
  format: LEARNING_MARKET_FORMAT,
  version: LEARNING_MARKET_VERSION,
  id: 'nse-learning-v1',
  builtAt: 5,
  source: 'test',
  from: '2026-10-15',
  to: '2026-10-16',
  tradableFrom: '2020-04-01',
  instruments: [
    { id: 'RELIANCE', symbol: 'RELIANCE', requested: 'RELIANCE', isin: 'INE002A01018', firstDate: '2026-10-15', lastDate: '2026-10-16' },
    { id: 'OLD', symbol: 'OLD', requested: 'OLD', isin: null, firstDate: '2026-10-15', lastDate: '2026-10-16' },
  ],
  bars: { RELIANCE: [['2026-10-15', 1, 2, 1, 2, 1, 0], ['2026-10-16', 1, 2, 1, 2, 1, 0]], OLD: [['2026-10-16', 1, 2, 1, 2, 1, 0]] },
  actions: [],
  missing: [],
};

describe('daily catch-up (MIP v4.1 Stage 2)', () => {
  it('names the archive file and lists the weekdays to fetch', () => {
    expect(dayFileUrl('2026-10-19')).toBe('https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_20261019_F_0000.csv.zip');
    expect(missingWeekdays('2026-10-16', '2026-10-21')).toEqual(['2026-10-19', '2026-10-20', '2026-10-21']);
    expect(missingWeekdays('2026-10-16', '2026-10-17')).toEqual([]);
  });

  it('reads EQ rows only and drops a row whose prices are inconsistent', () => {
    const rows = parseDay(csv);
    expect(rows.map((r) => r.symbol)).toEqual(['RELIANCE', 'TMPV']);
    expect(rows[0]?.bar).toEqual(['2026-10-19', 121_500, 123_050, 121_000, 122_525, 5_000, 0]);
    expect(parseDay('nothing useful')).toEqual([]);
  });

  it('appends the new day by ISIN, moves the end date, and is idempotent', () => {
    const days = new Map([['2026-10-19', parseDay(csv)]]);
    const next = addDays(m, days);
    expect(next.to).toBe('2026-10-19');
    expect(next.bars.RELIANCE).toHaveLength(3);
    expect(next.instruments[0]?.lastDate).toBe('2026-10-19');
    expect(next.bars.OLD).toHaveLength(1); // no ISIN, so it is not matched
    expect(addDays(next, days)).toBe(next);
  });
});
