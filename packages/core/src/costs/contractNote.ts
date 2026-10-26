import type { Fill } from '../domain/trading';
import { computeCosts } from './compute';
import type { CostBreakdown } from './compute';
import { GENERIC_DISCOUNT_BROKER } from './broker';
import type { BrokerProfile } from './broker';

export interface NoteOptions {
  exchange?: 'NSE' | 'BSE';
  broker?: BrokerProfile;
  sttExempt?: boolean;
}

/**
 * The charge lines behind a fill's total, for the contract note. A fill stores only its total, so the lines are
 * recomputed from the same schedule; the day's depository charge is tried on and off, and the answer is accepted only
 * when it adds up to the stored total. Null when nothing matches (so a note is never shown with wrong numbers).
 */
export function contractNote(fill: Fill, opts: NoteOptions = {}): CostBreakdown | null {
  const tries = fill.side === 'sell' ? [false, true] : [false];
  for (const chargeDp of tries) {
    const costs = computeCosts(
      {
        date: fill.tradingDate,
        exchange: opts.exchange ?? 'NSE',
        side: fill.side,
        product: 'delivery',
        turnoverPaise: fill.pricePaise * fill.quantity,
        chargeDp,
        sttExempt: opts.sttExempt === true,
      },
      opts.broker ?? GENERIC_DISCOUNT_BROKER,
    );
    if (costs.total === fill.costsPaise) return costs;
  }
  return null;
}
