import { FNO_FACTS, UNDERLYINGS, greeks, optionPrice, strategyLegs } from '@trading/core';
import type { Leg, StrategyId, UnderlyingId } from '@trading/core';

export const RATE = FNO_FACTS.rateBps / 10_000;

export interface LabInputs {
  strategy: StrategyId;
  index: UnderlyingId;
  spot: number;
  volPct: number;
  days: number;
  lots: number;
}

/** The legs for the chosen strategy, priced by the model at the chosen volatility and days (rupees a unit). */
export function labLegs(i: LabInputs): Leg[] {
  const step = UNDERLYINGS[i.index].step;
  const premiumOf = (kind: 'CE' | 'PE', strike: number): number => Math.round(optionPrice(kind, { spot: i.spot, strike, years: i.days / 365, rate: RATE, vol: i.volPct / 100 }) * 20) / 20;
  return strategyLegs(i.strategy, i.spot, step, premiumOf).map((l) => ({ ...l, qty: l.qty * i.lots }));
}

/** Net Greeks of the legs for the whole position: delta in index units, theta a day and vega per volatility point in rupees. */
export function labGreeks(legs: readonly Leg[], i: LabInputs): { delta: number; theta: number; vega: number } {
  const unit = UNDERLYINGS[i.index].lot;
  let delta = 0;
  let theta = 0;
  let vega = 0;
  for (const l of legs) {
    if (l.kind === 'UNDERLYING') {
      delta += l.qty * unit;
      continue;
    }
    const g = greeks(l.kind, { spot: i.spot, strike: l.strike, years: Math.max(i.days, 0) / 365, rate: RATE, vol: i.volPct / 100 });
    delta += l.qty * unit * g.delta;
    theta += l.qty * unit * g.theta;
    vega += l.qty * unit * g.vega;
  }
  return { delta, theta, vega };
}
