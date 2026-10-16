import { istToUtcMillis } from '../calendar';
import type { BarUnadj } from '../domain/market';
import type { Order } from '../domain/trading';
import type { ContextProvider, FillContext, FillOptions, FillResult, Intent } from './index';
// Calendar used below (2026): Fri 10-16 trades, Sat/Sun closed, Mon 10-19 trades, Tue 10-20 is
// Dussehra (holiday), Wed 10-21, Thu 10-22 and Fri 10-23 trade.
export const MON = '2026-10-19';
export const WED = '2026-10-21';
export const THU = '2026-10-22';
export const FRI = '2026-10-23';

type Flag = 'none' | 'upper' | 'lower';
export const bar = (
  open: number,
  high: number,
  low: number,
  close: number,
  flag: Flag = 'none',
): BarUnadj => ({
  instrumentId: 'i1',
  date: MON,
  open,
  high,
  low,
  close,
  volume: 1_000,
  provider: 'test',
  snapshotId: 's',
  disputed: false,
  circuitFlag: flag,
});

export function ctx(b: BarUnadj | null, over: Partial<FillContext> = {}): FillContext {
  return {
    bar: b,
    prevClosePaise: 10_000,
    bandPct: null,
    suspended: false,
    eligible: true,
    tickPaise: 5,
    ...over,
  };
}

export function market(days: Record<string, FillContext>): ContextProvider {
  return (_id, date) => days[date] ?? ctx(null);
}

export interface OrderSpec {
  side?: 'buy' | 'sell';
  type?: 'market' | 'limit';
  limit?: number;
  placed?: [string, string]; // IST date and HH:MM
  rule?: string;
  source?: string;
}

export function order(spec: OrderSpec = {}): Order {
  const [date, hhmm] = spec.placed ?? ['2026-10-16', '15:45'];
  const type = spec.type ?? 'market';
  return {
    id: 'o1',
    decisionId: 'd1',
    instrumentId: 'i1',
    side: spec.side ?? 'buy',
    type,
    quantity: 10,
    limitPaise: type === 'limit' ? (spec.limit ?? 10_000) : null,
    validity: 'day',
    placedAt: istToUtcMillis(date, hhmm),
    tradingDate: date,
    status: 'open',
    source: spec.source ?? 'human',
    rationale: '',
    fillRuleId: spec.rule ?? 'next-open@1',
    blockedReason: null,
  };
}

export interface Case {
  name: string;
  order?: OrderSpec;
  intent?: Intent;
  days: Record<string, FillContext>;
  opts?: Partial<FillOptions>;
  expect: {
    status: FillResult['status'];
    price?: number;
    date?: string;
    reason?: string | null;
    blocked?: number;
  };
}

export const NORMAL = bar(10_000, 10_100, 9_900, 10_050);
const band5 = { bandPct: 5 };

