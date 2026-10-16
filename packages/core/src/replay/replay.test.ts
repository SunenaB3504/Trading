import { describe, expect, it } from 'vitest';
import { reconcile } from '../ledger';
import { buildFixtureScenario } from './fixtureScenario';
import { runReplay } from './run';

/** Golden report hash for fixture-v1. Mirrored in fixtures/golden/replay_scenario_v1.json. */
export const GOLDEN_REPORT_HASH =
  'e0b425cce01d3276c53909e3af23d198a90d49d14f140fafca9a8a2be9b4b3a8';

const run = () => {
  const s = buildFixtureScenario();
  return runReplay(s.snapshot, s.orders, s.config);
};

describe('replay runner on the fixture scenario', () => {
  it('reproduces the golden report hash', () => {
    expect(run().reportHash).toBe(GOLDEN_REPORT_HASH);
  });

  it('is deterministic: two runs give identical output, byte for byte', () => {
    const a = run();
    const b = run();
    expect(JSON.stringify(a.report)).toBe(JSON.stringify(b.report));
    expect(JSON.stringify(a.outcomes)).toBe(JSON.stringify(b.outcomes));
    expect(a.reportHash).toBe(b.reportHash);
  });

  it('does not depend on the order the orders are supplied in', () => {
    const s = buildFixtureScenario();
    const shuffled = [...s.orders].reverse();
    expect(runReplay(s.snapshot, shuffled, s.config).reportHash).toBe(GOLDEN_REPORT_HASH);
  });

  it('changes the hash when any input changes', () => {
    const s = buildFixtureScenario();
    const fewer = runReplay(s.snapshot, s.orders.slice(0, -1), s.config).reportHash;
    expect(fewer).not.toBe(GOLDEN_REPORT_HASH);
    const richer = runReplay(s.snapshot, s.orders, {
      ...s.config,
      capitalPaise: s.config.capitalPaise + 1,
    });
    expect(richer.reportHash).not.toBe(GOLDEN_REPORT_HASH);
  });

  it('reconciles with its fills and satisfies the accounting identity', () => {
    const r = run();
    expect(reconcile(r.state, r.fills)).toEqual([]);
    expect(r.report.netPnlPaise).toBe(
      r.report.realisedPaise - r.report.feesPaise + r.report.unrealisedPaise,
    );
    expect(r.report.equityPaise).toBe(100_000_000 + r.report.netPnlPaise);
  });

  it('applies the risk caps, circuit carry-over, expiry and ledger rejection as engineered', () => {
    const byId = new Map(run().outcomes.map((o) => [o.orderId, o]));
    expect(byId.get('o04')).toMatchObject({
      status: 'filled',
      requestedQuantity: 500,
      filledQuantity: 7,
      riskReasons: ['position_cap'],
    });
    expect(byId.get('o06')).toMatchObject({
      status: 'filled',
      exitBlockedSessions: 1,
      tradingDate: '2026-04-09',
    });
    expect(byId.get('o07')).toMatchObject({ status: 'expired', reason: 'limit_not_reached' });
    expect(byId.get('o11')).toMatchObject({ status: 'rejected' });
    expect(byId.get('o11')?.reason).toMatch(/cannot sell/);
    expect(byId.get('o12')).toMatchObject({ status: 'filled', tradingDate: '2026-06-15' });
  });

  it('handles the 5-for-1 split: 30 shares become 150; 60 and later 90 are sold', () => {
    const r = run();
    const bbb = r.state.entries.filter((e) => e.instrumentId === 'BBB' && e.account === 'position');
    const quantities = bbb.map((e) => e.quantityDelta);
    expect(quantities).toContain(120); // 30 -> 150 on the split
    expect(
      r.state.trades.filter((t) => t.instrumentId === 'BBB').reduce((n, t) => n + t.quantity, 0),
    ).toBe(150); // 60 sold after the split, 90 later
  });

  it('posts the AAA dividend on the shares held at the ex-date', () => {
    const div = run().state.entries.find((e) => e.txnId.startsWith('ca:AAA|dividend'));
    expect(div).toBeDefined();
  });

  it('summarises the closed trades', () => {
    const r = run();
    expect(r.summary.count).toBe(r.state.trades.length);
    expect(r.summary.totalNetPnlPaise).toBe(
      r.state.trades.reduce((n, t) => n + (t.netPnlPaise ?? 0), 0),
    );
  });
});
