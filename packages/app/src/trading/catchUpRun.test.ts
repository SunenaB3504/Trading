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
  const bc = (exDate: string): Uint8Array =>
    zipSync({
      [`Bc${exDate}.csv`]: new TextEncoder().encode(
        'SERIES,SYMBOL,SECURITY,RECORD_DT,BC_STRT_DT,BC_END_DT,EX_DT,ND_STRT_DT,ND_END_DT,PURPOSE\n' +
          `EQ,RELIANCE,RELIANCE IND,${exDate},,,${exDate},,,FV SPLIT FRM RS 10 TO RS 5\n` +
          `EQ,NOTHELD,OTHER CO,${exDate},,,${exDate},,,BONUS 1:1\n`,
      ),
    });

  it('reads real zip files, skips a holiday (404) and stops on a network failure keeping what it has', async () => {
    const got: string[] = [];
    const r = await catchUp(market, '2026-10-22', (url) => {
      const pr = /\/PR(\d{6})\.zip$/.exec(url)?.[1];
      if (pr !== undefined) {
        got.push(`PR${pr}`);
        return Promise.resolve(pr === '191026' ? bc('2026-10-19') : null);
      }
      const d = /_(\d{8})_F/.exec(url)?.[1] ?? '';
      got.push(d);
      if (d === '20261020') return Promise.resolve(null); // holiday
      if (d === '20261022') return Promise.reject(new Error('offline'));
      return Promise.resolve(day(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`));
    });
    expect(got).toEqual(['20261019', 'PR191026', '20261020', '20261021', 'PR211026', '20261022']);
    expect(r).toMatchObject({ added: 2, interrupted: true });
    expect(r.market.to).toBe('2026-10-21');
    expect(r.market.bars.RELIANCE?.map((b) => b[0])).toEqual(['2026-10-16', '2026-10-19', '2026-10-21']);
    // the split of a stock in the market is added; a stock the market does not carry is left out
    expect(r.market.actions.map((a) => [a.instrumentId, a.type, a.exDate, a.ratio])).toEqual([
      ['RELIANCE', 'split', '2026-10-19', { numerator: 2, denominator: 1 }],
    ]);
  });

  it('does not count a day whose PR file failed, so the next open fetches it again', async () => {
    const r = await catchUp(market, '2026-10-19', (url) =>
      url.includes('/PR') ? Promise.reject(new Error('offline')) : Promise.resolve(day('2026-10-19')),
    );
    expect(r).toMatchObject({ added: 0, interrupted: true });
    expect(r.market.to).toBe('2026-10-16');
  });

  it('does nothing when the market is already current', async () => {
    const r = await catchUp(market, '2026-10-17', () => Promise.reject(new Error('should not fetch')));
    expect(r).toMatchObject({ added: 0, interrupted: false });
    expect(r.market).toBe(market);
  });
});
