/**
 * packages/app/src/core/financial/balanceSheetAudit.test.ts
 * Unit tests verifying PIT balance sheet audit and circuit breakers.
 */

import { describe, it, expect } from 'vitest';
import { auditBalanceSheetPIT, filterPointInTimeFiling } from './balanceSheetAudit';
import type { QuarterlyFundamental } from '../data/types';

describe('Point-in-Time 12-Bhava Balance Sheet Audit', () => {
  const mockFilings: QuarterlyFundamental[] = [
    {
      symbol: 'TCS',
      fiscal_quarter: 'FY18_Q3',
      period_end_date: '2017-12-31',
      filing_timestamp: '2018-01-15T18:00:00Z',
      debt_to_equity: 0.05,
      fcf: 4500000000,
      roce: 0.35,
      roe: 0.28,
      pledging_pct: 0.0,
      icr: 45.0,
    },
    {
      symbol: 'TCS',
      fiscal_quarter: 'FY18_Q4',
      period_end_date: '2018-03-31',
      filing_timestamp: '2018-05-20T18:00:00Z',
      debt_to_equity: 0.04,
      fcf: 5200000000,
      roce: 0.38,
      roe: 0.30,
      pledging_pct: 0.0,
      icr: 50.0,
    },
    {
      symbol: 'DISTRESSED',
      fiscal_quarter: 'FY20_Q1',
      period_end_date: '2020-06-30',
      filing_timestamp: '2020-08-10T18:00:00Z',
      debt_to_equity: 3.5, // Excessive debt (> 2.0)
      fcf: -1200000000,
      roce: 0.04,
      roe: 0.02,
      pledging_pct: 32.0, // High pledging (> 25%)
      icr: 0.8, // Insolvency risk (< 1.5)
    },
  ];

  it('quarantines future filings with anti-look-ahead gate', () => {
    // Simulation date is 2018-05-10 (before FY18_Q4 filed on 2018-05-20)
    const filing = filterPointInTimeFiling(mockFilings.slice(0, 2), '2018-05-10');
    expect(filing).not.toBeNull();
    expect(filing?.fiscal_quarter).toBe('FY18_Q3');

    // Simulation advances to 2018-05-25 (after FY18_Q4 filing)
    const advancedFiling = filterPointInTimeFiling(mockFilings.slice(0, 2), '2018-05-25');
    expect(advancedFiling).not.toBeNull();
    expect(advancedFiling?.fiscal_quarter).toBe('FY18_Q4');
  });

  it('triggers hard risk circuit breaker (phi = 0.0) on distressed balance sheet', () => {
    const distressedFiling = mockFilings.filter((f) => f.symbol === 'DISTRESSED');
    const result = auditBalanceSheetPIT(distressedFiling, '2020-09-01');

    expect(result.isCircuitBreakerTripped).toBe(true);
    expect(result.phiFinancial).toBe(0.0);
    expect(result.circuitBreakerReason).toContain('Debt-to-Equity');
  });

  it('produces high phi score on pristine balance sheet', () => {
    const tcsFilings = mockFilings.filter((f) => f.symbol === 'TCS');
    const result = auditBalanceSheetPIT(tcsFilings, '2018-06-01');

    expect(result.isCircuitBreakerTripped).toBe(false);
    expect(result.phiFinancial).toBeGreaterThan(0.75);
    expect(result.bhavaScores.length).toBe(7);
  });
});
