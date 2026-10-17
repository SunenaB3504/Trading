import { GENERIC_DISCOUNT_BROKER, computeCosts, nextRegularTradingDay } from '@trading/core';
import type { ReplaySnapshot } from '@trading/core';
import { formatPaise } from '../format/rupees';
import type { LedgerRow } from '../viewModels/ledgerView';

/** Close of the last session on or before `date`, the best estimate of tomorrow's price. */
export function lastCloseOnOrBefore(
  snapshot: ReplaySnapshot,
  instrumentId: string,
  date: string,
): number | null {
  const bars = snapshot.bars[instrumentId] ?? [];
  let close: number | null = null;
  for (const b of bars) if (b.date <= date) close = b.close;
  return close;
}

export interface CostPreview {
  estimatedPricePaise: number;
  rows: LedgerRow[];
  /** Rate profiles that are assumed rather than sourced, shown so the figure is not over-trusted. */
  caveats: string[];
}

/**
 * Estimated charges for a delivery trade at the last close (FR-T7). The real fill is the next open, so
 * this is an estimate; the DP charge applies to the first delivery sell of a day.
 */
export function previewCosts(
  snapshot: ReplaySnapshot,
  args: { instrumentId: string; side: 'buy' | 'sell'; quantity: number; date: string },
): CostPreview | null {
  const price = lastCloseOnOrBefore(snapshot, args.instrumentId, args.date);
  if (price === null || args.quantity < 1) return null;
  const costs = computeCosts(
    {
      date: nextRegularTradingDay(args.date),
      exchange: 'NSE',
      side: args.side,
      product: 'delivery',
      turnoverPaise: price * args.quantity,
      chargeDp: args.side === 'sell',
    },
    GENERIC_DISCOUNT_BROKER,
  );
  return {
    estimatedPricePaise: price,
    rows: [
      { label: 'Estimated price', value: formatPaise(price) },
      { label: 'Turnover', value: formatPaise(price * args.quantity) },
      { label: 'Brokerage', value: formatPaise(costs.brokerage) },
      { label: 'STT', value: formatPaise(costs.stt) },
      { label: 'Exchange and SEBI fees', value: formatPaise(costs.exchange + costs.sebi) },
      { label: 'Stamp duty', value: formatPaise(costs.stampDuty) },
      { label: 'DP charge', value: formatPaise(costs.dp) },
      { label: 'GST', value: formatPaise(costs.gst) },
      { label: 'Total charges', value: formatPaise(costs.total) },
    ],
    caveats: costs.unverified,
  };
}
