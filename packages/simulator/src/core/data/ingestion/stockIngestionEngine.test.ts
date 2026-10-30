/**
 * packages/simulator/src/core/data/ingestion/stockIngestionEngine.test.ts
 * Tests verifying stock ingestion CSV parsing, compounding, and natal calibration.
 */

import { describe, it, expect } from 'vitest';
import {
  parseRawCsvText,
  processAndCompoundDailyBars,
  buildNatalPreview,
} from './stockIngestionEngine';

describe('stockIngestionEngine', () => {
  it('parses raw CSV text with standard headers', () => {
    const csv = `Date,Open,High,Low,Close,Volume
2024-01-01,100,105,98,102,50000
2024-01-02,102,106,101,104,60000`;

    const parsed = parseRawCsvText(csv);
    expect(parsed.length).toBe(2);
    expect(parsed[0]?.date).toBe('2024-01-01');
    expect(parsed[0]?.close).toBe(102);
    expect(parsed[1]?.high).toBe(106);
  });

  it('compounds daily returns and detects splits', () => {
    const raw = [
      { date: '2024-01-01', open: 100, high: 105, low: 98, close: 100, volume: 50000 },
      { date: '2024-01-02', open: 100, high: 105, low: 98, close: 110, volume: 50000 },
      // 1:1 bonus/split drop from 110 to 55
      { date: '2024-01-03', open: 55, high: 58, low: 54, close: 55, volume: 100000 },
    ];

    const { bars, splitCount } = processAndCompoundDailyBars('TEST', raw);
    expect(splitCount).toBe(1);
    expect(bars[2]?.daily_return).toBe(0.0); // 55 * 2 = 110, return is 0% instead of -50%
    expect(bars[2]?.drawdown).toBe(0.0);
  });

  it('builds natal preview with 1st Mahadasha theoretical start calibration', () => {
    const preview = buildNatalPreview('RELIANCE');
    expect(preview.symbol).toBe('RELIANCE');
    expect(preview.listingDate).toBe('1995-11-29');
    expect(preview.birthMdLord).toBeDefined();
    expect(preview.theoreticalStartMs).toBeLessThan(new Date('1995-11-29').getTime());
  });
});
