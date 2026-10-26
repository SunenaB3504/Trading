import {
  GENERIC_DISCOUNT_BROKER,
  SCHEDULE_START,
  computeCosts,
  nextRegularTradingDay,
} from '@trading/core';
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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The next regular session after `date`, or null if the date is not a real day or is outside the calendar. */
function nextSession(date: string): string | null {
  try {
    return nextRegularTradingDay(date);
  } catch {
    return null;
  }
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
  args: { instrumentId: string; side: 'buy' | 'sell'; quantity: number; date: string; sttExempt?: boolean },
): CostPreview | null {
  // The date box is typed into character by character, so a half-typed or impossible date is normal
  // input and must give "no preview", never an error (found in UAT C5: Backspace crashed the screen).
  if (!ISO_DATE.test(args.date)) return null;
  const price = lastCloseOnOrBefore(snapshot, args.instrumentId, args.date);
  const fillDate = nextSession(args.date);
  if (price === null || fillDate === null || args.quantity < 1) return null;
  // Real prices reach back to 2011 but the charges table starts in 2020, so an early date is normal input too:
  // no preview, never an error (found in UAT-6 R5: an early date crashed the Trade screen).
  if (fillDate < SCHEDULE_START) return null;
  let costs: ReturnType<typeof computeCosts>;
  try {
    costs = computeCosts(
      {
        date: fillDate,
        exchange: 'NSE',
        side: args.side,
        product: 'delivery',
        turnoverPaise: price * args.quantity,
        chargeDp: args.side === 'sell',
        sttExempt: args.sttExempt === true,
      },
      GENERIC_DISCOUNT_BROKER,
    );
  } catch {
    return null;
  }
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
