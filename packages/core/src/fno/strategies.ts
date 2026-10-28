import { intrinsic, price } from './model';

/**
 * Options Lab (SSD v4.1 §5.6): payoff of a set of legs at expiry and today, breakevens, and the most that can be made
 * or lost. Prices are in rupees per unit and strikes in index points, as an exchange screen shows them.
 */
export interface Leg {
  kind: 'CE' | 'PE' | 'UNDERLYING';
  /** Strike for an option; the price paid for the underlying. */
  strike: number;
  /** Premium paid (buyer) or received (seller) per unit; 0 for the underlying. */
  premium: number;
  /** Lots, positive when bought and negative when sold. */
  qty: number;
}

export type StrategyId = 'long_call' | 'long_put' | 'bull_call_spread' | 'bear_put_spread' | 'long_straddle' | 'short_straddle' | 'long_strangle' | 'short_strangle' | 'iron_condor' | 'covered_call';

export const STRATEGIES: ReadonlyArray<{ id: StrategyId; name: string; view: string }> = [
  { id: 'long_call', name: 'Long call', view: 'You expect a rise, and want the loss limited to the premium.' },
  { id: 'long_put', name: 'Long put', view: 'You expect a fall, or want protection, with the loss limited to the premium.' },
  { id: 'bull_call_spread', name: 'Bull call spread', view: 'A modest rise: buy a call and sell a higher one to cut the cost.' },
  { id: 'bear_put_spread', name: 'Bear put spread', view: 'A modest fall: buy a put and sell a lower one to cut the cost.' },
  { id: 'long_straddle', name: 'Long straddle', view: 'A big move either way, direction unknown. You pay two premiums.' },
  { id: 'short_straddle', name: 'Short straddle', view: 'Little movement. You collect two premiums and the loss is unlimited.' },
  { id: 'long_strangle', name: 'Long strangle', view: 'A big move either way, cheaper than a straddle but it needs a bigger move.' },
  { id: 'short_strangle', name: 'Short strangle', view: 'Little movement, with a wider safe zone than a short straddle. The loss is unlimited.' },
  { id: 'iron_condor', name: 'Iron condor', view: 'Little movement, with the loss limited by bought wings.' },
  { id: 'covered_call', name: 'Covered call', view: 'You hold the index and sell a call for income, giving up gains above the strike.' },
];

type PremiumOf = (kind: 'CE' | 'PE', strike: number) => number;

/** [kind, strikes from the at-the-money strike, lots] for each leg of a ready-made strategy. */
const RECIPES: Record<Exclude<StrategyId, 'covered_call'>, ReadonlyArray<['CE' | 'PE', number, number]>> = {
  long_call: [['CE', 0, 1]],
  long_put: [['PE', 0, 1]],
  bull_call_spread: [['CE', 0, 1], ['CE', 2, -1]],
  bear_put_spread: [['PE', 0, 1], ['PE', -2, -1]],
  long_straddle: [['CE', 0, 1], ['PE', 0, 1]],
  short_straddle: [['CE', 0, -1], ['PE', 0, -1]],
  long_strangle: [['CE', 2, 1], ['PE', -2, 1]],
  short_strangle: [['CE', 2, -1], ['PE', -2, -1]],
  iron_condor: [['PE', -4, 1], ['PE', -2, -1], ['CE', 2, -1], ['CE', 4, 1]],
};

/** The legs of a ready-made strategy around the at-the-money strike, one lot each, with premiums from `premiumOf`. */
export function strategyLegs(id: StrategyId, spot: number, step: number, premiumOf: PremiumOf): Leg[] {
  const atm = Math.round(spot / step) * step;
  const leg = (kind: 'CE' | 'PE', offset: number, qty: number): Leg => ({ kind, strike: atm + offset * step, premium: premiumOf(kind, atm + offset * step), qty });
  if (id === 'covered_call') return [{ kind: 'UNDERLYING', strike: spot, premium: 0, qty: 1 }, leg('CE', 2, -1)];
  return RECIPES[id].map(([k, o, q]) => leg(k, o, q));
}

/** Profit or loss per unit of one leg at an index level on expiry. */
export function legPayoff(l: Leg, at: number): number {
  if (l.kind === 'UNDERLYING') return l.qty * (at - l.strike);
  return l.qty * (intrinsic(l.kind, at, l.strike) - l.premium);
}

export const payoffAtExpiry = (legs: readonly Leg[], at: number, lot: number): number => lot * legs.reduce((a, l) => a + legPayoff(l, at), 0);

export interface TodayInputs {
  /** Calendar days left to expiry. */
  days: number;
  /** Yearly volatility as a fraction. */
  vol: number;
  rate: number;
}

/** Profit or loss now, if the index were at `at` with `days` left, valuing options with the model. */
export function payoffToday(legs: readonly Leg[], at: number, lot: number, t: TodayInputs): number {
  const v = (l: Leg): number => (l.kind === 'UNDERLYING' ? at - l.strike : price(l.kind, { spot: at, strike: l.strike, years: t.days / 365, rate: t.rate, vol: t.vol }) - l.premium);
  return lot * legs.reduce((a, l) => a + l.qty * v(l), 0);
}

export interface Analysis {
  /** Index levels where the result is zero at expiry. */
  breakevens: number[];
  /** Most that can be made, in rupees; null when unlimited. */
  maxProfit: number | null;
  /** Most that can be lost, as a positive amount; null when unlimited. */
  maxLoss: number | null;
  /** Cost to open: premiums paid less premiums received, in rupees (negative when you receive money). */
  netDebit: number;
}

/** Index levels where a piecewise-linear result crosses zero, between grid points that include every kink. */
function zeroCrossings(grid: readonly number[], pnl: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < grid.length; i += 1) {
    const a = pnl[i - 1] as number;
    const b = pnl[i] as number;
    const x0 = grid[i - 1] as number;
    if ((a < 0 && b > 0) || (a > 0 && b < 0)) out.push(x0 + ((grid[i] as number) - x0) * (a / (a - b)));
    else if (b === 0 && a !== 0) out.push(grid[i] as number);
  }
  return out;
}

/** Breakevens and the most made or lost at expiry for the legs, one lot being `lot` units. */
export function analyse(legs: readonly Leg[], lot: number, spot: number): Analysis {
  const strikes = legs.filter((l) => l.kind !== 'UNDERLYING').map((l) => l.strike);
  const top = spot * 3;
  const step = spot / 1_000;
  const grid = [...new Set([0, top, ...strikes, ...Array.from({ length: 3_001 }, (_, i) => i * step)])].sort((a, b) => a - b);
  const pnl = grid.map((x) => payoffAtExpiry(legs, x, lot));
  const breakevens = zeroCrossings(grid, pnl);
  const slopeUp = legs.reduce((a, l) => a + (l.kind === 'CE' || l.kind === 'UNDERLYING' ? l.qty : 0), 0);
  const best = Math.max(...pnl);
  const worst = Math.min(...pnl);
  return {
    breakevens: [...new Set(breakevens.map((x) => Math.round(x * 100) / 100))],
    maxProfit: slopeUp > 0 ? null : Math.max(0, best),
    maxLoss: slopeUp < 0 ? null : Math.max(0, -worst),
    netDebit: lot * legs.reduce((a, l) => a + l.qty * l.premium, 0),
  };
}
