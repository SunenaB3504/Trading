import type { TradingDate } from '../domain/primitives';
import { addPaise, applyRatePpb, mulDiv, sumPaise } from '../money';
import { GENERIC_DISCOUNT_BROKER } from './broker';
import type { BrokerProfile, BrokerageRule } from './broker';
import * as S from './schedule';

export type Product = 'delivery' | 'intraday';

export interface CostInput {
  date: TradingDate;
  exchange: 'NSE' | 'BSE';
  side: 'buy' | 'sell';
  product: Product;
  /** Quantity x price in paise. */
  turnoverPaise: number;
  /** Charge the per-scrip-per-day DP charge on this fill (first delivery sell of the day). */
  chargeDp: boolean;
}

export interface CostBreakdown {
  brokerage: number;
  stt: number;
  exchange: number;
  sebi: number;
  stampDuty: number;
  dp: number;
  gst: number;
  total: number;
  /** Reasons for any rate that is unverified or assumed on this date. Empty means fully sourced. */
  unverified: string[];
  scheduleVersion: string;
}

export class CostError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CostError';
  }
}

function rateAt(table: readonly S.DatedRate[], date: TradingDate, flags: string[]): number {
  const e = S.entryAt(table, date);
  if (e === undefined) throw new CostError(`no rate in force on ${date}`);
  if (e.unverified !== undefined) flags.push(e.unverified);
  return e.ratePpb;
}

function exchangeRate(input: CostInput, flags: string[]): number {
  if (input.exchange === 'BSE') {
    const bse = S.entryAt(S.EXCHANGE_BSE, input.date);
    if (bse !== undefined) return bse.ratePpb;
    flags.push('exchange.bse-pre-2022-12-uses-nse-rate');
  }
  return rateAt(S.EXCHANGE_NSE, input.date, flags);
}

function brokerage(rule: BrokerageRule, turnover: number): number {
  const raw = applyRatePpb(turnover, rule.ratePpb, 'half_up');
  const floored = Math.max(raw, rule.minPaise);
  return rule.capPaise === null ? floored : Math.min(floored, rule.capPaise);
}

function sttRate(input: CostInput, flags: string[]): number {
  if (input.product === 'delivery') return rateAt(S.STT_DELIVERY, input.date, flags);
  return input.side === 'sell' ? rateAt(S.STT_INTRADAY_SELL, input.date, flags) : 0;
}

function stampRate(input: CostInput, flags: string[]): number {
  if (input.side !== 'buy') return 0;
  const table = input.product === 'delivery' ? S.STAMP_DELIVERY_BUY : S.STAMP_INTRADAY_BUY;
  return rateAt(table, input.date, flags);
}

function dpCharge(input: CostInput, broker: BrokerProfile, flags: string[]): number {
  if (!input.chargeDp || input.side !== 'sell' || input.product !== 'delivery') return 0;
  const e = S.entryAt(S.DP_DEPOSITORY, input.date);
  if (e === undefined) throw new CostError(`no DP charge in force on ${input.date}`);
  if (e.unverified !== undefined) flags.push(e.unverified);
  if (broker.assumed) flags.push('dp.broker-addon-assumed');
  return addPaise(e.paise, broker.dpAddOnPaise);
}

/**
 * Computes every charge for one fill, each line rounded half-up to whole paise (the registered
 * rounding rule), GST rounded once on the taxable total. Pure and effective-dated (FR-T4).
 * Throws for dates before the schedule starts or non-positive turnover.
 */
export function computeCosts(
  input: CostInput,
  broker: BrokerProfile = GENERIC_DISCOUNT_BROKER,
): CostBreakdown {
  if (!Number.isSafeInteger(input.turnoverPaise) || input.turnoverPaise <= 0) {
    throw new CostError('turnover must be a positive safe integer of paise');
  }
  if (input.date < S.SCHEDULE_START) throw new CostError(`schedule starts ${S.SCHEDULE_START}`);
  const flags: string[] = broker.assumed ? ['broker.profile-assumed'] : [];
  const t = input.turnoverPaise;
  const rule = input.product === 'delivery' ? broker.delivery : broker.intraday;
  const lines = {
    brokerage: brokerage(rule, t),
    stt: applyRatePpb(t, sttRate(input, flags), 'half_up'),
    exchange: applyRatePpb(t, exchangeRate(input, flags), 'half_up'),
    sebi: applyRatePpb(t, rateAt(S.SEBI_FEE, input.date, flags), 'half_up'),
    stampDuty: applyRatePpb(t, stampRate(input, flags), 'half_up'),
    dp: dpCharge(input, broker, flags),
  };
  const taxable = sumPaise([lines.brokerage, lines.exchange, lines.sebi, lines.dp]);
  const gst = mulDiv(taxable, S.GST_PERCENT, 100, 'half_up');
  const total = sumPaise([...Object.values(lines), gst]);
  return {
    ...lines,
    gst,
    total,
    unverified: [...new Set(flags)].sort(),
    scheduleVersion: S.SCHEDULE_VERSION,
  };
}
