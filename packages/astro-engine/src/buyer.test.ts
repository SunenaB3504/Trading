import { EMPTY_REGISTRY, evaluateOverlay, freeze, preRegister } from '@trading/core';
import type { InstrumentName } from '@trading/core';
import { describe, expect, it } from 'vitest';
import {
  APPROVED_NAMA_TABLE_V1,
  PROPOSED_NAMA_TABLE_V1 as TABLE,
  buyerFeatures,
  buyerFeaturesOn,
  firstSyllable,
  makeNamaTable,
  nameStar,
} from './buyer';
import { h21Features, h21Overlay, h21Spec } from './h21';
import { freezeConventions } from './registry';

const conv = freezeConventions(1);
// Buyer born with the Moon in Anuradha (16) in Scorpio (7).
const buyer = { moonNakshatra: 16, moonSign: 7 };
const at = (d: Date): number => d.getTime();

describe('the first syllable of a name', () => {
  it('takes the longest table syllable the name starts with, ignoring case, accents and spaces', () => {
    expect(firstSyllable('Bharat Electronics', TABLE)).toBe('bha');
    expect(firstSyllable('  CHANDRA Ltd', TABLE)).toBe('cha');
    expect(firstSyllable('Chhaya', TABLE)).toBe('chha');
    expect(firstSyllable('Édelweiss', TABLE)).toBe('e');
    expect(firstSyllable('Wipro', TABLE)).toBeNull();
  });
});

describe('the star a name stands for', () => {
  it('gives a star when the syllable belongs to exactly one', () => {
    expect(nameStar('Reliance Industries', TABLE)).toMatchObject({
      syllable: 're',
      star: 14,
      reason: 'ok',
    });
    expect(nameStar('Infosys', TABLE)).toMatchObject({ syllable: 'i', star: 2, reason: 'ok' });
    expect(nameStar('Hindustan Unilever', TABLE)).toMatchObject({ syllable: 'hi', star: 6 });
  });

  it('gives no star, and says why, when the syllable is shared, missing or the name is empty', () => {
    expect(nameStar('Tata Motors', TABLE)).toEqual({
      syllable: 'ta',
      candidates: [10, 14],
      star: null,
      reason: 'ambiguous',
    });
    expect(nameStar('Zomato', TABLE).reason).toBe('no-syllable');
    expect(nameStar(null, TABLE).reason).toBe('no-name');
    expect(nameStar('  ', TABLE).reason).toBe('no-name');
  });

  it('is a proposed table, and a table has a stable content hash', () => {
    expect(TABLE.status).toBe('proposed');
    const again = makeNamaTable(
      TABLE.id,
      TABLE.version,
      'approved',
      Object.entries(TABLE.syllables).flatMap(([s, l]) => l.map((i): [string, number] => [s, i])),
    );
    expect(again.hash).toBe(TABLE.hash);
    expect(makeNamaTable('x', 1, 'approved', [['ka', 3]]).hash).not.toBe(TABLE.hash);
  });

  it('refuses a badly formed table', () => {
    expect(() => makeNamaTable('x', 1, 'approved', [['Ka', 3]])).toThrow();
    expect(() => makeNamaTable('x', 1, 'approved', [['ka', 27]])).toThrow();
  });
});

describe('buyer-company features, worked by hand', () => {
  // Counting from Anuradha (16): Reliance stands for Swati (14): ((14-16+27)%27)+1 = 26, 26 mod 9 = 8: Mitra, good.
  // Infosys stands for Krittika (2): ((2-16+27)%27)+1 = 14, 14 mod 9 = 5: Pratyak, bad.
  const quiet = at(new Date(Date.UTC(2026, 9, 29, 16, 0))); // Moon still in Taurus
  const inside = at(new Date(Date.UTC(2026, 9, 29, 17, 0))); // Moon entered Gemini 22:07 IST = 16:37 UTC

  it('counts the Tara class from the buyer star to the name star', () => {
    const r = buyerFeatures(buyer, 'Reliance Industries', quiet, TABLE, conv);
    expect(r.tara).toMatchObject({ count: 26, number: 8, name: 'Mitra', group: 'good' });
    const i = buyerFeatures(buyer, 'Infosys', quiet, TABLE, conv);
    expect(i.tara).toMatchObject({ count: 14, number: 5, name: 'Pratyak', group: 'bad' });
    expect(buyerFeatures(buyer, 'Tata Motors', quiet, TABLE, conv).tara).toBeNull();
  });

  it('flags Chandrashtama when the Moon is in the 8th sign from the buyer Moon sign (Gemini for Scorpio)', () => {
    expect(buyerFeatures(buyer, 'Infosys', quiet, TABLE, conv).chandrashtama).toBe(false);
    expect(buyerFeatures(buyer, 'Infosys', inside, TABLE, conv).chandrashtama).toBe(true);
  });

  it('uses the legal name in force on the decision date (renames, FR-U8)', () => {
    const t = (y: number): number => Date.UTC(y, 0, 1);
    const history = [
      {
        instrumentId: 'ETERNAL',
        legalName: 'Zomato Limited',
        effectiveFrom: t(2021),
        effectiveTo: t(2025),
      },
      {
        instrumentId: 'ETERNAL',
        legalName: 'Eternal Limited',
        effectiveFrom: t(2025),
        effectiveTo: null,
      },
    ] as unknown as InstrumentName[];
    expect(buyerFeaturesOn(buyer, history, t(2023), TABLE, conv).name.reason).toBe('no-syllable');
    expect(buyerFeaturesOn(buyer, history, t(2025) + 86_400_000, TABLE, conv).name).toMatchObject({
      syllable: 'e',
      star: 2,
    });
    expect(buyerFeaturesOn(buyer, history, t(2019), TABLE, conv).name.reason).toBe('no-name');
  });

  it('refuses to run when the name rule is not registered', () => {
    const open = freezeConventions(1, undefined, { ...conv.rules, nameMapping: 'unregistered' });
    expect(() => buyerFeatures(buyer, 'Infosys', quiet, TABLE, open)).toThrow(/not registered/);
  });
});

