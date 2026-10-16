import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILL_OPTIONS,
  FillError,
  evaluateExitBar,
  fillOrder,
  trailingStopPaise,
} from './index';
import { MON, NORMAL, bar, cases, ctx, market, order } from './scenarios.data';

describe('fill scenarios (hand-worked)', () => {
  it.each(cases)('$name', (c) => {
    const opts = { ...DEFAULT_FILL_OPTIONS, ...c.opts };
    const r = fillOrder(order(c.order), c.intent ?? 'entry', market(c.days), opts);
    expect(r.status).toBe(c.expect.status);
    if (c.expect.price !== undefined) expect(r.fill?.pricePaise).toBe(c.expect.price);
    if (c.expect.date !== undefined) expect(r.fill?.tradingDate).toBe(c.expect.date);
    if (c.expect.reason !== undefined) expect(r.blockedReason).toBe(c.expect.reason);
    if (c.expect.blocked !== undefined) expect(r.exitBlockedSessions).toBe(c.expect.blocked);
    if (r.fill !== null) expect(r.fill.quantity).toBe(10);
  });

  it('is deterministic: the same inputs give an identical result', () => {
    const run = () => fillOrder(order({ type: 'limit' }), 'entry', market({ [MON]: ctx(NORMAL) }));
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });

  it('refuses invalid rule and order combinations', () => {
    const days = market({ [MON]: ctx(NORMAL) });
    expect(() =>
      fillOrder(order({ rule: 'moc@1', source: 'rule:PH-01@1' }), 'entry', days),
    ).toThrow(FillError);
    expect(() => fillOrder(order({ rule: 'moc@1', type: 'limit' }), 'entry', days)).toThrow(
      FillError,
    );
    expect(() => fillOrder(order({ rule: 'whatever@1' }), 'entry', days)).toThrow(FillError);
  });
});

describe('stops and targets (FR-T12), long position', () => {
  const levels = { stopPaise: 9_500, targetPaise: 10_500 };

  it('fills a stop at the stop price when the session trades through it', () => {
    expect(evaluateExitBar(levels, ctx(bar(9_800, 9_900, 9_450, 9_600)))).toEqual({
      action: 'exit',
      reason: 'stop',
      pricePaise: 9_500,
    });
  });

  it('fills a gap-through stop at the open', () => {
    expect(evaluateExitBar(levels, ctx(bar(9_400, 9_450, 9_300, 9_350)))).toEqual({
      action: 'exit',
      reason: 'stop',
      pricePaise: 9_400,
    });
  });

  it('fills a target at the target price, or at the open when it gaps above', () => {
    expect(evaluateExitBar(levels, ctx(bar(10_000, 10_600, 9_950, 10_550)))).toEqual({
      action: 'exit',
      reason: 'target',
      pricePaise: 10_500,
    });
    expect(evaluateExitBar(levels, ctx(bar(10_600, 10_700, 10_550, 10_650)))).toEqual({
      action: 'exit',
      reason: 'target',
      pricePaise: 10_600,
    });
  });

  it('takes the stop first when one bar reaches both levels', () => {
    expect(evaluateExitBar(levels, ctx(bar(10_000, 10_600, 9_400, 10_000)))).toEqual({
      action: 'exit',
      reason: 'stop',
      pricePaise: 9_500,
    });
  });

  it('does nothing when neither level is reached, there is no bar, or the stock is suspended', () => {
    expect(evaluateExitBar(levels, ctx(NORMAL))).toEqual({ action: 'none' });
    expect(evaluateExitBar(levels, ctx(null))).toEqual({ action: 'none' });
    expect(
      evaluateExitBar(levels, ctx(bar(9_400, 9_450, 9_300, 9_350), { suspended: true })),
    ).toEqual({ action: 'none' });
  });

  it('reports a triggered exit as blocked on a lower-circuit day', () => {
    expect(evaluateExitBar(levels, ctx(bar(9_400, 9_400, 9_300, 9_300, 'lower')))).toEqual({
      action: 'blocked',
      reason: 'circuit_lower',
    });
  });

  it('computes a trailing stop from the highest close and an ATR multiple', () => {
    expect(trailingStopPaise(10_000, 200, { numerator: 2, denominator: 1 })).toBe(9_600);
    expect(trailingStopPaise(10_000, 200, { numerator: 3, denominator: 2 })).toBe(9_700);
  });
});
