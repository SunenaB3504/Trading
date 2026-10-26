import { describe, expect, it } from 'vitest';
import { buildFixtureScenario } from './fixtureScenario';
import { runReplay } from './run';

// MIP v4.1 Stage 3 exit gate: nothing that happens after a fill may change the fill. Cutting off every bar after a
// date must leave every fill on or before that date exactly as it was.
describe('no look-ahead in the replay', () => {
  it.each(['2026-02-27', '2026-03-31', '2026-05-15'])('fills up to %s do not depend on later prices', (cut) => {
    const s = buildFixtureScenario();
    const full = runReplay(s.snapshot, s.orders, s.config);
    const bars = Object.fromEntries(Object.entries(s.snapshot.bars).map(([id, list]) => [id, list.filter((b) => b.date <= cut)]));
    const early = runReplay({ ...s.snapshot, bars }, s.orders, s.config);
    const upTo = (fills: typeof full.fills) => fills.filter((f) => f.tradingDate <= cut);
    expect(upTo(early.fills)).toEqual(upTo(full.fills));
    expect(upTo(full.fills).length).toBeGreaterThan(0);
  });
});
