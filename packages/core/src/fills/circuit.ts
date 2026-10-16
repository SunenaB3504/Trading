import type { BlockedReason, Side } from '../domain/enums';
import { mulDiv } from '../money';
import type { FillContext } from './types';

function bandBasisPoints(bandPct: number): number {
  return Math.round(bandPct * 100);
}

/** Upper price band: previous close x (1 + band), rounded down to a tick. */
export function upperBandPaise(prevClose: number, bandPct: number, tick: number): number {
  const raw = mulDiv(prevClose, 10_000 + bandBasisPoints(bandPct), 10_000, 'down');
  return Math.floor(raw / tick) * tick;
}

/** Lower price band: previous close x (1 - band), rounded up to a tick. */
export function lowerBandPaise(prevClose: number, bandPct: number, tick: number): number {
  const raw = mulDiv(prevClose, 10_000 - bandBasisPoints(bandPct), 10_000, 'up');
  return Math.ceil(raw / tick) * tick;
}

function bandPrices(ctx: FillContext): { upper: number; lower: number } | null {
  if (ctx.prevClosePaise === null || ctx.bandPct === null) return null;
  return {
    upper: upperBandPaise(ctx.prevClosePaise, ctx.bandPct, ctx.tickPaise),
    lower: lowerBandPaise(ctx.prevClosePaise, ctx.bandPct, ctx.tickPaise),
  };
}

/**
 * FR-T10. Daily bars cannot show whether opposing quantity existed, so the rule is conservative:
 * buys are blocked on an upper-circuit day and sells on a lower-circuit day, and also whenever the
 * session opens at the band price itself. Selling into an upper circuit, or buying into a lower
 * one, is never blocked.
 */
export function circuitBlock(side: Side, ctx: FillContext): BlockedReason | null {
  const bar = ctx.bar;
  if (bar === null) return null;
  const bands = bandPrices(ctx);
  if (side === 'buy') {
    const locked = bar.circuitFlag === 'upper' || (bands !== null && bar.open >= bands.upper);
    return locked ? 'circuit_upper' : null;
  }
  const locked = bar.circuitFlag === 'lower' || (bands !== null && bar.open <= bands.lower);
  return locked ? 'circuit_lower' : null;
}
