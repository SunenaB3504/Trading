import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RISK_LIMITS,
  bpsOf,
  dailyLossHalted,
  preTradeCheck,
  quantityWithinPositionCap,
  quantityWithinTradeRisk,
} from './index';
import type { PreTradeInput } from './index';

const EQUITY = 100_000_000; // Rs 10,00,000
const PRICE = 100_000; // Rs 1,000 per share

function input(over: Partial<PreTradeInput> = {}): PreTradeInput {
  return {
    side: 'buy',
    requestedQuantity: 1_000,
    pricePaise: PRICE,
    stopPaise: 95_000,
    equityPaise: EQUITY,
    startOfDayEquityPaise: EQUITY,
    heldValuePaise: 0,
    ...over,
  };
}

describe('risk limits (D7 defaults, hand-worked)', () => {
  it('position cap is 10% of equity: 100 shares at Rs 1,000', () => {
    expect(bpsOf(EQUITY, 1_000)).toBe(10_000_000);
    expect(quantityWithinPositionCap(EQUITY, 0, PRICE, DEFAULT_RISK_LIMITS)).toBe(100);
  });

  it('existing holdings use up room under the cap', () => {
    expect(quantityWithinPositionCap(EQUITY, 4_000_000, PRICE, DEFAULT_RISK_LIMITS)).toBe(60);
    expect(quantityWithinPositionCap(EQUITY, 10_000_000, PRICE, DEFAULT_RISK_LIMITS)).toBe(0);
    expect(quantityWithinPositionCap(EQUITY, 12_000_000, PRICE, DEFAULT_RISK_LIMITS)).toBe(0);
  });

  it('trade risk is 2% of equity to the stop: 400 shares for a Rs 50 stop distance', () => {
    expect(quantityWithinTradeRisk(EQUITY, PRICE, 95_000, DEFAULT_RISK_LIMITS)).toBe(400); // 2,000,000 / 5,000
    expect(quantityWithinTradeRisk(EQUITY, PRICE, 70_000, DEFAULT_RISK_LIMITS)).toBe(66); // 2,000,000 / 30,000
    expect(quantityWithinTradeRisk(EQUITY, PRICE, PRICE, DEFAULT_RISK_LIMITS)).toBe(0);
    expect(quantityWithinTradeRisk(EQUITY, PRICE, 110_000, DEFAULT_RISK_LIMITS)).toBe(0);
  });

  it('the daily halt triggers at exactly a 3% loss', () => {
    expect(dailyLossHalted(EQUITY, EQUITY, DEFAULT_RISK_LIMITS)).toBe(false);
    expect(dailyLossHalted(EQUITY, 97_000_001, DEFAULT_RISK_LIMITS)).toBe(false);
    expect(dailyLossHalted(EQUITY, 97_000_000, DEFAULT_RISK_LIMITS)).toBe(true);
    expect(dailyLossHalted(EQUITY, 90_000_000, DEFAULT_RISK_LIMITS)).toBe(true);
  });
});

describe('pre-trade check', () => {
  it('cuts an oversized arm order to the position cap', () => {
    const r = preTradeCheck(input({ requestedQuantity: 500 }));
    expect(r).toEqual({ allowed: true, quantity: 100, reasons: ['position_cap'] });
  });

  it('cuts to the trade-risk budget when that is tighter', () => {
    const r = preTradeCheck(input({ requestedQuantity: 500, stopPaise: 70_000 }));
    expect(r).toEqual({ allowed: true, quantity: 66, reasons: ['position_cap', 'trade_risk'] });
  });

  it('passes a small order through untouched', () => {
    expect(preTradeCheck(input({ requestedQuantity: 20 }))).toEqual({
      allowed: true,
      quantity: 20,
      reasons: [],
    });
  });

  it('notes when a buy has no stop, and applies only the position cap', () => {
    const r = preTradeCheck(input({ stopPaise: null, requestedQuantity: 500 }));
    expect(r.quantity).toBe(100);
    expect(r.reasons).toContain('no_stop_trade_risk_unchecked');
  });

  it('blocks entries during a daily-loss halt but never exits', () => {
    const halted = { equityPaise: 96_000_000 };
    expect(preTradeCheck(input(halted))).toEqual({
      allowed: false,
      quantity: 0,
      reasons: ['daily_loss_halt'],
    });
    expect(preTradeCheck(input({ ...halted, side: 'sell', requestedQuantity: 7 }))).toEqual({
      allowed: true,
      quantity: 7,
      reasons: [],
    });
  });

  it('refuses a buy when the position is already at the cap', () => {
    const r = preTradeCheck(input({ heldValuePaise: 10_000_000 }));
    expect(r.allowed).toBe(false);
    expect(r.quantity).toBe(0);
  });

  it('caps override sizing for any request (property)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000 }),
        fc.integer({ min: 1_000, max: 1_000_000 }),
        fc.integer({ min: 100, max: 999_999 }),
        fc.integer({ min: 0, max: 20_000_000 }),
        fc.integer({ min: 10_000_000, max: 500_000_000 }),
        (requested, price, stop, held, equity) => {
          const r = preTradeCheck({
            side: 'buy',
            requestedQuantity: requested,
            pricePaise: price,
            stopPaise: stop,
            equityPaise: equity,
            startOfDayEquityPaise: equity,
            heldValuePaise: held,
          });
          expect(r.quantity).toBeLessThanOrEqual(requested);
          expect(held + r.quantity * price).toBeLessThanOrEqual(
            Math.max(held, bpsOf(equity, 1_000)),
          );
          if (r.quantity > 0 && stop < price) {
            expect(r.quantity * (price - stop)).toBeLessThanOrEqual(bpsOf(equity, 200));
          }
          expect(r.allowed).toBe(r.quantity > 0);
        },
      ),
      { numRuns: 1_000 },
    );
  });
});
