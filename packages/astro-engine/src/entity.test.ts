import { describe, expect, it } from 'vitest';
import { makeChart, nameInForce } from './entity';
import { DEFAULT_RULES, freezeConventions, isIntact, requireRules } from './registry';

const MOMENT = { utc: '2020-06-15T06:30', latitude: 8.5, longitude: 76.9 };
const base = freezeConventions(1);

describe('frozen convention set (FR-A2)', () => {
  it('has a stable hash and changes it when any single field changes', () => {
    expect(freezeConventions(1).hash).toBe(base.hash);
    expect(base.hash).toMatch(/^[0-9a-f]{64}$/);
    const variants = [
      freezeConventions(2),
      freezeConventions(1, { ayanamsa: 'lahiri', node: 'true' }),
      freezeConventions(1, undefined, { ...DEFAULT_RULES, nakshatraCount: 28 }),
      freezeConventions(1, undefined, { ...DEFAULT_RULES, nameMapping: 'unregistered' }),
    ];
    for (const v of variants) expect(v.hash).not.toBe(base.hash);
    expect(new Set(variants.map((v) => v.hash)).size).toBe(variants.length);
  });

  it('is frozen, and a tampered copy is detected', () => {
    expect(Object.isFrozen(base)).toBe(true);
    expect(isIntact(base)).toBe(true);
    expect(isIntact({ ...base, rules: { ...base.rules, nakshatraCount: 28 } })).toBe(false);
  });

  it('refuses a feature that needs a rule nobody has registered', () => {
    expect(() => requireRules(base, ['nameMapping', 'timestamp'])).not.toThrow();
    expect(() => requireRules(base, ['kotaAnchor'])).toThrow(/kotaAnchor/);
  });
});

describe('chart entity (FR-A1)', () => {
  it('gets the same id for the same inputs and another for a changed convention or subject', () => {
    const a = makeChart('company', 'RELIANCE', MOMENT, base);
    expect(makeChart('company', 'RELIANCE', MOMENT, base).id).toBe(a.id);
    expect(a.conventionHash).toBe(base.hash);
    expect(makeChart('company', 'RELIANCE', MOMENT, freezeConventions(2)).id).not.toBe(a.id);
    expect(makeChart('company', 'TCS', MOMENT, base).id).not.toBe(a.id);
  });

  it('will not build under a set that was edited after freezing', () => {
    const bad = { ...base, rules: { ...base.rules, nakshatraCount: 28 as const } };
    expect(() => makeChart('prashna', 'x', MOMENT, bad)).toThrow(/frozen/);
  });
});

describe('name in force (FR-U8, D10)', () => {
  const zomato = {
    instrumentId: 'Z',
    legalName: 'Zomato Limited',
    effectiveFrom: 0,
    effectiveTo: 1000,
    source: 't',
  };
  const eternal = {
    instrumentId: 'Z',
    legalName: 'Eternal Limited',
    effectiveFrom: 1000,
    effectiveTo: null,
    source: 't',
  };
  const h = [zomato, eternal];

  it('picks the name by date, with the change date belonging to the new name', () => {
    expect(nameInForce(h, 999)).toBe('Zomato Limited');
    expect(nameInForce(h, 1000)).toBe('Eternal Limited');
    expect(nameInForce(h, 5_000_000)).toBe('Eternal Limited');
  });

  it('answers null before any name existed and refuses an overlapping history', () => {
    expect(nameInForce([{ ...zomato, effectiveFrom: 10 }], 5)).toBeNull();
    expect(() => nameInForce([zomato, { ...zomato, effectiveTo: null }], 5)).toThrow(/Overlapping/);
  });
});
