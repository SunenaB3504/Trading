import { contractId, parseContract } from './contracts';
import type { Contract } from './contracts';
import { exerciseStt, fnoCosts } from './costs';
import { FNO_FACTS, UNDERLYINGS } from './facts';

/** One open position. `lots` is positive when long and negative when short. */
export interface Position {
  id: string;
  lots: number;
  /** Average entry price in paise per unit. */
  avgPaise: number;
  /** Futures: the price the next day's mark-to-market is measured from. Options: the last value used. */
  markPaise: number;
}

export interface FnoTrade {
  date: string;
  id: string;
  side: 'buy' | 'sell';
  lots: number;
  pricePaise: number;
  costsPaise: number;
  /** Profit or loss before charges on the lots this fill closed; null when it only opened or added. */
  grossPaise: number | null;
  /** `fill`, `expiry` or `margin call`. */
  how: string;
}

export interface FnoState {
  cashPaise: number;
  positions: Position[];
  trades: FnoTrade[];
  costsPaise: number;
  events: string[];
}

export const openBook = (cashPaise: number = FNO_FACTS.capitalPaise): FnoState => ({ cashPaise, positions: [], trades: [], costsPaise: 0, events: [] });

const lotOf = (c: Contract): number => UNDERLYINGS[c.u].lot;
const sign = (n: number): number => (n > 0 ? 1 : n < 0 ? -1 : 0);

function contractOf(id: string): Contract {
  const c = parseContract(id);
  if (c === null) throw new Error(`bad contract id ${id}`);
  return c;
}

export const positionOf = (s: FnoState, id: string): Position | undefined => s.positions.find((p) => p.id === id);

function withPosition(s: FnoState, p: Position): Position[] {
  const rest = s.positions.filter((x) => x.id !== p.id);
  return p.lots === 0 ? rest : [...rest, p].sort((a, b) => (a.id < b.id ? -1 : 1));
}

/** Weighted average entry price of the lots held plus the lots added. */
function blended(old: Position | undefined, lots: number, price: number): number {
  if (old === undefined || old.lots === 0) return price;
  return Math.round((old.avgPaise * Math.abs(old.lots) + price * Math.abs(lots)) / (Math.abs(old.lots) + Math.abs(lots)));
}

/** The average entry price after a fill: blended when adding, unchanged on a partial close, the fill price on a flip. */
function nextAverage(old: Position | undefined, held: number, dir: number, lots: number, price: number): number {
  if (old === undefined || held === 0 || sign(held) === dir) return blended(old, lots, price);
  return sign(held + dir * lots) === sign(held) ? old.avgPaise : price;
}

/**
 * Posts a fill: premium for options, the open-to-fill move for a future already held, then the charges. Lots in the
 * opposite direction first close what is held (and report the profit or loss), the rest opens a new position.
 */
/** Profit or loss before charges on the lots a fill closes; null when it only opens or adds. */
function closedGross(old: Position | undefined, dir: number, lots: number, price: number, unit: number): number | null {
  const held = old?.lots ?? 0;
  if (old === undefined || held === 0 || sign(held) !== -dir) return null;
  return sign(held) * (price - old.avgPaise) * Math.min(lots, Math.abs(held)) * unit;
}

/** Cash moved by a fill before charges: premium for an option, the move since the last mark for a future held. */
function fillCash(c: Contract, old: Position | undefined, dir: number, units: number, price: number): number {
  if (c.kind !== 'FUT') return -dir * units * price;
  return old === undefined ? 0 : old.lots * lotOf(c) * (price - old.markPaise);
}

