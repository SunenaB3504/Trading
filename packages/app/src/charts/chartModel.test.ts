import { describe, expect, it } from 'vitest';
import { chartModel } from './chartModel';
import type { ChartBar } from './chartModel';

const dayOf = (i: number): string => `2024-01-${String(i + 1).padStart(2, '0')}`;
const bar = (i: number, o: number, h: number, l: number, c: number, v: number): ChartBar => ({ date: dayOf(i), open: o, high: h, low: l, close: c, volume: v });
const opts = { shortDays: 2, longDays: 3, rsiDays: 2, show: 4 };

describe('chart model', () => {
  const bars = [bar(0, 10, 11, 9, 10, 1_000), bar(1, 10, 12, 10, 12, 2_000), bar(2, 12, 14, 11, 11, 1_000), bar(3, 11, 15, 10, 14, 4_000), bar(4, 14, 16, 13, 15, 1_000)];

  it('is empty for no bars', () => {
    expect(chartModel([], opts)).toBeNull();
  });

  it('draws only the latest bars and puts the highest price at the top', () => {
    const m = chartModel(bars, opts);
    expect(m?.dates).toHaveLength(4);
    expect(m?.dates[0]).toBe('2024-01-02');
    expect(m?.priceMax).toBe(16);
    expect(m?.priceMin).toBe(10);
    expect(m?.candles[3]?.wickTop).toBe(0);
    expect(m?.candles[3]?.wickBottom).toBeCloseTo((16 - 13) / 6);
  });

  it('colours a candle by whether it closed above its open', () => {
    const m = chartModel(bars, opts);
    expect(m?.candles[3]?.up).toBe(true);
    expect(m?.candles[1]?.up).toBe(false);
  });

  it('works the averages on all the bars, so the left edge is already filled in', () => {
    const m = chartModel(bars, opts);
    expect(m?.last.short).toBe(14.5);
    expect(m?.last.long).toBeCloseTo((11 + 14 + 15) / 3);
    expect(m?.shortLine[0]).not.toBeNull();
  });

  it('volume is a share of the largest volume shown', () => {
    const m = chartModel(bars, opts);
    expect(m?.volume).toEqual([0.5, 0.25, 1, 0.25]);
  });

  it('the readout for a day uses that day and earlier days only', () => {
    const early = chartModel(bars.slice(0, 4), { ...opts, show: 3 });
    expect(early?.last.short).toBe(12.5);
    expect(early?.last.date).toBe('2024-01-04');
    expect(early?.last.close).toBe(14);
  });

  it('a flat price gives a drawable chart', () => {
    const m = chartModel([bar(0, 10, 10, 10, 10, 1_000), bar(1, 10, 10, 10, 10, 1_000)], opts);
    expect(m?.candles[0]?.wickTop).toBe(0);
    expect(m?.last.rsi).toBeNull();
  });
});
