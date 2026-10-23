import { canonicalJson, sha256Hex } from '@trading/core';
import type { FeatureValue, HypothesisSpec, Overlay, OverlayAnswer } from '@trading/core';
import type { ConventionSet } from './conventions';
import { siderealMoon } from './shields';
import { taraBala } from './tara';
import type { Tara } from './tara';

/**
 * PH-12, Tara Bala category from the trader's star to the stock's first-trade star (FR-P7, D30). Entries whose
 * category falls in the classical good group (2, 4, 6, 8, 9) are claimed to beat those in the bad group (3, 5, 7).
 * Like H-21 it is an overlay under the contract of FR-S4: it can only let a candidate through or hold it back,
 * with a reason code. It has no score and no boost.
 *
 * The stock's star is the Moon's nakshatra (Lahiri, mean node irrelevant) at 09:15 IST on the company's BSE
 * listing date, which the BSE Corp Information page gives for each company. A company without such a date has no
 * star and gives no signal.
 */
export const PH12_ID = 'PH-12';
export const PH12_VERSION = 1;

/** The owner's chosen trader star: Chathayam / Shatabhisha (23, 0 = Ashwini), Moon sign Aquarius (10). */
export const PH12_TRADER = { moonNakshatra: 23, moonSign: 10 } as const;

/** The claim (D21): favourable group returns 2.0% more over 20 sessions. */
export const PH12_CLAIM = { effectSizePct: 2.0, horizonSessions: 20 } as const;

/** 09:15 IST is 03:45 UTC. Fixed before any return was looked at. */
export const PH12_LISTING_MOMENT_UTC = 'T03:45:00Z';

const NAKSHATRA_DEG = 360 / 27;

/** The Moon's nakshatra (0 to 26) at the registered moment on a listing date `YYYY-MM-DD`. */
export function listingStar(listingDate: string, calc: ConventionSet): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(listingDate))
    throw new Error(`Bad listing date "${listingDate}"`);
  const ms = Date.parse(`${listingDate}${PH12_LISTING_MOMENT_UTC}`);
  if (Number.isNaN(ms)) throw new Error(`Bad listing date "${listingDate}"`);
  return Math.min(26, Math.floor(siderealMoon(ms, calc) / NAKSHATRA_DEG));
}

export interface Ph12Features {
  star: number | null;
  tara: Tara | null;
}

export function ph12Features(star: number | null): Ph12Features {
  return { star, tara: star === null ? null : taraBala(PH12_TRADER.moonNakshatra, star) };
}

/** The features the overlay reads, flattened to plain values so they can be hashed and replayed. */
export function ph12FeatureValues(f: Ph12Features): Record<string, FeatureValue> {
  return {
    companyStar: f.star,
    taraNumber: f.tara?.number ?? null,
    taraGroup: f.tara?.group ?? null,
  };
}

/** Bad group is held back, good group is let through, Janma (mixed) and no star are let through with no signal. */
function decide(x: Readonly<Record<string, FeatureValue>>): OverlayAnswer {
  if (x.taraGroup === 'bad')
    return { decision: 'deny', reasonCode: 'PH12-TARA-UNFAVOURABLE', stateCode: 'RED' };
  if (x.taraGroup === 'good')
    return { decision: 'allow', reasonCode: 'PH12-TARA-FAVOURABLE', stateCode: 'GREEN' };
  if (x.taraGroup === 'mixed')
    return { decision: 'allow', reasonCode: 'PH12-TARA-JANMA', stateCode: 'YELLOW' };
  return { decision: 'allow', reasonCode: 'PH12-NO-STAR', stateCode: 'GRAY-NOSIGNAL' };
}

/** The hash of what is frozen: id, version, decision order, trader star, groups and the listing moment. */
export function ph12RuleHash(): string {
  return sha256Hex(
    canonicalJson({
      id: PH12_ID,
      version: PH12_VERSION,
      trader: PH12_TRADER,
      listingMoment: PH12_LISTING_MOMENT_UTC,
      goodNumbers: [2, 4, 6, 8, 9],
      badNumbers: [3, 5, 7],
      order: ['tara-unfavourable', 'tara-favourable', 'tara-janma', 'no-star'],
    }),
  );
}

export function ph12Overlay(): Overlay {
  return {
    id: 'ph12-tara-first-trade',
    version: PH12_VERSION,
    hypothesisId: PH12_ID,
    ruleHash: ph12RuleHash(),
    evaluate: (_candidate, context) => decide(context.features),
  };
}

export interface Ph12Frozen {
  /** The listing file the stars come from: its hash, and how many companies it covers. */
  listingFileHash: string;
  companies: number;
  excludedInstruments: readonly string[];
}

/**
 * The hypothesis record to pre-register. It shares the family `buyer-company` with H-21, because it asks the same
 * kind of question, so H-21's variant counts in the multiplicity total (M = 2).
 */
export function ph12Spec(frozen: Ph12Frozen): HypothesisSpec {
  return {
    id: PH12_ID,
    title: 'Tara Bala category, trader star to stock first-trade star',
    family: 'buyer-company',
    statedNull:
      'Returns of stocks whose first-trade star is in a good Tara group from the trader star equal returns of stocks in the bad group.',
    claimed: {
      effectSizePct: PH12_CLAIM.effectSizePct,
      direction: 'up',
      horizonSessions: PH12_CLAIM.horizonSessions,
    },
    params: {
      traderNakshatra: PH12_TRADER.moonNakshatra,
      companyStar: 'moon-at-bse-listing-0915-ist',
      ayanamsa: 'lahiri',
      listingFileHash: frozen.listingFileHash,
      companies: frozen.companies,
      goodNumbers: '2,4,6,8,9',
      badNumbers: '3,5,7',
      janma: 'allowed, not claimed',
    },
    ruleHash: ph12RuleHash(),
    excludedInstruments: frozen.excludedInstruments,
  };
}
