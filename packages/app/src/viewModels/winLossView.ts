import { MIN_TRADES } from '@trading/core';
import type { CostView, GroupRow, ViewSummary, WinLossReport } from '@trading/core';
import { formatPaise, formatPercent } from '../format/rupees';
import type { LedgerRow } from './ledgerView';

export interface GroupLine {
  key: string;
  count: string;
  winRate: string;
  expectancy: string;
  pnl: string;
  thin: boolean;
}

export interface BreakdownTable {
  title: string;
  rows: GroupLine[];
}

export interface WinLossView {
  view: CostView;
  headline: LedgerRow[];
  breakdowns: BreakdownTable[];
  warnings: string[];
}

function withInterval(
  estimate: number | null,
  interval: { lo: number; hi: number } | undefined,
): string {
  if (estimate === null) return '–';
  const base = formatPercent(estimate);
  return interval === undefined
    ? base
    : `${base} (95% interval ${formatPercent(interval.lo)} to ${formatPercent(interval.hi)})`;
}

function headlineOf(s: ViewSummary, iv: WinLossReport['intervals'], view: CostView): LedgerRow[] {
  const ivs = iv === null ? undefined : iv[view];
  return [
    { label: 'Closed trades', value: String(s.count) },
    { label: 'Win rate', value: withInterval(s.winRate, ivs?.winRate) },
    { label: 'Average win', value: formatPercent(s.avgWin) },
    { label: 'Average loss', value: formatPercent(s.avgLoss) },
    { label: 'Payoff ratio', value: s.payoffRatio === null ? '–' : s.payoffRatio.toFixed(2) },
    { label: 'Expectancy per trade', value: withInterval(s.expectancy, ivs?.expectancy) },
    { label: 'Profit factor', value: s.profitFactor === null ? '–' : s.profitFactor.toFixed(2) },
    { label: view === 'net' ? 'Net profit' : 'Gross profit', value: formatPaise(s.totalPnlPaise) },
  ];
}

function tableOf(title: string, groups: readonly GroupRow[], view: CostView): BreakdownTable {
  return {
    title,
    rows: groups.map((g) => {
      const s = g[view];
      return {
        key: g.key,
        count: String(s.count),
        winRate: formatPercent(s.winRate),
        expectancy: formatPercent(s.expectancy),
        pnl: formatPaise(s.totalPnlPaise),
        thin: g.thin,
      };
    }),
  };
}

/** The win/loss report as text for one cost view (FR-W1 to FR-W4), with warnings about small samples. */
export function toWinLossView(report: WinLossReport, view: CostView): WinLossView {
  const s = report[view];
  const b = report.breakdowns;
  const warnings: string[] = [];
  if (s.count === 0)
    warnings.push('No closed trades yet. Place and close a trade to see this report.');
  else if (s.count < MIN_TRADES)
    warnings.push(
      `Only ${s.count} closed ${s.count === 1 ? 'trade' : 'trades'}. Intervals this wide, or none, mean a win rate or average from so few trades says little; about ${MIN_TRADES} are needed before reading them.`,
    );
  if (report.intervals === null && s.count > 0)
    warnings.push('At least two closed trades are needed for an interval.');
  warnings.push(
    view === 'gross'
      ? 'Gross view: before brokerage, taxes and other charges.'
      : 'Net view: after all costs.',
  );
  warnings.push('A trade that earns exactly nothing counts as a loss, not a win.');
  return {
    view,
    headline: headlineOf(s, report.intervals, view),
    breakdowns: [
      tableOf('By stock', b.instrument, view),
      tableOf('By source', b.source, view),
      tableOf('By bucket', b.bucket, view),
      tableOf('By holding period', b.holding, view),
      tableOf('By tag at entry', b.tag, view),
    ],
    warnings,
  };
}
