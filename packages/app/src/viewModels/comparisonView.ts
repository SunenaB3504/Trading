import type { LedgerB, TradeComparators } from '@trading/core';
import { formatPercent } from '../format/rupees';

export interface ComparisonLine {
  label: string;
  /** What the owner's book did. */
  own: string;
  /** What the market did over the comparable window. */
  market: string;
}

export interface TradeCard {
  id: string;
  title: string;
  lines: ComparisonLine[];
}

/** Ledger A and Ledger B side by side, per trade and for the portfolio, tied to one snapshot (FR-L3). */
export interface ComparisonView {
  snapshotId: string;
  benchmark: string;
  portfolio: ComparisonLine[];
  trades: TradeCard[];
  notes: string[];
}

const NA = 'n/a';

function path(values: Record<number, number | null> | null, prefix: string): string {
  if (values === null) return NA;
  return Object.entries(values)
    .map(([n, v]) => `${prefix}${n} ${v === null ? NA : formatPercent(v)}`)
    .join(', ');
}

function cardOf(t: TradeComparators): TradeCard {
  const state =
    t.status === 'closed' ? `${t.entryDate} to ${t.exitDate}` : `since ${t.entryDate}, open`;
  const lines: ComparisonLine[] = [
    {
      label:
        t.status === 'closed'
          ? 'Net return on cost'
          : 'Price move so far (before charges and dividends)',
      own: formatPercent(t.ownReturn),
      market: `staying in: ${path(t.holdOn, '+')} sessions`,
    },
    {
      label: 'Index over the same windows',
      own: '',
      market: t.index === null ? 'no benchmark loaded' : path(t.index, '+'),
    },
  ];
  if (t.excursions !== null)
    lines.push({
      label: 'Best and worst during the hold',
      own: `entry timing ${formatPercent(t.excursions.entryEfficiency)}, exit timing ${formatPercent(t.excursions.exitEfficiency)}`,
      market: `best +${formatPercent(t.excursions.mfe).replace('-', '')}, worst -${formatPercent(t.excursions.mae).replace('-', '')}`,
    });
  if (t.postExit !== null)
    lines.push({ label: 'After the exit', own: '', market: path(t.postExit, '+') });
  return { id: t.tradeId, title: `${t.instrumentId}, ${t.quantity} shares, ${state}`, lines };
}

export function toComparisonView(b: LedgerB): ComparisonView {
  const p = b.portfolio;
  return {
    snapshotId: b.snapshotId,
    benchmark: b.benchmark ?? 'none loaded',
    portfolio:
      p === null
        ? []
        : [
            {
              label: `Return from ${p.from} to ${p.to}`,
              own: formatPercent(p.ownReturn),
              market: `equal-weight buy and hold ${formatPercent(p.equalWeight)}; cash ${formatPercent(p.cash)}`,
            },
          ],
    trades: b.trades.map(cardOf),
    notes: [
      'Market figures use prices adjusted for splits and bonuses, so they are comparable with your trades.',
      'Skipped rule signals (C5) apply only to rule arms, not to a manual book.',
    ],
  };
}
