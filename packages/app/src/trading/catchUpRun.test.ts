import { zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { LEARNING_MARKET_FORMAT, LEARNING_MARKET_VERSION } from '@trading/core';
import type { LearningMarket } from '@trading/core';
import { catchUp } from './catchUpRun';

const day = (date: string): Uint8Array =>
  zipSync({
    [`BhavCopy_${date}.csv`]: new TextEncoder().encode(
      `TradDt,TckrSymb,SctySrs,ISIN,OpnPric,HghPric,LwPric,ClsPric,TtlTradgVol\n${date},RELIANCE,EQ,INE002A01018,10.00,11.00,9.00,10.50,100\n`,
    ),
  });
const market: LearningMarket = {
  format: LEARNING_MARKET_FORMAT,
  version: LEARNING_MARKET_VERSION,
  id: 'nse-learning-v1',
  builtAt: 1,
  source: 't',
  from: '2026-10-15',
  to: '2026-10-16',
  tradableFrom: '2020-04-01',
  instruments: [{ id: 'RELIANCE', symbol: 'RELIANCE', requested: 'RELIANCE', isin: 'INE002A01018', firstDate: '2026-10-15', lastDate: '2026-10-16' }],
  bars: { RELIANCE: [['2026-10-16', 1, 2, 1, 2, 1, 0]] },
  actions: [],
  missing: [],
};

describe('catch-up run', () => {
  it('reads real zip files, skips a holiday (404) and stops on a network failure keeping what it has', async () => {
    const got: string[] = [];
    const r = await catchUp(market, '2026-10-22', (url) => {
      const d = /_(\d{8})_F/.exec(url)?.[1] ?? '';
      got.push(d);
      if (d === '20261020') return Promise.resolve(null); // holiday
      if (d === '20261022') return Promise.reject(new Error('offline'));
      return Promise.resolve(day(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`));
    });
    expect(got).toEqual(['20261019', '20261020', '20261021', '20261022']);
    expect(r).toMatchObject({ added: 2, interrupted: true });
    expect(r.market.to).toBe('2026-10-21');
    expect(r.market.bars.RELIANCE?.map((b) => b[0])).toEqual(['2026-10-16', '2026-10-19', '2026-10-21']);
  });

  it('does nothing when the market is already current', async () => {
    const r = await catchUp(market, '2026-10-17', () => Promise.reject(new Error('should not fetch')));
    expect(r).toMatchObject({ added: 0, interrupted: false });
    expect(r.market).toBe(market);
  });
});