export function applyFill(s: FnoState, c: Contract, side: 'buy' | 'sell', lots: number, price: number, date: string, how = 'fill'): FnoState {
  const id = contractId(c);
  const units = lots * lotOf(c);
  const dir = side === 'buy' ? 1 : -1;
  const old = positionOf(s, id);
  const held = old?.lots ?? 0;
  const costs = fnoCosts(c.kind, side, price * units, c.u).totalPaise;
  const position: Position = { id, lots: held + dir * lots, avgPaise: nextAverage(old, held, dir, lots, price), markPaise: price };
  const trade: FnoTrade = { date, id, side, lots, pricePaise: price, costsPaise: costs, grossPaise: closedGross(old, dir, lots, price, lotOf(c)), how };
  return { ...s, cashPaise: s.cashPaise + fillCash(c, old, dir, units, price) - costs, positions: withPosition(s, position), trades: [...s.trades, trade], costsPaise: s.costsPaise + costs };
}

/** Moves every held future to today's settlement price, crediting or debiting the day's change in cash. */
export function markFutures(s: FnoState, settle: (c: Contract) => number | null): FnoState {
  let cash = s.cashPaise;
  const positions = s.positions.map((p) => {
    const c = contractOf(p.id);
    const px = c.kind === 'FUT' ? settle(c) : null;
    if (px === null) return p;
    cash += p.lots * lotOf(c) * (px - p.markPaise);
    return { ...p, markPaise: px };
  });
  return { ...s, cashPaise: cash, positions };
}

/** Value of the option positions at the given prices (long positive, short negative); futures carry no value. */
export function optionsValue(s: FnoState, value: (c: Contract) => number | null): number {
  let total = 0;
  for (const p of s.positions) {
    const c = contractOf(p.id);
    if (c.kind === 'FUT') continue;
    total += p.lots * lotOf(c) * (value(c) ?? p.markPaise);
  }
  return total;
}

export const equityOf = (s: FnoState, value: (c: Contract) => number | null): number => s.cashPaise + optionsValue(s, value);

/** Approximate margin blocked: futures and short options only, from the facts file. */
export function marginOf(s: FnoState, spot: (u: Contract['u']) => number | null): number {
  let total = 0;
  for (const p of s.positions) {
    const c = contractOf(p.id);
    const sp = spot(c.u) ?? p.markPaise;
    if (c.kind === 'FUT') total += (Math.abs(p.lots) * lotOf(c) * p.markPaise * UNDERLYINGS[c.u].marginBps) / 10_000;
    else if (p.lots < 0) total += (Math.abs(p.lots) * lotOf(c) * sp * FNO_FACTS.shortOptionMarginBps) / 10_000;
  }
  return Math.round(total);
}

/**
 * Settles every position expiring on `date` at the closing level `spotOf` gives: futures at the closing level, options at
 * their intrinsic value, with STT on the intrinsic value for a long option that is exercised.
 */
export function settleExpiry(s: FnoState, date: string, spotOf: (u: Contract['u']) => number | null): FnoState {
  let state = s;
  for (const p of s.positions) {
    const c = contractOf(p.id);
    const sp = spotOf(c.u);
    if (c.expiry !== date || sp === null) continue;
    state = settleOne(state, p, c, sp, date);
  }
  return state;
}

function settleOne(s: FnoState, p: Position, c: Contract, spot: number, date: string): FnoState {
  const units = Math.abs(p.lots) * lotOf(c);
  const dir = sign(p.lots);
  const final = c.kind === 'FUT' ? spot : Math.max(0, (c.kind === 'CE' ? spot - (c.strike as number) * 100 : (c.strike as number) * 100 - spot));
  let cash = s.cashPaise;
  let costs = 0;
  if (c.kind === 'FUT') cash += p.lots * lotOf(c) * (final - p.markPaise);
  else {
    cash += dir * units * final;
    if (dir > 0 && final > 0) costs = exerciseStt(units * final);
  }
  const trade: FnoTrade = { date, id: p.id, side: dir > 0 ? 'sell' : 'buy', lots: Math.abs(p.lots), pricePaise: Math.round(final), costsPaise: costs, grossPaise: dir * (final - p.avgPaise) * units, how: 'expiry' };
  return { ...s, cashPaise: cash - costs, positions: s.positions.filter((x) => x.id !== p.id), trades: [...s.trades, trade], costsPaise: s.costsPaise + costs };
}
