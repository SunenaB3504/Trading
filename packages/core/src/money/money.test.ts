import { describe, expect, it } from 'vitest';
import {
  MoneyError,
  addPaise,
  applyRatePpm,
  assertPaise,
  assertQuantity,
  assertWholeShares,
  formatPaise,
  mulDiv,
  mulPaise,
  negatePaise,
  parsePaise,
  roundDiv,
  subPaise,
  sumPaise,
} from './index';

const MAX = Number.MAX_SAFE_INTEGER;

describe('paise arithmetic', () => {
  it('adds, subtracts, negates and multiplies exactly', () => {
    expect(addPaise(100, 250)).toBe(350);
    expect(subPaise(100, 250)).toBe(-150);
    expect(negatePaise(5)).toBe(-5);
    expect(mulPaise(15_050, 7)).toBe(105_350);
    expect(sumPaise([1, 2, 3, 4])).toBe(10);
  });

  it('never returns negative zero', () => {
    expect(Object.is(negatePaise(0), 0)).toBe(true);
    expect(Object.is(mulPaise(-5, 0), 0)).toBe(true);
    expect(Object.is(subPaise(5, 5), 0)).toBe(true);
  });

  it('rejects fractions, NaN, Infinity and unsafe integers', () => {
    for (const bad of [0.5, Number.NaN, Infinity, MAX + 2]) {
      expect(() => assertPaise(bad)).toThrow(MoneyError);
    }
  });

  it('detects overflow instead of losing precision', () => {
    expect(() => addPaise(MAX, 1)).toThrow(MoneyError);
    expect(() => subPaise(-MAX, 1)).toThrow(MoneyError);
    expect(() => mulPaise(MAX, 2)).toThrow(MoneyError);
    expect(addPaise(MAX - 1, 1)).toBe(MAX);
  });
});

describe('rounding', () => {
  it('rounds half cases per mode on positive values', () => {
    expect(roundDiv(5, 2, 'half_up')).toBe(3);
    expect(roundDiv(5, 2, 'half_even')).toBe(2);
    expect(roundDiv(7, 2, 'half_even')).toBe(4);
    expect(roundDiv(5, 2, 'down')).toBe(2);
    expect(roundDiv(5, 2, 'up')).toBe(3);
    expect(roundDiv(4, 2, 'up')).toBe(2);
  });

  it('rounds the magnitude, so negatives mirror positives', () => {
    expect(roundDiv(-5, 2, 'half_up')).toBe(-3);
    expect(roundDiv(-5, 2, 'half_even')).toBe(-2);
    expect(roundDiv(-5, 2, 'down')).toBe(-2);
    expect(Object.is(roundDiv(-1, 3, 'down'), 0)).toBe(true);
  });

  it('rejects bad divisors', () => {
    expect(() => roundDiv(1, 0, 'half_up')).toThrow(MoneyError);
    expect(() => roundDiv(1, -2, 'half_up')).toThrow(MoneyError);
    expect(() => roundDiv(1, 1.5, 'half_up')).toThrow(MoneyError);
  });

  it('applies rates in parts per million (hand-worked)', () => {
    // 0.1% of ₹1,00,000.00 = ₹100.00
    expect(applyRatePpm(10_000_000, 1_000, 'half_up')).toBe(10_000);
    // 0.00297% of ₹12,345.67 = ₹0.3666... -> 37 paise (half_up) vs 36 (down)
    expect(applyRatePpm(1_234_567, 29_700 / 10, 'half_up')).toBe(3_667);
    expect(applyRatePpm(1_234_567, 2_970, 'down')).toBe(3_666);
    expect(applyRatePpm(-1_234_567, 2_970, 'half_up')).toBe(-3_667);
  });

  it('throws on operands too large for exact arithmetic', () => {
    expect(() => mulDiv(MAX, MAX, 7, 'half_up')).toThrow(MoneyError);
    expect(() => mulDiv(5, -1, 2, 'half_up')).toThrow(MoneyError);
  });
});

describe('decimal parsing and formatting', () => {
  it('parses exactly', () => {
    expect(parsePaise('1234.5')).toBe(123_450);
    expect(parsePaise('0.07')).toBe(7);
    expect(parsePaise('-12')).toBe(-1_200);
    expect(parsePaise('10.500')).toBe(1_050);
    expect(parsePaise(' 3.10 ')).toBe(310);
  });

  it('rejects ambiguous or locale-style input', () => {
    for (const bad of ['', '1,234.00', '1.234', '12.', '.5', 'abc', '1e3', '1234567890123456.00']) {
      expect(() => parsePaise(bad)).toThrow(MoneyError);
    }
  });

  it('formats with two places and a sign', () => {
    expect(formatPaise(123_450)).toBe('1234.50');
    expect(formatPaise(7)).toBe('0.07');
    expect(formatPaise(-1_200)).toBe('-12.00');
    expect(formatPaise(0)).toBe('0.00');
  });
});

describe('quantities', () => {
  it('requires positive integers for order quantities', () => {
    expect(assertQuantity(10)).toBe(10);
    for (const bad of [0, -1, 1.5, Number.NaN])
      expect(() => assertQuantity(bad)).toThrow(MoneyError);
  });

  it('allows zero and negative whole-share deltas', () => {
    expect(assertWholeShares(0)).toBe(0);
    expect(assertWholeShares(-4)).toBe(-4);
    expect(() => assertWholeShares(0.5)).toThrow(MoneyError);
  });
});
