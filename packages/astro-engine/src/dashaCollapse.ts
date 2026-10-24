import { canonicalJson, sha256Hex } from '@trading/core';
import type { HypothesisSpec } from '@trading/core';

/**
 * PH-13 and PH-14, the daśā and stock-collapse study (docs/DASHA_COLLAPSE_STUDY_PLAN.md). Two pre-declared tests on
 * the same frozen list of verified-IPO collapse stocks: is the bhukti lord on the collapse-start date in the named
 * class more often than the bhukti lord on a random date in the same stock's own life?
 *
 * This file freezes WHAT is tested (classes, moments, event rule, null, test settings) and hashes it. It does not
 * compute any daśā for any stock. The test itself is written and run only after both hypotheses are registered.
 */
export const DC_FAMILY = 'dasha-collapse';
export const DC_VERSION = 1;
export const DC_P1_ID = 'PH-13';
export const DC_P2_ID = 'PH-14';

export type DcTest = 'P1' | 'P2';

/** P1, lagna-free: the traditional malefics. */
export const DC_P1_LORDS = ['saturn', 'rahu', 'ketu', 'mars'] as const;
/** P2, lagna-based: the lords of these houses of the stock's chart. */
export const DC_P2_HOUSES = [6, 8, 12] as const;

/** 10:00 IST is 04:30 UTC (owner's instruction for a first trading day); the other two are for the lagna-stability check only. */
export const DC_MOMENTS_UTC = {
  primary: 'T04:30:00Z',
  open0915: 'T03:45:00Z',
  close1530: 'T10:00:00Z',
} as const;

/** The smallest effect the power simulation says 80% power for on 206 stocks: about 9 percentage points of event share. */
export const DC_CLAIM = { effectPoints: 9 } as const;

const common = {
  version: DC_VERSION,
  family: DC_FAMILY,
  window: { from: '2007-01-02', to: '2026-10-16' },
  population: 'frozen list of verified-IPO clean-collapse stocks (see listFileHash)',
  eventDate:
    'date of the running price peak before a fall of at least 70% that never regained 50% of the peak',
  nullDates:
    'uniformly random trading day between max(listing, window start) and the last trading day of the same stock',
  draws: 10_000,
  rngSeed: 'PH-13/14 dasha-collapse v1',
  alpha: { perTest: 0.025, sided: 'one', correction: 'Holm over the two tests' },
  statistic:
    'mean over stocks of (1 if event-date bhukti lord is in the class, else 0) minus (share of random dates in the class)',
  dasha: {
    ayanamsa: 'lahiri',
    node: 'mean',
    yearDays: 365.25,
    level: 'bhukti',
    birthMoment: DC_MOMENTS_UTC.primary,
  },
};

const classOf = {
  P1: { lords: [...DC_P1_LORDS], eligibility: 'every stock in the list' },
  P2: {
    houses: [...DC_P2_HOUSES],
    eligibility:
      'only stocks whose lagna sign is the same at all three listing moments (09:15, 10:00 and 15:30 IST)',
    moments: DC_MOMENTS_UTC,
  },
} as const;

/** The hash of what is frozen for one test. A different class, moment or null gives a different hash. */
export function dcRuleHash(test: DcTest): string {
  return sha256Hex(canonicalJson({ ...common, test, class: classOf[test] }));
}

export interface DcFrozen {
  /** Hash of data/frozen/dasha_collapse_verified_v1.csv (line endings normalised). */
  listFileHash: string;
  /** Hash of data/frozen/dasha_collapse_v1.json, which names the hashes of the price, action and IPO inputs. */
  manifestHash: string;
  stocks: number;
}

export function dcSpec(test: DcTest, frozen: DcFrozen): HypothesisSpec {
  const p1 = test === 'P1';
  return {
    id: p1 ? DC_P1_ID : DC_P2_ID,
    title: p1
      ? 'Collapse start falls in a malefic bhukti (Saturn, Rahu, Ketu, Mars)'
      : 'Collapse start falls in a bhukti of a 6th, 8th or 12th house lord',
    family: DC_FAMILY,
    statedNull: p1
      ? 'The bhukti lord on a stock collapse-start date is in the malefic class no more often than on a random date in the same stock life.'
      : 'The bhukti lord on a stock collapse-start date is a 6th, 8th or 12th house lord no more often than on a random date in the same stock life.',
    // The registry's claim fields are written for returns. Here the claim is an added share of events, in percentage
    // points, and the horizon slot is a placeholder of 1 because no holding period applies.
    claimed: { effectSizePct: DC_CLAIM.effectPoints, direction: 'up', horizonSessions: 1 },
    params: {
      test,
      classLords: p1 ? DC_P1_LORDS.join(',') : 'lords of houses 6,8,12 of the lagna',
      listingMoment: '10:00 IST',
      lagnaStability: p1 ? 'not required' : 'same lagna sign at 09:15, 10:00 and 15:30 IST',
      eventDate: common.eventDate,
      nullDates: common.nullDates,
      draws: common.draws,
      alphaPerTest: common.alpha.perTest,
      window: `${common.window.from} to ${common.window.to}`,
      effectUnit: 'percentage points of event share',
      stocks: frozen.stocks,
      listFileHash: frozen.listFileHash,
      manifestHash: frozen.manifestHash,
      version: DC_VERSION,
    },
    ruleHash: dcRuleHash(test),
    excludedInstruments: [],
  };
}
