import { dayNumber, istToUtcMillis } from '../calendar';
import { maxDrawdown, summarizeTrades } from '../analytics';
import type { TradeSummary } from '../analytics';
import { feesPaid } from '../ledger';
import { StrategyRunner } from './runner';
import type { StrategySetup } from './runner';
import { strategyProblems } from './rules';

export interface BacktestResult {
  from: string;
  to: string;
  startPaise: number;
  endPaise: number;
  totalReturnBps: number;
  /** Yearly growth; null when the period is shorter than a month. */
  cagrBps: number | null;
  /** Largest fall from a peak, in basis points (positive). */
  maxDrawdownBps: number;
  /** Mean daily return over its spread, times the square root of 250; null when it cannot be worked out. */
  sharpe: number | null;
  trades: TradeSummary;
  openPositions: number;
  chargesPaise: number;
  orders: number;
  curve: Array<[string, number]>;
  /** The same money in the benchmark instrument from the first day (same charges), if one was given. */
  benchmark: { id: string; endPaise: number; totalReturnBps: number } | null;
  /** Orders the account could not fill, with the reason. */
  notes: number;
}

const bps = (end: number, start: number): number => Math.round(((end - start) * 10_000) / start);

function sharpeOf(curve: ReadonlyArray<[string, number]>): number | null {
  const r: number[] = [];
  for (let i = 1; i < curve.length; i += 1) {
    const prev = (curve[i - 1] as [string, number])[1];
    if (prev > 0) r.push((curve[i] as [string, number])[1] / prev - 1);
  }
  if (r.length < 20) return null;
  const mean = r.reduce((a, b) => a + b, 0) / r.length;
  const sd = Math.sqrt(r.reduce((a, b) => a + (b - mean) ** 2, 0) / (r.length - 1));
  return sd === 0 ? null : (mean / sd) * Math.sqrt(250);
}

function cagrOf(start: number, end: number, from: string, to: string): number | null {
  const days = dayNumber(to) - dayNumber(from);
  if (days < 30 || start <= 0 || end <= 0) return null;
  return Math.round(((end / start) ** (365.25 / days) - 1) * 10_000);
}

/** Facts of a runner that has taken its sessions, in the shape the screens show. */
export function resultOf(r: StrategyRunner, from: string, to: string, benchmark: BacktestResult['benchmark']): BacktestResult {
  const start = r.setup.capitalPaise;
  const last = r.curve[r.curve.length - 1];
  const end = last === undefined ? start : last[1];
  return {
    from,
    to,
    startPaise: start,
    endPaise: end,
    totalReturnBps: bps(end, start),
    cagrBps: cagrOf(start, end, from, to),
    maxDrawdownBps: Math.round(maxDrawdown(r.curve.map((c) => c[1])) * 10_000),
    sharpe: sharpeOf(r.curve),
    trades: summarizeTrades(r.run.state.trades),
    openPositions: r.holdings.size,
    chargesPaise: feesPaid(r.run.state),
    orders: r.orders.length,
    curve: r.curve,
    benchmark,
    notes: r.notes.length,
  };
}

function holdResult(setup: StrategySetup, id: string, from: string, to: string): BacktestResult['benchmark'] {
  const runner = new StrategyRunner({ ...setup, hold: id }, istToUtcMillis(from, '09:00'));
  runner.stepRange(from, to);
  const r = resultOf(runner, from, to, null);
  return { id, endPaise: r.endPaise, totalReturnBps: r.totalReturnBps };
}

export class BacktestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BacktestError';
  }
}

/**
 * Runs the rules over past prices from `from` to `to` on the same engine, charges and risk limits as practice
 * trading. Prices before `from` are used only to look back (the breakout window). Decisions on the last day
 * place orders that never fill, so the last value is the close of that day.
 */
export function backtest(setup: StrategySetup, from: string, to: string, benchmark?: string): BacktestResult {
  const problems = strategyProblems(setup.params);
  if (problems.length > 0) throw new BacktestError(problems.join(' '));
  if (from > to) throw new BacktestError('The start date must not be after the end date.');
  const runner = new StrategyRunner(setup, istToUtcMillis(from, '09:00'));
  runner.stepRange(from, to);
  if (runner.curve.length === 0) throw new BacktestError('There are no prices in that period.');
  const first = (runner.curve[0] as [string, number])[0];
  const last = (runner.curve[runner.curve.length - 1] as [string, number])[0];
  const bench = benchmark === undefined || setup.snapshot.bars[benchmark] === undefined ? null : holdResult(setup, benchmark, first, last);
  return resultOf(runner, first, last, bench);
}
