import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ELIGIBILITY_V1, evaluateEligibility } from '@trading/core';
import type { BarUnadj, EligibilityConfig } from '@trading/core';
import { describe, expect, it } from 'vitest';
import {
  IdentityIndex,
  buildFacts,
  buildIdentities,
  canonicalize,
  parseBhavcopyLegacy,
  parseBhavcopyUdiff,
} from '../index';

// Real NSE bars (fixtures/providers/events_*_subset.csv). The lookback is shortened from 60 to 5
// sessions only because the recording is short; the logic is the same.
const dir = join(process.cwd(), 'fixtures', 'providers');
const text = (name: string): string => readFileSync(join(dir, name), 'utf8');
const rows = [
  ...parseBhavcopyLegacy(text('events_legacy_subset.csv')).rows,
  ...parseBhavcopyUdiff(text('events_udiff_subset.csv')).rows,
];
const identities = buildIdentities(rows);
const canon = canonicalize(rows, new IdentityIndex(identities), 's').bars;
const barsOf = (symbol: string): BarUnadj[] =>
  canon.get(identities.find((i) => i.instrumentId.startsWith(symbol))?.instrumentId ?? '') ?? [];

const short: EligibilityConfig = {
  ...ELIGIBILITY_V1,
  warmUpSessions: 5,
  minMedianTradedValuePaise: 1,
  maxMissingSessions: 1,
};
const input = (symbol: string, windowStart: string, over = {}) => ({
  instrumentId: symbol,
  bars: barsOf(symbol),
  latestSeries: 'EQ',
  dataStart: '2021-10-22',
  windowStart,
  listingDate: null,
  knownMergerInWindow: false,
  providerCoverage: 0.99,
  ...over,
});

describe('building point-in-time facts from real bars', () => {
  const reliance = barsOf('RELIANCE');

  it('measures sessions before the window, missing sessions and median traded value', () => {
    const f = buildFacts(input('RELIANCE', '2024-10-29', { dataStart: '2024-10-22' }), short);
    // the five sessions before 2024-10-29 are 10-22, 23, 24, 25 and 28, all present
    expect(f.sessionsBeforeStart).toBe(5);
    expect(f.missingSessions).toBe(0);
    const values = reliance
      .filter((b) => b.date < '2024-10-29')
      .map((b) => b.close * b.volume)
      .sort((a, b) => a - b);
    expect(f.medianTradedValuePaise).toBe(values[2]);
    expect(f.firstSeen).toBe('2024-10-22');
    expect(f.series).toBe('EQ');
  });

  it('uses only data before the window start (no look-ahead)', () => {
    const early = buildFacts(input('RELIANCE', '2024-10-29', { dataStart: '2024-10-22' }), short);
    const withLaterBars = buildFacts(
      { ...input('RELIANCE', '2024-10-29', { dataStart: '2024-10-22' }), bars: reliance },
      short,
    );
    expect(withLaterBars).toEqual(early); // the bars on and after 10-29 were already in `reliance`
    const truncated = buildFacts(
      {
        ...input('RELIANCE', '2024-10-29', { dataStart: '2024-10-22' }),
        bars: reliance.filter((b) => b.date < '2024-10-29'),
      },
      short,
    );
    expect(truncated).toEqual(early);
  });

  it('counts a missing session in the lookback but not a session before the first listing', () => {
    const dropped = reliance.filter((b) => b.date !== '2024-10-24');
    const f = buildFacts(
      { ...input('RELIANCE', '2024-10-29', { dataStart: '2024-10-22' }), bars: dropped },
      short,
    );
    expect(f.missingSessions).toBe(1);
    const tata = buildFacts(input('TATASTEEL', '2022-07-29', { dataStart: '2022-07-22' }), {
      ...short,
      warmUpSessions: 10,
    });
    expect(tata.missingSessions).toBe(0); // lookback reaches before 2022-07-22, the first bar, and those do not count
  });

  it('returns no liquidity figure when fewer than half the lookback sessions have bars', () => {
    const f = buildFacts(input('TATASTEEL', '2022-07-25', { dataStart: '2022-07-22' }), short);
    expect(f.sessionsBeforeStart).toBe(1);
    expect(f.medianTradedValuePaise).toBeNull();
  });

  it('feeds the eligibility rules end to end', () => {
    const ok = evaluateEligibility(
      buildFacts(input('RELIANCE', '2024-10-29', { dataStart: '2024-10-22' }), short),
      short,
    );
    expect(ok.eligible).toBe(true);
    const young = evaluateEligibility(
      buildFacts(input('RELIANCE', '2024-10-25', { dataStart: '2024-10-22' }), short),
      short,
    );
    expect(young.firstFailure?.rule).toBe('E2');
    const sme = evaluateEligibility(
      buildFacts(
        input('RELIANCE', '2024-10-29', { dataStart: '2024-10-22', latestSeries: 'SM' }),
        short,
      ),
      short,
    );
    expect(sme.firstFailure?.rule).toBe('E1');
  });

  it('throws for an instrument with no bars', () => {
    expect(() => buildFacts({ ...input('RELIANCE', '2024-10-29'), bars: [] }, short)).toThrow(
      /no bars/,
    );
  });
});