export const cases: Case[] = [
  // ---- market orders, next-open rule
  {
    name: 'buy fills at the next open',
    days: { [MON]: ctx(NORMAL) },
    expect: { status: 'filled', price: 10_000, date: MON },
  },
  {
    name: 'sell fills at the next open',
    order: { side: 'sell' },
    days: { [MON]: ctx(NORMAL) },
    expect: { status: 'filled', price: 10_000, date: MON },
  },
  {
    name: "placed before the open fills at that day's open",
    order: { placed: [MON, '08:30'] },
    days: { [MON]: ctx(NORMAL) },
    expect: { status: 'filled', date: MON },
  },
  {
    name: 'placed in session skips the holiday to Wednesday',
    order: { placed: [MON, '11:00'] },
    days: { [WED]: ctx(NORMAL) },
    expect: { status: 'filled', date: WED },
  },
  {
    name: 'placed on Saturday fills Monday',
    order: { placed: ['2026-10-17', '12:00'] },
    days: { [MON]: ctx(NORMAL) },
    expect: { status: 'filled', date: MON },
  },
  {
    name: 'placed after Monday close skips the Tuesday holiday',
    order: { placed: [MON, '16:00'] },
    days: { [WED]: ctx(NORMAL) },
    expect: { status: 'filled', date: WED },
  },
  {
    name: 'missing bar on the execution date is rejected',
    days: {},
    expect: { status: 'rejected', reason: 'non_trading_day' },
  },
  {
    name: 'suspended instrument is rejected',
    days: { [MON]: ctx(NORMAL, { suspended: true }) },
    expect: { status: 'rejected', reason: 'halted' },
  },
  {
    name: 'ineligible instrument is rejected',
    days: { [MON]: ctx(NORMAL, { eligible: false }) },
    expect: { status: 'rejected', reason: 'ineligible' },
  },
  {
    name: 'price outside the day range is rejected',
    days: { [MON]: ctx(bar(12_000, 10_100, 9_900, 10_000)) },
    expect: { status: 'rejected', reason: 'outside_day_range' },
  },
  // ---- circuit locks (FR-T10, D19)
  {
    name: 'buy at the upper band open is blocked and the entry expires',
    days: { [MON]: ctx(bar(10_500, 10_500, 10_500, 10_500), band5) },
    expect: { status: 'expired', reason: 'circuit_upper' },
  },
  {
    name: 'buy one tick below the upper band fills',
    days: { [MON]: ctx(bar(10_495, 10_495, 10_400, 10_450), band5) },
    expect: { status: 'filled', price: 10_495 },
  },
  {
    name: 'buy on an upper-circuit day (flag) is blocked',
    days: { [MON]: ctx(bar(10_300, 10_500, 10_300, 10_500, 'upper'), band5) },
    expect: { status: 'expired', reason: 'circuit_upper' },
  },
  {
    name: 'sell into an upper-circuit day fills',
    order: { side: 'sell' },
    days: { [MON]: ctx(bar(10_300, 10_500, 10_300, 10_500, 'upper')) },
    expect: { status: 'filled', price: 10_300 },
  },
  {
    name: 'buy on a lower-circuit day fills',
    days: { [MON]: ctx(bar(9_700, 9_700, 9_500, 9_500, 'lower')) },
    expect: { status: 'filled', price: 9_700 },
  },
  {
    name: 'sell on a lower-circuit day is blocked (flag)',
    order: { side: 'sell' },
    intent: 'entry',
    days: { [MON]: ctx(bar(9_800, 9_800, 9_500, 9_500, 'lower')) },
    expect: { status: 'expired', reason: 'circuit_lower' },
  },
  {
    name: 'exit blocked at the lower band carries over one session (Tuesday is a holiday)',
    order: { side: 'sell' },
    intent: 'exit',
    days: { [MON]: ctx(bar(9_500, 9_500, 9_500, 9_500), band5), [WED]: ctx(NORMAL) },
    expect: { status: 'filled', price: 10_000, date: WED, blocked: 1 },
  },
  {
    name: 'exit blocked three sessions then fills',
    order: { side: 'sell' },
    intent: 'exit',
    days: {
      [MON]: ctx(bar(9_500, 9_500, 9_500, 9_500), band5),
      [WED]: ctx(bar(9_500, 9_500, 9_500, 9_500), band5),
      [THU]: ctx(bar(9_500, 9_500, 9_500, 9_500), band5),
      [FRI]: ctx(NORMAL),
    },
    expect: { status: 'filled', date: FRI, blocked: 3 },
  },
  {
    name: 'exit still blocked after the carry limit expires',
    order: { side: 'sell' },
    intent: 'exit',
    opts: { maxCarrySessions: 2 },
    days: {
      [MON]: ctx(bar(9_500, 9_500, 9_500, 9_500), band5),
      [WED]: ctx(bar(9_500, 9_500, 9_500, 9_500), band5),
      [THU]: ctx(bar(9_500, 9_500, 9_500, 9_500), band5),
    },
    expect: { status: 'expired', reason: 'circuit_lower', blocked: 2 },
  },
  {
    name: 'without band data and no flag the order fills',
    days: { [MON]: ctx(NORMAL, { bandPct: null, prevClosePaise: null }) },
    expect: { status: 'filled', price: 10_000 },
  },
  // ---- limit buys (FR-T11), limit 10,000, tick 5
  {
    name: 'limit buy fills at a gap-down open',
    order: { type: 'limit' },
    days: { [MON]: ctx(bar(9_900, 10_050, 9_800, 10_000)) },
    expect: { status: 'filled', price: 9_900 },
  },
  {
    name: 'limit buy traded through fills at the limit',
    order: { type: 'limit' },
    days: { [MON]: ctx(bar(10_100, 10_150, 9_995, 10_050)) },
    expect: { status: 'filled', price: 10_000 },
  },
  {
    name: 'limit buy only touched does not fill (trade-through)',
    order: { type: 'limit' },
    days: { [MON]: ctx(bar(10_100, 10_150, 10_000, 10_050)) },
    expect: { status: 'expired', reason: 'limit_not_reached' },
  },
  {
    name: 'limit buy only touched fills under the touch rule',
    order: { type: 'limit' },
    opts: { limitRule: 'touch' },
    days: { [MON]: ctx(bar(10_100, 10_150, 10_000, 10_050)) },
    expect: { status: 'filled', price: 10_000 },
  },
  {
    name: 'limit buy never reached expires',
    order: { type: 'limit' },
    days: { [MON]: ctx(bar(10_100, 10_150, 10_050, 10_100)) },
    expect: { status: 'expired', reason: 'limit_not_reached' },
  },
  {
    name: 'limit buy opening exactly at the limit with no trade-through does not fill',
    order: { type: 'limit' },
    days: { [MON]: ctx(bar(10_000, 10_100, 10_000, 10_050)) },
    expect: { status: 'expired' },
  },
  {
    name: 'limit buy opening at the limit fills at the open under the touch rule',
    order: { type: 'limit' },
    opts: { limitRule: 'touch' },
    days: { [MON]: ctx(bar(10_000, 10_100, 10_000, 10_050)) },
    expect: { status: 'filled', price: 10_000 },
  },
  {
    name: 'limit buy on an upper-circuit day is blocked even if the low reaches the limit',
    order: { type: 'limit' },
    days: { [MON]: ctx(bar(10_300, 10_500, 9_990, 10_500, 'upper')) },
    expect: { status: 'expired', reason: 'circuit_upper' },
  },
  // ---- limit sells
  {
    name: 'limit sell fills at a gap-up open',
    order: { side: 'sell', type: 'limit' },
    days: { [MON]: ctx(bar(10_100, 10_200, 10_000, 10_150)) },
    expect: { status: 'filled', price: 10_100 },
  },
  {
    name: 'limit sell traded through fills at the limit',
    order: { side: 'sell', type: 'limit' },
    days: { [MON]: ctx(bar(9_900, 10_005, 9_850, 9_950)) },
    expect: { status: 'filled', price: 10_000 },
  },
  {
    name: 'limit sell only touched does not fill',
    order: { side: 'sell', type: 'limit' },
    days: { [MON]: ctx(bar(9_900, 10_000, 9_850, 9_950)) },
    expect: { status: 'expired', reason: 'limit_not_reached' },
  },
  {
    name: 'limit sell only touched fills under the touch rule',
    order: { side: 'sell', type: 'limit' },
    opts: { limitRule: 'touch' },
    days: { [MON]: ctx(bar(9_900, 10_000, 9_850, 9_950)) },
    expect: { status: 'filled', price: 10_000 },
  },
  {
    name: 'limit sell never reached expires',
    order: { side: 'sell', type: 'limit' },
    days: { [MON]: ctx(bar(9_900, 9_950, 9_850, 9_900)) },
    expect: { status: 'expired' },
  },
  {
    name: 'limit exit blocked by a lower lock fills next session when reached',
    order: { side: 'sell', type: 'limit' },
    intent: 'exit',
    days: {
      [MON]: ctx(bar(9_800, 9_800, 9_500, 9_500, 'lower')),
      [WED]: ctx(bar(10_100, 10_200, 10_000, 10_150)),
    },
    expect: { status: 'filled', price: 10_100, date: WED, blocked: 1 },
  },
  // ---- market on close (human only)
  {
    name: 'MOC buy fills at the close',
    order: { rule: 'moc@1', placed: [MON, '14:00'] },
    days: { [MON]: ctx(NORMAL) },
    expect: { status: 'filled', price: 10_050, date: MON },
  },
  {
    name: 'MOC placed after the close is rejected',
    order: { rule: 'moc@1', placed: [MON, '16:00'] },
    days: { [MON]: ctx(NORMAL) },
    expect: { status: 'rejected', reason: 'expired' },
  },
  {
    name: 'MOC on a holiday is rejected',
    order: { rule: 'moc@1', placed: ['2026-10-20', '10:00'] },
    days: {},
    expect: { status: 'rejected', reason: 'non_trading_day' },
  },
  {
    name: 'MOC exit blocked by a lower lock carries to the next open',
    order: { rule: 'moc@1', side: 'sell', placed: [MON, '14:00'] },
    intent: 'exit',
    days: { [MON]: ctx(bar(9_800, 9_800, 9_500, 9_500, 'lower')), [WED]: ctx(NORMAL) },
    expect: { status: 'filled', price: 10_000, date: WED, blocked: 1 },
  },
];
