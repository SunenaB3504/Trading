import { describe, expect, it } from 'vitest';
import { ELIGIBILITY_V1, configHash, evaluateEligibility } from './index';
import type { InstrumentFacts } from './index';

const good: InstrumentFacts = {
  instrumentId: 'A',
  series: 'EQ',
  listingDate: '2004-08-25',
  firstSeen: '2020-04-01',
  dataStart: '2020-04-01',
  sessionsBeforeStart: 500,
  medianTradedValuePaise: 6_000_000_000,
  missingSessions: 0,
  knownMergerInWindow: false,
  providerCoverage: 0.995,
};
const run = (over: Partial<InstrumentFacts>) => evaluateEligibility({ ...good, ...over });

describe('eligibility rules E1 to E7 (SSD §10.1)', () => {
  it('passes a liquid main-board stock with full history', () => {
    const r = run({});
    expect(r.eligible).toBe(true);
    expect(r.firstFailure).toBeNull();
    expect(r.results.map((x) => x.rule)).toEqual(['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7']);
  });

  it.each([
    ['E1', { series: 'SM' }, 'SME'],
    ['E1', { series: 'GB' }, 'gold bond'],
    ['E1', { series: null }, 'did not trade'],
    ['E2', { sessionsBeforeStart: 59 }, 'one session short of the warm-up'],
    ['E3', { knownMergerInWindow: true }, 'merger known in the window'],
    ['E5', { medianTradedValuePaise: 4_999_999_999 }, 'one paisa under the liquidity floor'],
    ['E5', { medianTradedValuePaise: null }, 'liquidity not measurable'],
    ['E6', { missingSessions: 6 }, 'more than five sessions missing'],
    ['E7', { providerCoverage: 0.979 }, 'under 98% two-provider coverage'],
    ['E7', { providerCoverage: null }, 'coverage not measured'],
  ] as const)('fails %s: %s', (rule, over, why) => {
    const r = run(over as Partial<InstrumentFacts>);
    expect(r.eligible, why).toBe(false);
    expect(r.firstFailure?.rule, why).toBe(rule);
  });

  it('passes exactly at each threshold', () => {
    const r = run({
      sessionsBeforeStart: 60,
      medianTradedValuePaise: 5_000_000_000,
      missingSessions: 5,
      providerCoverage: 0.98,
    });
    expect(r.eligible).toBe(true);
  });

  it('records the FIRST failure in order but still reports every rule', () => {
    const r = run({ series: 'SM', sessionsBeforeStart: 3, medianTradedValuePaise: 1 });
    expect(r.firstFailure?.rule).toBe('E1');
    expect(r.results.filter((x) => !x.pass).map((x) => x.rule)).toEqual(['E1', 'E2', 'E5']);
  });

  it('allows main-board trade-for-trade series (BE, BZ) and splits, bonuses and renames (E4)', () => {
    expect(run({ series: 'BE' }).eligible).toBe(true);
    expect(run({ series: 'BZ' }).eligible).toBe(true);
    expect(run({}).results.find((x) => x.rule === 'E4')?.pass).toBe(true);
  });

  it('flags a missing listing timestamp and unrecorded surveillance without failing the stock', () => {
    const r = run({ listingDate: null, firstSeen: '2020-04-01', dataStart: '2020-04-01' });
    expect(r.eligible).toBe(true);
    expect(r.flags).toEqual([
      'time_assumed',
      'listing_date_before_data_start',
      'surveillance_status_not_recorded',
    ]);
    expect(run({}).flags).toEqual([
      'listing_date_before_data_start',
      'surveillance_status_not_recorded',
    ]);
    expect(run({ firstSeen: '2021-06-01' }).flags).toEqual(['surveillance_status_not_recorded']);
  });
});

describe('frozen configuration', () => {
  it('hashes deterministically and changes with any parameter', () => {
    const base = configHash(ELIGIBILITY_V1);
    expect(configHash({ ...ELIGIBILITY_V1 })).toBe(base);
    expect(base).toMatch(/^[0-9a-f]{64}$/);
    for (const over of [
      { warmUpSessions: 61 },
      { minMedianTradedValuePaise: 1 },
      { maxMissingSessions: 4 },
      { minProviderCoverage: 0.99 },
      { mainBoardSeries: ['EQ'] },
      { version: 'x' },
    ]) {
      expect(configHash({ ...ELIGIBILITY_V1, ...over })).not.toBe(base);
    }
  });

  it('stamps every result with the rules that produced it', () => {
    expect(run({}).configHash).toBe(configHash(ELIGIBILITY_V1));
    const stricter = evaluateEligibility(good, {
      ...ELIGIBILITY_V1,
      minMedianTradedValuePaise: 10_000_000_000,
    });
    expect(stricter.eligible).toBe(false);
    expect(stricter.configHash).not.toBe(run({}).configHash);
  });
});
