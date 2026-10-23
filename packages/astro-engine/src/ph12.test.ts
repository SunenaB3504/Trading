import { describe, expect, it } from 'vitest';
import { DEFAULT_CONVENTIONS } from './conventions';
import {
  PH12_TRADER,
  listingStar,
  ph12Features,
  ph12Overlay,
  ph12RuleHash,
  ph12Spec,
} from './ph12';

describe('PH-12', () => {
  it('gives a star between 0 and 26 and the same star for the same date', () => {
    const a = listingStar('1982-10-22', DEFAULT_CONVENTIONS);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(26);
    expect(listingStar('1982-10-22', DEFAULT_CONVENTIONS)).toBe(a);
  });

  it('refuses a malformed date', () => {
    expect(() => listingStar('22-10-1982', DEFAULT_CONVENTIONS)).toThrow();
  });

  it('counts the Tara category from the trader star, in that direction', () => {
    expect(ph12Features(PH12_TRADER.moonNakshatra).tara?.number).toBe(1);
    expect(ph12Features(null).tara).toBeNull();
    // Chathayam (23) to Revati (26): count 4, Kshema, good.
    expect(ph12Features(26).tara).toMatchObject({ count: 4, number: 4, group: 'good' });
  });

  it('holds back the bad group and lets the rest through', () => {
    const o = ph12Overlay();
    const ctx = (g: string | null) => ({ features: { taraGroup: g }, decidedAt: 0 });
    const cand = { instrumentId: 'X', date: '2020-01-01', side: 'buy' as const, quantity: 1 };
    expect(o.evaluate(cand, ctx('bad')).decision).toBe('deny');
    expect(o.evaluate(cand, ctx('good')).decision).toBe('allow');
    expect(o.evaluate(cand, ctx('mixed')).decision).toBe('allow');
    expect(o.evaluate(cand, ctx(null)).reasonCode).toBe('PH12-NO-STAR');
  });

  it('builds a spec in the buyer-company family with a stable rule hash', () => {
    const spec = ph12Spec({
      listingFileHash: 'a'.repeat(64),
      companies: 72,
      excludedInstruments: [],
    });
    expect(spec.id).toBe('PH-12');
    expect(spec.family).toBe('buyer-company');
    expect(spec.ruleHash).toBe(ph12RuleHash());
  });
});
