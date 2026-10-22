import { canonicalJson, sha256Hex } from '@trading/core';
import type { FeatureValue, HypothesisSpec, Overlay, OverlayAnswer } from '@trading/core';
import type { BuyerFeatures, NamaTable } from './buyer';

/**
 * H21, buyer-to-entity compatibility (T23, tag [M], the weakest-powered family): stocks whose name star is in a
 * favourable Tara class from the buyer's birth star do better than unfavourable ones, and trades on the buyer's
 * Chandrashtama days do worse. Here it is an overlay under the contract of FR-S4: it can only let a candidate
 * through or hold it back, with a reason code, and it carries its own H-ID.
 */
export const H21_ID = 'H-21';
export const H21_VERSION = 1;

/** The features the overlay reads, flattened to plain values so they can be hashed and replayed. */
export function h21Features(f: BuyerFeatures): Record<string, FeatureValue> {
  return {
    nameReason: f.name.reason,
    taraNumber: f.tara?.number ?? null,
    taraGroup: f.tara?.group ?? null,
    chandrashtama: f.chandrashtama,
  };
}

/** The decision table, in order: Chandrashtama first, then the Tara group; no star for the name means no signal. */
function decide(x: Readonly<Record<string, FeatureValue>>): OverlayAnswer {
  if (x.chandrashtama === true)
    return { decision: 'deny', reasonCode: 'H21-CHANDRASHTAMA-DAY', stateCode: 'RED' };
  if (x.taraGroup === 'bad')
    return { decision: 'deny', reasonCode: 'H21-TARA-UNFAVOURABLE', stateCode: 'RED' };
  if (x.taraGroup === 'good')
    return { decision: 'allow', reasonCode: 'H21-TARA-FAVOURABLE', stateCode: 'GREEN' };
  if (x.taraGroup === 'mixed')
    return { decision: 'allow', reasonCode: 'H21-TARA-JANMA', stateCode: 'YELLOW' };
  return { decision: 'allow', reasonCode: 'H21-NO-NAME-STAR', stateCode: 'GRAY-NOSIGNAL' };
}

/**
 * The claim the owner stated on 2026-10-22 (D21), before any result was looked at: stocks in a favourable Tara class
 * from the buyer's star return 2.0% more than the others over a 20-session hold. The Chandrashtama part is not
 * claimed separately (it is market-wide, below the detectable size at 8 years; PH-09 covers it).
 */
export const H21_OWNER_CLAIM = { effectSizePct: 2.0, horizonSessions: 20 } as const;

/**
 * The buyer for the first frozen run (D41, owner chose a star drawn by a public seed, 2026-10-22). Every company name
 * is favourable for the same number of buyer stars, so pooling all 27 buyers would cancel the contrast; one buyer is
 * tested. The star is drawn from the seed text below before any result: `createRng(seed).fork('buyer-star')`.
 * Shatabhisha (23) lies wholly in Aquarius (Moon sign 10, Aries = 0). No person's chart is involved.
 */
export const H21_BUYER_SEED = 'H-21 buyer star, drawn 2026-10-22 before any result';
export const H21_BUYER = { moonNakshatra: 23, moonSign: 10 } as const;

export interface H21Frozen {
  table: NamaTable;
}

/** The hash of what is frozen: the id, version, decision table and the syllable table. */
export function h21RuleHash(table: NamaTable): string {
  return sha256Hex(
    canonicalJson({
      id: H21_ID,
      version: H21_VERSION,
      tableHash: table.hash,
      order: ['chandrashtama', 'tara-unfavourable', 'tara-favourable', 'tara-janma', 'no-star'],
    }),
  );
}

export function h21Overlay(table: NamaTable): Overlay {
  return {
    id: 'h21-buyer-company',
    version: H21_VERSION,
    hypothesisId: H21_ID,
    ruleHash: h21RuleHash(table),
    evaluate: (_candidate, context) => decide(context.features),
  };
}

export interface H21Claim {
  effectSizePct: number;
  horizonSessions: number;
  /** Instruments used in the exploratory pilot, left out of confirmatory tests. */
  excludedInstruments: readonly string[];
}

/**
 * The hypothesis record to pre-register. It refuses a table the owner has not approved, because the table must be
 * chosen before any return is looked at (D10); the claimed effect size is the owner's to state (D21).
 */
export function h21Spec(table: NamaTable, claim: H21Claim): HypothesisSpec {
  if (table.status !== 'approved')
    throw new Error('H-21 needs an approved name-syllable table; this one is only proposed');
  return {
    id: H21_ID,
    title: 'Buyer-to-entity compatibility (name star Tara class, Chandrashtama day)',
    family: 'buyer-company',
    statedNull:
      'For a given buyer, returns of stocks in favourable Tara classes and on non-Chandrashtama days equal returns of the others.',
    claimed: {
      effectSizePct: claim.effectSizePct,
      direction: 'up',
      horizonSessions: claim.horizonSessions,
    },
    params: {
      tableId: table.id,
      tableVersion: table.version,
      tableHash: table.hash,
      nameRule: 'legal-name-in-force',
    },
    ruleHash: h21RuleHash(table),
    excludedInstruments: claim.excludedInstruments,
  };
}