describe('H-21 as an overlay', () => {
  const approved = makeNamaTable(
    TABLE.id,
    TABLE.version,
    'approved',
    Object.entries(TABLE.syllables).flatMap(([s, l]) => l.map((i): [string, number] => [s, i])),
  );
  const claim = { effectSizePct: 0.5, horizonSessions: 20, excludedInstruments: ['PILOT'] };
  const quiet = at(new Date(Date.UTC(2026, 9, 29, 16, 0)));
  const inside = at(new Date(Date.UTC(2026, 9, 29, 17, 0)));
  const candidate = { instrumentId: 'X', date: '2026-10-29', side: 'buy' as const, quantity: 1 };
  const anchor = {
    submit: (digest: string) =>
      Promise.resolve({ provider: 't', digest, submittedAt: 2000, proof: '' }),
  };

  it('will not register on a table the owner has not approved, and needs a claimed effect', () => {
    expect(() => h21Spec(TABLE, claim)).toThrow(/approved/);
    expect(h21Spec(approved, claim).ruleHash).toBe(h21Overlay(approved).ruleHash);
  });

  it('allows favourable names, holds back unfavourable ones and Chandrashtama days, and marks no-star as no signal', async () => {
    const spec = h21Spec(approved, claim);
    const reg = await freeze(preRegister(EMPTY_REGISTRY, spec, 1000), 'H-21', 1500, anchor);
    const overlay = h21Overlay(approved);
    const ask = (name: string, ms: number) => {
      const f = h21Features(buyerFeatures(buyer, name, ms, approved, conv));
      return evaluateOverlay(reg, spec, overlay, candidate, { features: f, decidedAt: ms }, 3000);
    };
    const code = (o: ReturnType<typeof ask>) => (o.ok ? o.result.reasonCode : o.reason);
    expect(code(ask('Reliance Industries', quiet))).toBe('H21-TARA-FAVOURABLE');
    expect(code(ask('Infosys', quiet))).toBe('H21-TARA-UNFAVOURABLE');
    expect(code(ask('Reliance Industries', inside))).toBe('H21-CHANDRASHTAMA-DAY');
    const none = ask('Tata Motors', quiet);
    expect(none.ok && none.result.stateCode).toBe('GRAY-NOSIGNAL');
    expect(none.ok && none.result.decision).toBe('allow');
  });
});

const PROPOSED_NAMA_TABLE_V1 = TABLE;

describe('the table the owner approved (D38)', () => {
  const claim = { effectSizePct: 0.5, horizonSessions: 20, excludedInstruments: [] };

  it('is the printed list as it is, now approved, with the same hash (approval does not change what is frozen)', () => {
    expect(APPROVED_NAMA_TABLE_V1.status).toBe('approved');
    expect(APPROVED_NAMA_TABLE_V1.syllables).toEqual(PROPOSED_NAMA_TABLE_V1.syllables);
    expect(APPROVED_NAMA_TABLE_V1.hash).toBe(PROPOSED_NAMA_TABLE_V1.hash);
  });

  it('lets H-21 be specified, which the proposed table was not', () => {
    expect(() => h21Spec(APPROVED_NAMA_TABLE_V1, claim)).not.toThrow();
    expect(() => h21Spec(PROPOSED_NAMA_TABLE_V1, claim)).toThrow('only proposed');
  });

  it('gives no signal for a syllable that belongs to two stars (nothing is guessed)', () => {
    const ambiguous = Object.entries(APPROVED_NAMA_TABLE_V1.syllables).filter(
      ([, stars]) => stars.length > 1,
    );
    expect(ambiguous).toHaveLength(13);
    expect(nameStar('Tata Steel', APPROVED_NAMA_TABLE_V1)).toMatchObject({
      star: null,
      reason: 'ambiguous',
    });
  });
});
