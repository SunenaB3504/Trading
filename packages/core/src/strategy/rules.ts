/**
 * The strategy rules (SSD v4.1 §6.4), as pure functions over prices that are known on the day. Nothing here
 * reads a later bar, so a decision on a day is the same whatever the data holds after it.
 */

export interface StrategyParams {
  /** A close above the highest high of this many earlier sessions is a breakout. */
  lookbackSessions: number;
  /** The breakout day's volume must be at least this multiple (in hundredths: 150 is 1.5 times) of the average. */
  volumeMultipleX100: number;
  /** Sell when the close is this far (basis points) below the entry price. */
  stopBps: number;
  /** Sell when the close is this far below the highest close since entry. */
  trailBps: number;
  /** Sell after this many sessions in the trade. */
  maxHoldSessions: number;
  /** After a sale, no new entry in the same share for this many sessions. */
  cooloffSessions: number;
  /** Size of each position as a share of the account's value, in basis points. */
  positionBps: number;
  /** The most positions held at once (the slots). */
  maxPositions: number;
  /** `limit_prev_close` buys only at or below the close of the decision day. */
  entry: 'market' | 'limit_prev_close';
}

export const DEFAULT_STRATEGY: StrategyParams = {
  lookbackSessions: 20,
  volumeMultipleX100: 150,
  stopBps: 500,
  trailBps: 800,
  maxHoldSessions: 60,
  cooloffSessions: 5,
  positionBps: 1_000,
  maxPositions: 10,
  entry: 'market',
};

interface Range {
  key: keyof StrategyParams;
  label: string;
  min: number;
  max: number;
}

const RANGES: Range[] = [
  { key: 'lookbackSessions', label: 'Breakout days', min: 2, max: 250 },
  { key: 'volumeMultipleX100', label: 'Volume multiple (x100)', min: 100, max: 1_000 },
  { key: 'stopBps', label: 'Stop (basis points)', min: 100, max: 5_000 },
  { key: 'trailBps', label: 'Trailing stop (basis points)', min: 100, max: 5_000 },
  { key: 'maxHoldSessions', label: 'Longest hold (sessions)', min: 1, max: 500 },
  { key: 'cooloffSessions', label: 'Cool-off (sessions)', min: 0, max: 60 },
  { key: 'positionBps', label: 'Position size (basis points)', min: 100, max: 5_000 },
  { key: 'maxPositions', label: 'Slots', min: 1, max: 50 },
];

/** Plain-words problems with a setting; empty when the settings can be run. */
export function strategyProblems(p: StrategyParams): string[] {
  const out: string[] = [];
  for (const r of RANGES) {
    const v = p[r.key];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < r.min || v > r.max)
      out.push(`${r.label} must be a whole number from ${String(r.min)} to ${String(r.max)}.`);
  }
  if (p.positionBps * p.maxPositions > 10_000) out.push('The slots times the position size must not be more than the whole account.');
  return out;
}

export interface DayBar {
  date: string;
  high: number;
  close: number;
  volume: number;
}

/**
 * The breakout test on bar `i`: its close is above the highest high of the `lookbackSessions` bars before it, and
 * its volume is at least the multiple of their average. Returns the volume ratio (for ranking), or null. Uses the
 * bars that exist: a missing day is not invented, so the window is the previous bars in the list.
 */
export function breakoutRatio(bars: readonly DayBar[], i: number, p: StrategyParams): number | null {
  const n = p.lookbackSessions;
  const bar = bars[i];
  if (bar === undefined || i < n) return null;
  let top = 0;
  let volumeSum = 0;
  for (let k = i - n; k < i; k += 1) {
    const b = bars[k] as DayBar;
    if (b.high > top) top = b.high;
    volumeSum += b.volume;
  }
  if (volumeSum <= 0 || bar.close <= top) return null;
  // volume >= multiple x average, kept in whole numbers: volume x n x 100 >= multiple x sum
  if (bar.volume * n * 100 < p.volumeMultipleX100 * volumeSum) return null;
  return (bar.volume * n) / volumeSum;
}

export type ExitReason = 'stop' | 'trailing' | 'time';

export interface HoldingView {
  /** The price paid, on the same (adjusted) scale as the closes. */
  entryRef: number;
  /** The highest close since entry, same scale. */
  highestClose: number;
  /** Sessions since the entry day. */
  sessionsHeld: number;
}

/** Why a position should be sold at the next open, given today's close; null to keep it. The stop wins over the others. */
export function exitReason(h: HoldingView, close: number, p: StrategyParams): ExitReason | null {
  if (close <= (h.entryRef * (10_000 - p.stopBps)) / 10_000) return 'stop';
  if (close <= (h.highestClose * (10_000 - p.trailBps)) / 10_000) return 'trailing';
  if (h.sessionsHeld >= p.maxHoldSessions) return 'time';
  return null;
}

/** True when enough sessions have passed since the last sale of this share for a new entry. */
export function coolOffOver(lastExitIndex: number | undefined, todayIndex: number, p: StrategyParams): boolean {
  return lastExitIndex === undefined || todayIndex - lastExitIndex >= p.cooloffSessions;
}
