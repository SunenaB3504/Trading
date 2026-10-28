import { describe, expect, it } from 'vitest';
import { bondProblem, cashFlows, currentYield, macaulay, modified, priceFromYield, shock, yieldFromPrice } from './index';
import type { Bond } from './index';

const ten: Bond = { face: 100, coupon: 0.07, years: 10, frequency: 1 };

describe('bond prices', () => {
  it('a bond whose yield equals its coupon is worth its face value', () => {
    expect(priceFromYield(ten, 0.07)).toBeCloseTo(100, 8);
    expect(priceFromYield({ ...ten, frequency: 2 }, 0.07)).toBeCloseTo(100, 8);
  });
  it('hand-worked: 10 years, 7% coupon, 8% yield: 7 x 6.71008 + 100 / 2.158925 = 93.29', () => {
    expect(priceFromYield(ten, 0.08)).toBeCloseTo(93.29, 2);
  });
  it('hand-worked: 2 years, 5% coupon paid yearly, 6% yield: 5/1.06 + 105/1.1236 = 98.17', () => {
    expect(priceFromYield({ face: 100, coupon: 0.05, years: 2, frequency: 1 }, 0.06)).toBeCloseTo(98.1666, 3);
  });
  it('a price falls when the yield rises, and a zero-coupon bond is its discounted face value', () => {
    expect(priceFromYield(ten, 0.09)).toBeLessThan(priceFromYield(ten, 0.08));
    expect(priceFromYield({ face: 1000, coupon: 0, years: 5, frequency: 1 }, 0.08)).toBeCloseTo(1000 / 1.08 ** 5, 8);
  });
  it('cash flows are the coupons and the face value at the end', () => {
    expect(cashFlows({ face: 100, coupon: 0.06, years: 2, frequency: 2 })).toEqual([3, 3, 3, 103]);
  });
});

describe('yield and duration', () => {
  it('finds the yield for a price, and none outside the range', () => {
    expect(yieldFromPrice(ten, 93.2899)).toBeCloseTo(0.08, 4);
    expect(yieldFromPrice(ten, 100)).toBeCloseTo(0.07, 6);
    expect(yieldFromPrice(ten, 5)).toBeNull();
    expect(yieldFromPrice(ten, 1000)).toBeNull();
  });
  it('current yield is the yearly coupon over the price', () => {
    expect(currentYield(ten, 93.29)).toBeCloseTo(0.07503, 4);
  });
  it('hand-worked: 10 years, 7% at par: Macaulay duration 7.515 years, modified 7.024', () => {
    expect(macaulay(ten, 0.07)).toBeCloseTo(7.5152, 3);
    expect(modified(ten, 0.07)).toBeCloseTo(7.0235, 3);
  });
  it('a zero-coupon bond has a duration equal to its life', () => {
    expect(macaulay({ face: 100, coupon: 0, years: 5, frequency: 1 }, 0.08)).toBeCloseTo(5, 8);
  });
  it('a one-point rise in yield cuts the price about 7%, and duration alone slightly overstates the fall', () => {
    const up = shock(ten, 0.07, 0.01);
    expect(up.exact).toBeCloseTo(-0.0671, 3);
    expect(up.estimated).toBeCloseTo(-0.0702, 3);
    const down = shock(ten, 0.07, -0.01);
    expect(down.exact).toBeGreaterThan(-down.estimated - 0.01);
    expect(down.exact).toBeGreaterThan(-up.exact);
  });
});

describe('checks', () => {
  it('puts problems in words', () => {
    expect(bondProblem(ten)).toBeNull();
    expect(bondProblem({ ...ten, face: 0 })).toMatch(/face/);
    expect(bondProblem({ ...ten, coupon: 0.9 })).toMatch(/coupon/);
    expect(bondProblem({ ...ten, years: 2.5 })).toMatch(/whole number/);
    expect(bondProblem({ ...ten, years: 2.5, frequency: 2 })).toBeNull();
  });
});
