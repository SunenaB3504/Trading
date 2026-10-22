import { canonicalJson, sha256Hex } from '@trading/core';
import type { InstrumentName } from '@trading/core';
import { siderealMoon } from './shields';
import { nameInForce } from './entity';
import type { FrozenConventions } from './registry';
import { requireRules } from './registry';
import { taraBala } from './tara';
import type { Tara } from './tara';

/**
 * Buyer-company features for T23 and H21 (FR-A4). Three facts, none of them a score: the nakshatra the first
 * syllable of the company's name stands for, the Tara class counted from the buyer's birth star to that star,
 * and whether the Moon is in the 8th sign from the buyer's Moon on the decision date (Chandrashtama).
 * Every one is a hypothesis (H21, tag [M], the weakest-powered family): the name rule and the syllable table
 * are chosen and frozen before any return is looked at (D10).
 */

export type TableStatus = 'proposed' | 'approved';

/** A registered nama-akshara table: each Latin syllable and the nakshatras (0 = Ashwini) it can stand for. */
export interface NamaTable {
  id: string;
  version: number;
  /** Only an `approved` table may be frozen into an experiment. */
  status: TableStatus;
  syllables: Readonly<Record<string, readonly number[]>>;
  hash: string;
}

export function makeNamaTable(
  id: string,
  version: number,
  status: TableStatus,
  rows: ReadonlyArray<readonly [string, number]>,
): NamaTable {
  const syllables: Record<string, number[]> = {};
  for (const [syllable, star] of rows) {
    if (!/^[a-z]+$/.test(syllable))
      throw new Error(`Syllable must be lowercase letters: ${syllable}`);
    if (!Number.isInteger(star) || star < 0 || star > 26)
      throw new Error(`Star must be 0 to 26: ${star}`);
    const list = syllables[syllable] ?? [];
    if (!list.includes(star)) list.push(star);
    syllables[syllable] = list.sort((a, b) => a - b);
  }
  return Object.freeze({
    id,
    version,
    status,
    syllables,
    hash: sha256Hex(canonicalJson({ id, version, syllables })),
  });
}

/** The four syllables of each star in the commonly printed list, in Latin letters. Spellings vary between sources. */
const COMMON_LIST: readonly (readonly string[])[] = [
  ['chu', 'che', 'cho', 'la'],
  ['li', 'lu', 'le', 'lo'],
  ['a', 'i', 'u', 'e'],
  ['o', 'va', 'vi', 'vu'],
  ['ve', 'vo', 'ka', 'ki'],
  ['ku', 'gha', 'chha'],
  ['ke', 'ko', 'ha', 'hi'],
  ['hu', 'he', 'ho', 'da'],
  ['di', 'du', 'de', 'do'],
  ['ma', 'mi', 'mu', 'me'],
  ['mo', 'ta', 'ti', 'tu'],
  ['te', 'to', 'pa', 'pi'],
  ['pu', 'sha', 'na', 'tha'],
  ['pe', 'po', 'ra', 'ri'],
  ['ru', 're', 'ro', 'ta'],
  ['ti', 'tu', 'te', 'to'],
  ['na', 'ni', 'nu', 'ne'],
  ['no', 'ya', 'yi', 'yu'],
  ['ye', 'yo', 'bha', 'bhi'],
  ['bhu', 'dha', 'pha', 'dha'],
  ['bhe', 'bho', 'ja', 'ji'],
  ['ju', 'je', 'jo', 'gha'],
  ['ga', 'gi', 'gu', 'ge'],
  ['go', 'sa', 'si', 'su'],
  ['se', 'so', 'da', 'di'],
  ['du', 'tha', 'jha', 'na'],
  ['de', 'do', 'cha', 'chi'],
];

/**
 * PROPOSED table v1: the commonly printed list. It is not approved: the research note says the name-to-pada
 * table could not be recovered from the local sources, and several syllables belong to more than one star
 * because the list tells apart sounds (dental and retroflex) that Latin spelling does not. The owner chooses
 * and approves the table before it is frozen into any experiment (D10).
 */
