import { ROBO_ACCOUNTS, ROBO_BENCHMARK, ROBO_CAPITAL_PAISE, DEFAULT_STRATEGY, StrategyRunner, addDays, istToUtcMillis, quantityHeld, roboSetup, strategyProblems } from '@trading/core';
import type { RoboDef, RoboId, SavedRun, StrategyParams, StrategySetup } from '@trading/core';
import { getStamped, putStamped } from '../store/kv';
import type { KeyValueStore } from '../store/kv';
import type { Market } from '../trading/market';

/** Saved Robo state: where each account started and the orders it has placed so far. */
export const ROBO_PREFIX = 'robo/';
const SANDBOX_KEY = `${ROBO_PREFIX}sandbox-settings`;

export interface RoboRecord {
  startDate: string;
  saved: SavedRun | null;
}

export interface RoboView {
  def: RoboDef;
  startDate: string;
  lastDate: string;
  sessions: number;
  valuePaise: number;
  returnBps: number;
  /** Return minus the index account's return, in basis points; null for the index account itself. */
  vsIndexBps: number | null;
  holdings: Array<{ symbol: string; quantity: number; since: string }>;
  recent: string[];
  curve: Array<[string, number]>;
}

const isRecord = (r: unknown): r is RoboRecord => {
  const t = r as Partial<RoboRecord> | null;
  return typeof t?.startDate === 'string' && (t.saved === null || (typeof t.saved?.lastDate === 'string' && Array.isArray(t.saved.orders) && Array.isArray(t.saved.curve)));
};

/**
 * Where new accounts start. With real prices the accounts start one year before the latest price date, so there is a
 * history to look at on the first day; later opens add the sessions that came after (the catch-up).
 */
export function defaultStart(market: Market): string {
  const back = addDays(market.lastDate, -365);
  const earliest = market.firstTradeDate;
  return back > earliest ? back : earliest;
}

export async function loadSandbox(kv: KeyValueStore): Promise<StrategyParams> {
  const saved = await getStamped<Partial<StrategyParams>>(kv, SANDBOX_KEY);
  const merged: StrategyParams = { ...DEFAULT_STRATEGY, ...(saved?.value ?? {}) };
  return strategyProblems(merged).length === 0 ? merged : DEFAULT_STRATEGY;
}

/** Saves the Sandbox account's settings and starts that account again, because its old orders followed other rules. */
export async function saveSandbox(kv: KeyValueStore, params: StrategyParams, now: number): Promise<void> {
  await putStamped(kv, SANDBOX_KEY, params, now);
  await kv.delete(`${ROBO_PREFIX}sandbox`);
}

const idOfSymbol = (m: Market, symbol: string): string | undefined => m.instruments.find((i) => m.symbols[i] === symbol);

/** The strategy setup of one Robo account on a market: shares only, the index account holds the Nifty 50 ETF. */
export function setupFor(market: Market, id: RoboId, sandbox: StrategyParams): StrategySetup | null {
  const s = roboSetup(id, sandbox);
  const hold = s.hold === undefined ? undefined : idOfSymbol(market, s.hold);
  if (s.hold !== undefined && hold === undefined) return null;
  return {
    snapshot: market.snapshot,
    actions: market.config.actions,
    // full-history shares only: a start a year back plus indicator warm-up reaches past the rolling window (D44)
    universe: id === 'index' ? [] : market.instruments.filter((i) => market.kinds[i] !== 'etf' && market.rolling[i] !== true),
    params: s.params,
    capitalPaise: ROBO_CAPITAL_PAISE,
    ...(hold === undefined ? {} : { hold }),
    ...(market.config.sttExempt === undefined ? {} : { sttExempt: market.config.sttExempt }),
  };
}

async function load(kv: KeyValueStore, id: RoboId): Promise<RoboRecord | null> {
  const saved = await getStamped<unknown>(kv, `${ROBO_PREFIX}${id}`);
  return isRecord(saved?.value) ? saved.value : null;
}

function viewOf(def: RoboDef, rec: RoboRecord, runner: StrategyRunner, market: Market): RoboView {
  const curve = runner.curve;
  const value = curve[curve.length - 1]?.[1] ?? ROBO_CAPITAL_PAISE;
  const name = (id: string): string => market.symbols[id] ?? id;
  return {
    def,
    startDate: rec.startDate,
    lastDate: runner.lastDate ?? rec.startDate,
    sessions: curve.length,
    valuePaise: value,
    returnBps: Math.round(((value - ROBO_CAPITAL_PAISE) * 10_000) / ROBO_CAPITAL_PAISE),
    vsIndexBps: null,
    holdings: [...runner.holdings].map(([id, h]) => ({ symbol: name(id), quantity: quantityHeld(runner.run.state, id), since: h.entryDate })),
    recent: runner.orders
      .slice(-8)
      .reverse()
      .map((o) => `${o.order.tradingDate}: ${o.order.side} ${String(o.order.quantity)} ${name(o.order.instrumentId)} (${o.order.rationale})`),
    curve,
  };
}

async function catchUpOne(kv: KeyValueStore, market: Market, def: RoboDef, sandbox: StrategyParams, now: number, start: string): Promise<RoboView | null> {
  const setup = setupFor(market, def.id, sandbox);
  if (setup === null) return null;
  const rec = (await load(kv, def.id)) ?? { startDate: start, saved: null };
  const startAt = istToUtcMillis(rec.startDate, '09:00');
  const runner = rec.saved === null ? new StrategyRunner(setup, startAt) : StrategyRunner.resume(setup, startAt, rec.saved);
  runner.stepRange(rec.startDate, market.lastDate);
  const next: RoboRecord = { startDate: rec.startDate, saved: runner.saved() };
  await putStamped(kv, `${ROBO_PREFIX}${def.id}`, next, now);
  return viewOf(def, next, runner, market);
}

/**
 * Brings every Robo account up to the latest price date: the sessions that came since the app was last open are
 * taken one after the other, each deciding from prices up to and including that session only. Running it twice
 * changes nothing the second time. `start` is used only for accounts that do not exist yet.
 */
export async function catchUp(kv: KeyValueStore, market: Market, now: number, start: string = defaultStart(market)): Promise<RoboView[]> {
  const sandbox = await loadSandbox(kv);
  const views: RoboView[] = [];
  for (const def of ROBO_ACCOUNTS) {
    const v = await catchUpOne(kv, market, def, sandbox, now, start);
    if (v !== null) views.push(v);
  }
  const index = views.find((v) => v.def.id === 'index');
  return views.map((v) => (v.def.id === 'index' || index === undefined ? v : { ...v, vsIndexBps: v.returnBps - index.returnBps }));
}

export { ROBO_BENCHMARK };
