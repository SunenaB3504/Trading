import {
  buildFixtureScenario,
  marketSnapshot,
  previousRegularTradingDay,
} from '@trading/core';
import type { LearningMarket, ReplayConfig, ReplaySnapshot } from '@trading/core';

/**
 * The prices a practice book trades on (MIP v4.1 Stage 2, laptop slice): the built-in demo data, or real NSE
 * prices from the data helper. Each profile keeps one book per market, so demo and real orders never mix.
 */
export interface Market {
  id: string;
  kind: 'demo' | 'real';
  label: string;
  snapshot: ReplaySnapshot;
  /** Instrument ids, in the order the picker shows them. */
  instruments: string[];
  /** What to show for an instrument id: its trading symbol. */
  symbols: Readonly<Record<string, string>>;
  /** Last date with prices. */
  lastDate: string;
  /** First date an order may be placed (the cost schedule starts then). */
  firstTradeDate: string;
  config: ReplayConfig;
  /** Where the order form starts: a date whose next session has prices, so a first order fills. */
  defaultDate: string;
}

/** ₹10,00,000 in paise: every practice book starts with it. */
export const PRACTICE_CAPITAL_PAISE = 100_000_000;

let demo: Market | null = null;

/** The core's frozen demo data: three made-up instruments over the first half of 2026. */
export function demoMarket(): Market {
  if (demo !== null) return demo;
  const s = buildFixtureScenario();
  const instruments = Object.keys(s.snapshot.bars).sort();
  const dates = Object.values(s.snapshot.bars).flatMap((b) => b.map((x) => x.date));
  demo = {
    id: s.snapshot.id,
    kind: 'demo',
    label: 'Demo prices',
    snapshot: s.snapshot,
    instruments,
    symbols: Object.fromEntries(instruments.map((i) => [i, i])),
    lastDate: dates.reduce((a, b) => (a > b ? a : b)),
    firstTradeDate: dates.reduce((a, b) => (a < b ? a : b)),
    config: s.config,
    defaultDate: '2026-03-02',
  };
  return demo;
}

const real = new WeakMap<LearningMarket, Market>();

/** A real-price market file as the engine and the screens use it; decoded once per file. */
export function realMarket(file: LearningMarket): Market {
  const known = real.get(file);
  if (known !== undefined) return known;
  const byName = [...file.instruments].sort((a, b) => (a.symbol < b.symbol ? -1 : 1));
  const market: Market = {
    id: file.id,
    kind: 'real',
    label: 'Real NSE prices',
    snapshot: marketSnapshot(file),
    instruments: byName.map((i) => i.id),
    symbols: Object.fromEntries(byName.map((i) => [i.id, i.symbol])),
    lastDate: file.to,
    firstTradeDate: file.tradableFrom,
    config: { capitalPaise: PRACTICE_CAPITAL_PAISE, startAt: 0, endDate: file.to, actions: file.actions },
    defaultDate: previousRegularTradingDay(file.to),
  };
  real.set(file, market);
  return market;
}

/** Where a profile's book for a market is stored; the demo book keeps the key it always had. */
export const requestsKey = (marketId: string, base: string): string =>
  marketId === demoMarket().id ? base : `${base}@${marketId}`;