export const PROPOSED_NAMA_TABLE_V1: NamaTable = makeNamaTable(
  'common-printed-list',
  1,
  'proposed',
  COMMON_LIST.flatMap((row, star) => row.map((s): [string, number] => [s, star])),
);

/**
 * The same list, APPROVED by the owner on 2026-10-22 as decision D38: the printed list as it is, and a syllable that
 * belongs to two stars gives no signal (nothing is guessed). This is the table H-21 may be registered with.
 */
export const APPROVED_NAMA_TABLE_V1: NamaTable = makeNamaTable(
  'common-printed-list',
  1,
  'approved',
  COMMON_LIST.flatMap((row, star) => row.map((s): [string, number] => [s, star])),
);

/** Lowercase Latin letters only: accents and diacritics folded, spaces and punctuation dropped. */
const letters = (name: string): string =>
  name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

/** The longest table syllable the name starts with, or null if it starts with none. */
export function firstSyllable(name: string, table: NamaTable): string | null {
  const text = letters(name);
  const hits = Object.keys(table.syllables).filter((s) => text.startsWith(s));
  return hits.sort((a, b) => b.length - a.length || (a < b ? -1 : 1))[0] ?? null;
}

export type NameStarReason = 'ok' | 'no-name' | 'no-syllable' | 'ambiguous';

export interface NameStar {
  syllable: string | null;
  /** Every star the syllable can stand for. */
  candidates: number[];
  /** The star, only when the syllable stands for exactly one; otherwise null. The tie rule is: no signal. */
  star: number | null;
  reason: NameStarReason;
}

/** The nakshatra a company name stands for. An ambiguous syllable gives no star: the feature is then absent. */
export function nameStar(name: string | null, table: NamaTable): NameStar {
  if (name === null || letters(name) === '')
    return { syllable: null, candidates: [], star: null, reason: 'no-name' };
  const syllable = firstSyllable(name, table);
  if (syllable === null) return { syllable, candidates: [], star: null, reason: 'no-syllable' };
  const candidates = [...(table.syllables[syllable] ?? [])];
  return candidates.length === 1
    ? { syllable, candidates, star: candidates[0] as number, reason: 'ok' }
    : { syllable, candidates, star: null, reason: 'ambiguous' };
}

export interface Buyer {
  /** The buyer's birth nakshatra (0 = Ashwini) and Moon sign (0 = Aries). */
  moonNakshatra: number;
  moonSign: number;
}

export interface BuyerFeatures {
  name: NameStar;
  /** Tara class from the buyer's star to the name star; null when the name gives no single star. */
  tara: Tara | null;
  /** The Moon is in the 8th sign from the buyer's Moon sign at the decision time. */
  chandrashtama: boolean;
  /** Tag: a hypothesis in the weakest-powered family, tested as H21. */
  tag: '[M] H21';
}

/** The three buyer-company features at one decision time. */
export function buyerFeatures(
  buyer: Buyer,
  companyName: string | null,
  decisionMs: number,
  table: NamaTable,
  conventions: FrozenConventions,
): BuyerFeatures {
  requireRules(conventions, ['nameMapping']);
  const transitSign = Math.floor(siderealMoon(decisionMs, conventions.calc) / 30);
  return buyerFeaturesAt(buyer, companyName, transitSign, table);
}

/** The same features when the transit Moon sign is already known (one Moon calculation can serve many companies). */
export function buyerFeaturesAt(
  buyer: Buyer,
  companyName: string | null,
  transitSign: number,
  table: NamaTable,
): BuyerFeatures {
  const name = nameStar(companyName, table);
  return {
    name,
    tara: name.star === null ? null : taraBala(buyer.moonNakshatra, name.star),
    chandrashtama: transitSign === (buyer.moonSign + 7) % 12,
    tag: '[M] H21',
  };
}

/** The features for a company on a date, using the legal name in force that day (FR-U8, D10). */
export function buyerFeaturesOn(
  buyer: Buyer,
  history: InstrumentName[],
  decisionMs: number,
  table: NamaTable,
  conventions: FrozenConventions,
): BuyerFeatures {
  return buyerFeatures(buyer, nameInForce(history, decisionMs), decisionMs, table, conventions);
}
