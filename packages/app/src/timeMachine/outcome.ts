import { scenarioById } from '@trading/content';
import type { Scenario } from '@trading/content';
import type { FundsMarket } from '@trading/core';
import { exitPlanIds, loadJournal } from '../journal/journalStore';
import { loadProfileSettings } from '../settings/settings';
import type { KeyValueStore } from '../store/kv';
import { FUND_CAPITAL_PAISE, FundSession } from '../trading/fundSession';
import { PaperSession } from '../trading/paperSession';
import type { Market } from '../trading/market';
import { fundBenchmark, fundFollowed, shareBenchmark, shareFollowed } from './benchmark';
import { bpsText, evaluateGoal, returnBps } from './goals';
import type { GoalResult } from './goals';
import { scopeOf } from './sessions';
import type { TmSession } from './sessions';
import { sessionDates } from './stepping';
import { fundsAsOf, marketAsOf } from './truncate';

/** The share market as the session sees it today, or null for a funds-only session. */
export function sessionMarket(s: TmSession, real: Market): Market | null {
  if (s.pot === 'funds') return null;
  return marketAsOf(real, { id: `tm-${s.id}`, date: s.current, symbols: s.allowed, capitalPaise: s.capitalPaise });
}

/** The fund NAVs as the session sees them today, or null for a shares-only session. */
export function sessionFunds(s: TmSession, funds: FundsMarket): FundsMarket | null {
  return s.pot === 'shares' ? null : fundsAsOf(funds, s.current, s.pot === 'funds' ? s.allowed : null);
}

export interface Outcome {
  scenario: Scenario | null;
  /** Value of the share account and of the fund account now (null when the session has none). */
  sharesPaise: number | null;
  fundsPaise: number | null;
  /** The account the goal is about. */
  mainPaise: number;
  benchmarkPaise: number;
  benchmarkLabel: string;
  mainBps: number;
  benchmarkBps: number;
  flagged: string[];
  buyMonths: number;
  goal: GoalResult | null;
}

/** The value of the account the goal is about, or the starting cash when that account has no value yet. */
const mainValue = (s: TmSession, shares: number | null, funds: number | null, capital: number): number => (s.pot === 'funds' ? funds : shares) ?? capital;

const scenarioOf = (s: TmSession): Scenario | null => (s.scenarioId === null ? null : scenarioById(s.scenarioId));
const onFundsOnly = (s: TmSession, funds: FundsMarket | null): funds is FundsMarket => s.pot === 'funds' && funds !== null;

async function sharesPart(s: TmSession, real: Market, kv: KeyValueStore, profileKv: KeyValueStore, now: () => number): Promise<{ paise: number | null; flagged: string[] }> {
  const sm = sessionMarket(s, real);
  if (sm === null) return { paise: null, flagged: [] };
  const book = await PaperSession.open(kv, now, sm);
  const settings = await loadProfileSettings(profileKv);
  const flags = await book.mistakes(exitPlanIds(await loadJournal(kv), sm.id), settings.mistakes);
  return { paise: book.equityPaise(), flagged: flags.map((f) => f.rule) };
}

async function fundsPart(s: TmSession, funds: FundsMarket | null, kv: KeyValueStore, now: () => number): Promise<{ paise: number | null; buyMonths: number }> {
  const fm = funds === null ? null : sessionFunds(s, funds);
  if (fm === null) return { paise: null, buyMonths: 0 };
  const book = await FundSession.open(kv, now, fm);
  return { paise: book.equityPaise(), buyMonths: book.buyMonths() };
}

/** The benchmark held from day one, its value now and its name. */
function benchmarkOf(s: TmSession, scenario: Scenario | null, real: Market, funds: FundsMarket | null): { paise: number; label: string } {
  const sym = scenario?.benchmark ?? 'NIFTYBEES';
  if (onFundsOnly(s, funds)) return { paise: fundBenchmark(funds, sym, s.start, s.current, s.capitalPaise), label: funds.funds.find((f) => f.id === sym)?.name ?? sym };
  return { paise: shareBenchmark(real, sym, s.start, s.current, s.capitalPaise), label: `${sym} held from day one` };
}

const goalFor = (scenario: Scenario | null, facts: Parameters<typeof evaluateGoal>[1]): GoalResult | null => (scenario === null ? null : evaluateGoal(scenario.goal, facts));

