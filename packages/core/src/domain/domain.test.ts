import { describe, expect, it } from 'vitest';
import {
  auditEventSchema,
  barUnadjSchema,
  entityJsonSchemas,
  entitySchemas,
  fillSchema,
  instrumentSchema,
  ledgerEntrySchema,
  orderSchema,
  paiseSchema,
  tradingDateSchema,
} from './index';

const order = {
  id: 'o1',
  decisionId: 'd1',
  instrumentId: 'i1',
  side: 'buy',
  type: 'limit',
  quantity: 10,
  limitPaise: 150_000,
  validity: 'day',
  placedAt: 1_700_000_000_000,
  tradingDate: '2026-10-16',
  status: 'open',
  source: 'human',
  rationale: 'test',
  fillRuleId: 'next-open@1',
  blockedReason: null,
};

describe('primitives', () => {
  it('accepts integer paise and rejects fractions and unsafe integers', () => {
    expect(paiseSchema.safeParse(12_345).success).toBe(true);
    expect(paiseSchema.safeParse(12.5).success).toBe(false);
    expect(paiseSchema.safeParse(Number.MAX_SAFE_INTEGER + 2).success).toBe(false);
    expect(paiseSchema.safeParse(Number.NaN).success).toBe(false);
  });

  it('validates trading dates', () => {
    expect(tradingDateSchema.safeParse('2026-10-16').success).toBe(true);
    expect(tradingDateSchema.safeParse('16-10-2026').success).toBe(false);
  });
});

describe('orders and fills', () => {
  it('accepts a valid limit order', () => {
    expect(orderSchema.safeParse(order).success).toBe(true);
  });

  it('rejects a limit order without a price and a market order with one', () => {
    expect(orderSchema.safeParse({ ...order, limitPaise: null }).success).toBe(false);
    expect(orderSchema.safeParse({ ...order, type: 'market' }).success).toBe(false);
    expect(orderSchema.safeParse({ ...order, type: 'market', limitPaise: null }).success).toBe(
      true,
    );
  });

  it('rejects bad sources and non-positive quantities', () => {
    expect(orderSchema.safeParse({ ...order, source: 'robot' }).success).toBe(false);
    expect(orderSchema.safeParse({ ...order, source: 'rule:PH-01@1.0' }).success).toBe(true);
    expect(orderSchema.safeParse({ ...order, quantity: 0 }).success).toBe(false);
  });

  it('rejects fractional fill prices', () => {
    const fill = {
      id: 'f1',
      orderId: 'o1',
      instrumentId: 'i1',
      side: 'buy',
      quantity: 1,
      pricePaise: 100.5,
      costsPaise: 0,
      fillRuleId: 'x',
      filledAt: 1,
      tradingDate: '2026-10-16',
    };
    expect(fillSchema.safeParse(fill).success).toBe(false);
    expect(fillSchema.safeParse({ ...fill, pricePaise: 100 }).success).toBe(true);
  });
});

describe('instrument, bars, ledger, audit', () => {
  it('requires a valid ISIN', () => {
    const inst = {
      id: 'i1',
      kind: 'equity',
      exchange: 'NSE',
      symbol: 'TCS',
      isin: 'INE467B01029',
      sector: 'IT',
      listingDate: '2004-08-25',
      firstTradeTs: null,
      firstTradeSource: null,
      verification: 'time_assumed',
      delistedOn: null,
      delistReason: null,
    };
    expect(instrumentSchema.safeParse(inst).success).toBe(true);
    expect(instrumentSchema.safeParse({ ...inst, isin: 'bad' }).success).toBe(false);
  });

  it('keeps unadjusted bars in integer paise', () => {
    const bar = {
      instrumentId: 'i1',
      date: '2026-10-16',
      open: 1,
      high: 2,
      low: 1,
      close: 2,
      volume: 10,
      provider: 'bhavcopy',
      snapshotId: 's1',
      disputed: false,
      circuitFlag: 'none',
    };
    expect(barUnadjSchema.safeParse(bar).success).toBe(true);
    expect(barUnadjSchema.safeParse({ ...bar, close: 1.5 }).success).toBe(false);
  });

  it('allows signed ledger amounts but not fractional ones', () => {
    const entry = {
      id: 'e1',
      txnId: 't1',
      seq: 0,
      account: 'cash',
      instrumentId: null,
      amountPaise: -500,
      quantityDelta: 0,
      fillId: null,
      correctsEntryId: null,
      createdAt: 1,
    };
    expect(ledgerEntrySchema.safeParse(entry).success).toBe(true);
    expect(ledgerEntrySchema.safeParse({ ...entry, amountPaise: -0.5 }).success).toBe(false);
  });

  it('requires 64-character lower-case hex hashes', () => {
    const zero = '0'.repeat(64);
    const ev = {
      seq: 0,
      prevHash: zero,
      hash: 'a'.repeat(64),
      type: 'freeze',
      payloadRef: 'p',
      createdAt: 1,
    };
    expect(auditEventSchema.safeParse(ev).success).toBe(true);
    expect(auditEventSchema.safeParse({ ...ev, hash: 'A'.repeat(64) }).success).toBe(false);
  });
});

describe('JSON schemas', () => {
  it('generates a schema for every entity', () => {
    expect(Object.keys(entityJsonSchemas()).sort()).toEqual(Object.keys(entitySchemas).sort());
  });

  it('matches the committed snapshot', () => {
    expect(entityJsonSchemas()).toMatchSnapshot();
  });
});
