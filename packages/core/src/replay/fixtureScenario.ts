import { istToUtcMillis, sessionOn, tradingDaysBetween } from '../calendar';
import type { BarUnadj, CorporateAction } from '../domain/market';
import type { Order } from '../domain/trading';
import { lowerBandPaise } from '../fills';
import type { Intent } from '../fills';
import type { Rng } from '../random';
import { createRng } from '../random';
import type { ReplayConfig, ReplayOrder, ReplaySnapshot } from './types';

/**
 * A synthetic, fully deterministic six-month scenario used as the replay golden fixture: three
 * instruments with a random-walk price path from a fixed seed, a 5-for-1 split, a dividend, a
 * lower-circuit day, and twelve human orders that exercise sizing, carry-over and rejections.
 * Changing anything here changes the golden hash, which must then be re-logged as a decision.
 */
const FROM = '2026-01-01';
const TO = '2026-06-30';
const CAPITAL = 100_000_000;

const round5 = (x: number): number => Math.max(5, Math.round(x / 5) * 5);

function walk(id: string, base: number, dates: readonly string[], rng: Rng): BarUnadj[] {
  let prev = base;
  return dates.map((date) => {
    const open = round5(prev * (1 + (rng.nextFloat() - 0.5) * 0.02));
    const close = round5(prev * (1 + (rng.nextFloat() - 0.5) * 0.04));
    const spread = round5(prev * 0.004 * rng.nextFloat());
    prev = close;
    return {
      instrumentId: id,
      date,
      open,
      high: Math.max(open, close) + spread,
      low: Math.max(5, Math.min(open, close) - spread),
      close,
      volume: 100_000,
      provider: 'fixture',
      snapshotId: 'fixture-v1',
      disputed: false,
      circuitFlag: 'none' as const,
    };
  });
}

/** Multiplies every price before `exDate` so the series is consistent with a split on that date. */
function preSplit(bars: BarUnadj[], exDate: string, factor: number): BarUnadj[] {
  return bars.map((b) =>
    b.date >= exDate
      ? b
      : {
          ...b,
          open: b.open * factor,
          high: b.high * factor,
          low: b.low * factor,
          close: b.close * factor,
        },
  );
}

function lowerCircuit(bars: BarUnadj[], date: string): BarUnadj[] {
  return bars.map((b, i) => {
    if (b.date !== date) return b;
    const price = lowerBandPaise(bars[i - 1]?.close ?? b.open, 5, 5);
    return {
      ...b,
      open: price,
      high: price,
      low: price,
      close: price,
      circuitFlag: 'lower' as const,
    };
  });
}

function snapshot(): ReplaySnapshot {
  const dates = tradingDaysBetween(FROM, TO).filter((d) => sessionOn(d).kind === 'regular');
  const root = createRng('replay-fixture-v1');
  return {
    id: 'fixture-v1',
    bars: {
      AAA: walk('AAA', 100_000, dates, root.fork('AAA')),
      BBB: preSplit(walk('BBB', 50_000, dates, root.fork('BBB')), '2026-03-16', 5),
      CCC: lowerCircuit(walk('CCC', 20_000, dates, root.fork('CCC')), '2026-04-08'),
    },
    bandPct: { AAA: 20, BBB: 20, CCC: 5 },
    tickPaise: 5,
  };
}

const action = (id: string, over: Partial<CorporateAction>): CorporateAction => ({
  id,
  instrumentId: 'AAA',
  type: 'dividend',
  exDate: '2026-05-11',
  ratio: null,
  dividendPaisePerShare: 500,
  source: 'fixture',
  effectiveAt: istToUtcMillis('2026-05-11', '09:00'),
  ...over,
});

function order(
  id: string,
  instrumentId: string,
  side: 'buy' | 'sell',
  quantity: number,
  placed: [string, string],
  intent: Intent,
  stopPaise: number | null,
  extra: Partial<Order> = {},
): ReplayOrder {
  return {
    intent,
    stopPaise,
    meta: { source: 'human', bucket: 'steady', tags: ['fixture'] },
    order: {
      id,
      decisionId: `d-${id}`,
      instrumentId,
      side,
      type: 'market',
      quantity,
      limitPaise: null,
      validity: 'day',
      placedAt: istToUtcMillis(placed[0], placed[1]),
      tradingDate: placed[0],
      status: 'open',
      source: 'human',
      rationale: 'fixture',
      fillRuleId: 'next-open@1',
      blockedReason: null,
      ...extra,
    },
  };
}

export function buildFixtureScenario(): {
  snapshot: ReplaySnapshot;
  orders: ReplayOrder[];
  config: ReplayConfig;
} {
  const at = (d: string): [string, string] => [d, '16:00'];
  const orders = [
    order('o01', 'AAA', 'buy', 80, at('2026-01-12'), 'entry', 95_000),
    order('o02', 'BBB', 'buy', 30, at('2026-01-20'), 'entry', 200_000),
    order('o03', 'CCC', 'buy', 400, at('2026-02-03'), 'entry', 18_000),
    order('o04', 'AAA', 'buy', 500, at('2026-02-10'), 'entry', 90_000),
    order('o05', 'BBB', 'sell', 60, at('2026-03-20'), 'exit', null),
    order('o06', 'CCC', 'sell', 200, at('2026-04-07'), 'exit', null),
    order('o07', 'AAA', 'sell', 100, at('2026-04-20'), 'exit', null, {
      type: 'limit',
      limitPaise: 140_000,
    }),
    order('o08', 'AAA', 'sell', 50, at('2026-05-04'), 'exit', null),
    order('o09', 'BBB', 'buy', 20, at('2026-05-18'), 'entry', 40_000),
    order('o10', 'BBB', 'sell', 90, at('2026-06-01'), 'exit', null),
    order('o11', 'CCC', 'sell', 9_999, at('2026-06-10'), 'exit', null),
    order('o12', 'AAA', 'buy', 10, ['2026-06-15', '14:00'], 'entry', 90_000, {
      fillRuleId: 'moc@1',
    }),
  ];
  const actions = [
    action('a-split', {
      instrumentId: 'BBB',
      type: 'split',
      exDate: '2026-03-16',
      ratio: { numerator: 5, denominator: 1 },
      dividendPaisePerShare: null,
      effectiveAt: istToUtcMillis('2026-03-16', '09:00'),
    }),
    action('a-div', {}),
  ];
  return {
    snapshot: snapshot(),
    orders,
    config: { capitalPaise: CAPITAL, startAt: 0, endDate: TO, actions },
  };
}