/** Where a session stands against its benchmark and goal, from its saved orders; never changes anything. */
export async function outcomeOf(s: TmSession, real: Market, funds: FundsMarket | null, profileKv: KeyValueStore, now: () => number): Promise<Outcome> {
  const scenario = scenarioOf(s);
  const kv = scopeOf(profileKv, s.id);
  const shares = await sharesPart(s, real, kv, profileKv, now);
  const fund = await fundsPart(s, funds, kv, now);
  const capital = s.pot === 'funds' ? FUND_CAPITAL_PAISE : s.capitalPaise;
  const mainPaise = mainValue(s, shares.paise, fund.paise, capital);
  const bench = benchmarkOf(s, scenario, real, funds);
  const facts = { capitalPaise: capital, equityPaise: mainPaise, benchmarkPaise: bench.paise, buyMonths: fund.buyMonths, flagged: shares.flagged };
  return {
    scenario,
    sharesPaise: shares.paise,
    fundsPaise: fund.paise,
    mainPaise,
    benchmarkPaise: bench.paise,
    benchmarkLabel: bench.label,
    mainBps: returnBps(capital, mainPaise),
    benchmarkBps: returnBps(capital, bench.paise),
    flagged: shares.flagged,
    buyMonths: fund.buyMonths,
    goal: goalFor(scenario, facts),
  };
}

export const FOLLOWED_SESSIONS = 20;

export interface DebriefInfo {
  /** What the person did, one line each, oldest first. */
  actions: string[];
  /** How the benchmark moved over the next 20 sessions after the end, as a sentence; says so when the data stops first. */
  followed: string;
}

async function actionLines(s: TmSession, real: Market, funds: FundsMarket | null, kv: KeyValueStore, now: () => number): Promise<string[]> {
  const sm = sessionMarket(s, real);
  const fm = funds === null ? null : sessionFunds(s, funds);
  const shares = sm === null ? [] : (await (await PaperSession.open(kv, now, sm)).view()).orders.map((o) => `${o.line}: ${o.state}`).reverse();
  const fundLines = fm === null ? [] : (await FundSession.open(kv, now, fm)).view().txns.map((t) => `${t.line}: ${t.status}`).reverse();
  return [...shares, ...fundLines];
}

function followedText(s: TmSession, real: Market, funds: FundsMarket | null): string {
  const sym = scenarioOf(s)?.benchmark ?? 'NIFTYBEES';
  const onFunds = onFundsOnly(s, funds);
  const bps = onFunds ? fundFollowed(funds, sym, s.current, FOLLOWED_SESSIONS) : shareFollowed(real, sym, s.current, FOLLOWED_SESSIONS);
  const name = onFunds ? (funds.funds.find((f) => f.id === sym)?.name ?? sym) : sym;
  if (bps === null) return 'The price history ends before 20 sessions had passed, so nothing is shown for what followed.';
  return `Over the 20 sessions after the scenario ended, ${name} moved ${bpsText(bps)}.`;
}

/** The plain facts a debrief needs: the orders given and what the benchmark did afterwards. Never changes anything. */
export async function debriefInfo(s: TmSession, real: Market, funds: FundsMarket | null, profileKv: KeyValueStore, now: () => number): Promise<DebriefInfo> {
  const actions = await actionLines(s, real, funds, scopeOf(profileKv, s.id), now);
  return { actions, followed: followedText(s, real, funds) };
}

function fundDates(s: TmSession, funds: FundsMarket | null): string[] {
  const codes = (funds?.funds ?? []).filter((f) => s.allowed === null || s.allowed.includes(f.id));
  return codes.flatMap((f) => (funds?.navs[f.id] ?? []).map((n) => n[0]));
}

function shareDates(s: TmSession, real: Market): string[] {
  const ids = real.instruments.filter((id) => s.allowed === null || s.allowed.includes(real.symbols[id] ?? id));
  return ids.flatMap((id) => (real.snapshot.bars[id] ?? []).map((b) => b.date));
}

/** Every date a session can stand on, from the dates its allowed instruments have prices, after the start and up to the end. */
export function datesFor(s: TmSession, real: Market, funds: FundsMarket | null): string[] {
  return sessionDates(s.pot === 'funds' ? fundDates(s, funds) : shareDates(s, real), s.start, s.end);
}
