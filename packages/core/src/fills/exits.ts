import type { BlockedReason } from '../domain/enums';
import type { BarUnadj } from '../domain/market';
import { mulDiv, subPaise } from '../money';
import { circuitBlock } from './circuit';
import type { FillContext } from './types';

/** Exit levels for a long position. A null level is not set. */
export interface ExitLevels {
  stopPaise: number | null;
  targetPaise: number | null;
}

export type ExitDecision =
  | { action: 'none' }
  | { action: 'exit'; reason: 'stop' | 'target'; pricePaise: number }
  | { action: 'blocked'; reason: BlockedReason };

type Trigger = { kind: 'stop' | 'target'; level: number } | null;

/** Which level the bar reached; the stop wins when both are reached (conservative). */
function triggered(levels: ExitLevels, bar: BarUnadj): Trigger {
  if (levels.stopPaise !== null && bar.low <= levels.stopPaise) {
    return { kind: 'stop', level: levels.stopPaise };
  }
  if (levels.targetPaise !== null && bar.high >= levels.targetPaise) {
    return { kind: 'target', level: levels.targetPaise };
  }
  return null;
}

/** A stop gapped through, or a target gapped over, fills at the open; otherwise at the level. */
function levelPrice(t: NonNullable<Trigger>, bar: BarUnadj): number {
  const gapped = t.kind === 'stop' ? bar.open <= t.level : bar.open >= t.level;
  return gapped ? bar.open : t.level;
}

/**
 * FR-T12 on one daily bar for a long position. A triggered exit is blocked when the session is
 * locked at the lower circuit (FR-T10); the caller then carries it over under D19.
 */
export function evaluateExitBar(levels: ExitLevels, ctx: FillContext): ExitDecision {
  const bar = ctx.bar;
  if (bar === null || ctx.suspended) return { action: 'none' };
  const hit = triggered(levels, bar);
  if (hit === null) return { action: 'none' };
  const locked = circuitBlock('sell', ctx);
  if (locked !== null) return { action: 'blocked', reason: locked };
  return { action: 'exit', reason: hit.kind, pricePaise: levelPrice(hit, bar) };
}

/** Trailing stop: highest close since entry minus k x ATR, with k = numerator / denominator. */
export function trailingStopPaise(
  highestClosePaise: number,
  atrPaise: number,
  k: { numerator: number; denominator: number },
): number {
  return subPaise(highestClosePaise, mulDiv(atrPaise, k.numerator, k.denominator, 'half_up'));
}
