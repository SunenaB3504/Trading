import type { Trade } from '../domain/ledger';
import type { Rng } from '../random';
import { blockBootstrap, defaultBlockLength } from './bootstrap';
import type { BootstrapOptions, Interval } from './bootstrap';
import { mean } from './stats';
import { holdingSessions, netReturn } from './tradeMetrics';

/** Net view: after all costs. Gross view: before costs, on the cost basis alone (FR-W4). */
export type CostView = 'net' | 'gross';

export interface ViewSummary {
  count: number;
  wins: number;
  losses: number;
  winRate: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  payoffRatio: number | null;
  /** Mean return, which equals win rate x average win - (1 - win rate) x average loss. */
  expectancy: number | null;
  profitFactor: number | null;
  totalPnlPaise: number;
}

export interface GroupRow {
  key: string;
  net: ViewSummary;
  gross: ViewSummary;
  /** Fewer than this many trades say little; the screen shows the count and a warning. */
  thin: boolean;
}

export interface Intervals {
  winRate: Interval;
  expectancy: Interval;
}

export interface WinLossReport {
  net: ViewSummary;
  gross: ViewSummary;
  /** Block-bootstrap intervals per view; null when there are fewer than two trades (FR-W2). */
  intervals: { net: Intervals; gross: Intervals } | null;
  breakdowns: {
    instrument: GroupRow[];
    source: GroupRow[];
    bucket: GroupRow[];
    holding: GroupRow[];
    tag: GroupRow[];
  };
  /** Trades needed before an interval or a group row is worth reading. */
  minTrades: number;
}

export const MIN_TRADES = 30;
export const THIN_GROUP = 5;

type Closed = Trade & { netPnlPaise: number; grossPnlPaise: number; closedOn: string };

const isClosed = (t: Trade): t is Closed =>
  t.closedOn !== null && t.netPnlPaise !== null && t.grossPnlPaise !== null;

function grossReturn(t: Closed): number | null {
  return t.basisPaise > 0 ? t.grossPnlPaise / t.basisPaise : null;
}

const returnsOf = (trades: readonly Closed[], view: CostView): number[] =>
  trades.map((t) => (view === 'net' ? netReturn(t) : grossReturn(t)) ?? 0);

function ratio(a: number, b: number): number | null {
  return b === 0 ? null : a / b;
}

function summarize(trades: readonly Closed[], view: CostView): ViewSummary {
  const rets = returnsOf(trades, view);
  const pnl = trades.map((t) => (view === 'net' ? t.netPnlPaise : t.grossPnlPaise));
  const wins = rets.filter((r) => r > 0);
  const losses = rets.filter((r) => r <= 0);
  const winPnl = pnl.filter((_, i) => (rets[i] as number) > 0).reduce((a, b) => a + b, 0);
  const lossPnl = pnl.filter((_, i) => (rets[i] as number) <= 0).reduce((a, b) => a + b, 0);
  const winRate = rets.length === 0 ? null : wins.length / rets.length;
  const avgWin = wins.length === 0 ? null : mean(wins);
  const avgLoss = losses.length === 0 ? null : mean(losses.map(Math.abs));
  return {
    count: rets.length,
    wins: wins.length,
    losses: losses.length,
    winRate,
    avgWin,
    avgLoss,
    payoffRatio: avgWin === null || avgLoss === null ? null : ratio(avgWin, avgLoss),
    expectancy: rets.length === 0 ? null : mean(rets),
    profitFactor: lossPnl === 0 ? null : ratio(winPnl, Math.abs(lossPnl)),
    totalPnlPaise: pnl.reduce((a, b) => a + b, 0),
  };
}

function groupBy(trades: readonly Closed[], keyOf: (t: Closed) => string[]): GroupRow[] {
  const groups = new Map<string, Closed[]>();
  for (const t of trades) for (const k of keyOf(t)) groups.set(k, [...(groups.get(k) ?? []), t]);
  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, ts]) => ({
      key,
      net: summarize(ts, 'net'),
      gross: summarize(ts, 'gross'),
      thin: ts.length < THIN_GROUP,
    }));
}

/** Holding-period classes in sessions, entry to exit. */
export function holdingClass(sessions: number | null): string {
  if (sessions === null) return 'unknown';
  if (sessions <= 5) return '1 to 5 sessions';
  if (sessions <= 20) return '6 to 20 sessions';
  if (sessions <= 60) return '21 to 60 sessions';
  return 'over 60 sessions';
}

function intervalsFor(
  trades: readonly Closed[],
  view: CostView,
  rng: Rng,
  opts: BootstrapOptions,
): Intervals {
  const ordered = [...trades].sort((a, b) =>
    a.closedOn === b.closedOn ? (a.id < b.id ? -1 : 1) : a.closedOn < b.closedOn ? -1 : 1,
  );
  const rets = returnsOf(ordered, view);
  return {
    winRate: blockBootstrap(
      rets,
      (xs) => xs.filter((x) => x > 0).length / xs.length,
      rng.fork(`${view}-winRate`),
      opts,
    ),
    expectancy: blockBootstrap(rets, mean, rng.fork(`${view}-expectancy`), opts),
  };
}

/**
 * The win/loss report (SSD §11.1, FR-W1 to FR-W4): metrics for closed trades in a net and a gross view,
 * block-bootstrap intervals for win rate and expectancy, and breakdowns by stock, source, bucket,
 * holding period and entry tag. Net numbers equal `summarizeTrades`. Breakdowns by sector and
 * volatility bucket need reference data that the demo book does not have.
 */
export function winLossReport(
  trades: readonly Trade[],
  rng: Rng,
  opts: Partial<BootstrapOptions> = {},
): WinLossReport {
  const closed = trades.filter(isClosed);
  const full: BootstrapOptions = {
    replicates: opts.replicates ?? 2_000,
    blockLength: opts.blockLength ?? defaultBlockLength(closed.length),
    ...(opts.confidence === undefined ? {} : { confidence: opts.confidence }),
  };
  return {
    net: summarize(closed, 'net'),
    gross: summarize(closed, 'gross'),
    intervals:
      closed.length < 2
        ? null
        : {
            net: intervalsFor(closed, 'net', rng, full),
            gross: intervalsFor(closed, 'gross', rng, full),
          },
    breakdowns: {
      instrument: groupBy(closed, (t) => [t.instrumentId]),
      source: groupBy(closed, (t) => [t.source]),
      bucket: groupBy(closed, (t) => [t.bucket ?? 'none']),
      holding: groupBy(closed, (t) => [holdingClass(holdingSessions(t))]),
      tag: groupBy(closed, (t) => (t.tags.length === 0 ? ['untagged'] : t.tags)),
    },
    minTrades: MIN_TRADES,
  };
}
