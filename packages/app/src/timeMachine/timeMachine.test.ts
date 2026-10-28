import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseFundsMarket, parseLearningMarket } from '@trading/core';
import { scenarioById } from '@trading/content';
import { describe, expect, it } from 'vitest';
import { applyImport, exportProfile, readBackup } from '../backup/backupService';
import { ProfileStore } from '../profiles/profiles';
import { MemorySecureStore } from '../secure/secureStore';
import { MemoryKv } from '../store/kv';
import { FundSession } from '../trading/fundSession';
import { realMarket } from '../trading/market';
import type { Market } from '../trading/market';
import { PaperSession } from '../trading/paperSession';
import type { OrderForm } from '../trading/orderRequest';
import { fundBenchmark, shareBenchmark } from './benchmark';
import { bpsText, evaluateGoal, returnBps } from './goals';
import { outcomeOf, sessionMarket } from './outcome';
import { createSession, deleteSession, listSessions, scopeOf } from './sessions';
import { sessionDates, stepOn } from './stepping';
import { fundsAsOf, marketAsOf } from './truncate';

const ASSETS = join(import.meta.dirname, '..', '..', 'assets');
const file = parseLearningMarket(JSON.parse(readFileSync(join(ASSETS, 'learning-market.market'), 'utf8')));
const fundsFile = parseFundsMarket(JSON.parse(readFileSync(join(ASSETS, 'learning-funds.market'), 'utf8')));
if (file === null || fundsFile === null) throw new Error('the bundled market files are unreadable');
const REAL: Market = realMarket(file);
const NOW = () => 1_760_000_000_000;
const CAP = 100_000_000;
const idOf = (m: Market, sym: string): string => m.instruments.find((i) => m.symbols[i] === sym) ?? '';
const buy = (m: Market, symbol: string, quantity: number, date: string): OrderForm => ({
  instrumentId: idOf(m, symbol),
  side: 'buy',
  type: 'market',
  quantity: String(quantity),
  limit: '',
  stop: '',
  date,
});
const at = (date: string, symbols: string[] | null = null): Market => marketAsOf(REAL, { id: 'tm-t', date, symbols, capitalPaise: CAP });
const scenario = (id: string) => {
  const s = scenarioById(id);
  if (s === null) throw new Error(`scenario ${id} missing`);
  return s;
};

describe('the market as of a date', () => {
  it('holds no bar, action or end date after the date, and only the instruments named', () => {
    const m = at('2020-06-01', ['NIFTYBEES', 'TCS', 'ITBEES']);
    for (const bars of Object.values(m.snapshot.bars)) for (const b of bars) expect(b.date <= '2020-06-01').toBe(true);
    expect(m.config.actions.every((a) => a.exDate <= '2020-06-01')).toBe(true);
    expect(m.config.endDate).toBe('2020-06-01');
    expect(m.lastDate).toBe('2020-06-01');
    expect(m.instruments.map((i) => m.symbols[i]).sort()).toEqual(['NIFTYBEES', 'TCS']); // ITBEES is not listed until July 2020
    expect(Object.keys(m.snapshot.bars).sort()).toEqual([...m.instruments].sort());
  });

  it('funds: no NAV after the date', () => {
    const f = fundsAsOf(fundsFile, '2022-01-20', ['120716', '149466']);
    expect(f.funds.map((x) => x.id)).toEqual(['120716']); // the Next 50 fund starts in February 2022
    expect(Object.values(f.navs).every((n) => n.every((x) => x[0] <= '2022-01-20'))).toBe(true);
    expect((f.funds[0]?.lastDate ?? '9') <= '2022-01-20').toBe(true);
  });
});

describe('no look-ahead', () => {
  it('an order given today waits, then fills at the next session open when the date moves on', async () => {
    const day1 = at('2020-04-01', ['NIFTYBEES']);
    const kv = new MemoryKv();
    const a = await PaperSession.open(kv, NOW, day1);
    expect((await a.place(buy(day1, 'NIFTYBEES', 100, '2020-04-01'))).ok).toBe(true);
    expect((await a.view()).orders[0]?.state).toBe('pending');
    expect(a.equityPaise()).toBe(CAP);
    const b = await PaperSession.open(kv, NOW, at('2020-04-03', ['NIFTYBEES']));
    const filled = (await b.view()).orders[0];
    expect(filled?.state).toBe('filled');
    const open = (REAL.snapshot.bars[idOf(REAL, 'NIFTYBEES')] ?? []).find((x) => x.date === '2020-04-03')?.open ?? 0;
    expect(JSON.stringify(filled?.note)).toContain((open / 100).toFixed(2));
  });

  it('poisoned prices after the date change nothing', async () => {
    const id = idOf(REAL, 'NIFTYBEES');
    const poisoned: Market = {
      ...REAL,
      snapshot: {
        ...REAL.snapshot,
        bars: { ...REAL.snapshot.bars, [id]: (REAL.snapshot.bars[id] ?? []).map((b) => (b.date > '2020-07-01' ? { ...b, open: 100, high: 100, low: 100, close: 100 } : b)) },
      },
    };
    const run = async (full: Market): Promise<number> => {
      const m = marketAsOf(full, { id: 'tm-t', date: '2020-07-01', symbols: ['NIFTYBEES'], capitalPaise: CAP });
      const kv = new MemoryKv();
      await (await PaperSession.open(kv, NOW, m)).place(buy(m, 'NIFTYBEES', 500, '2020-04-01'));
      return (await PaperSession.open(kv, NOW, m)).equityPaise();
    };
    expect(await run(poisoned)).toBe(await run(REAL));
  });

  it('a fill made by one date is the same at every later date', async () => {
    const kv = new MemoryKv();
    const m1 = at('2020-05-04', ['TCS']);
    await (await PaperSession.open(kv, NOW, m1)).place(buy(m1, 'TCS', 10, '2020-05-04'));
    const early = (await (await PaperSession.open(kv, NOW, at('2020-05-05', ['TCS']))).view()).orders[0]?.note;
    const late = (await (await PaperSession.open(kv, NOW, at('2020-09-30', ['TCS']))).view()).orders[0]?.note;
    expect(early).not.toBeNull();
    expect(late).toEqual(early);
  });
});

describe('stepping', () => {
  const dates = sessionDates(
    ['2021-04-02', '2021-04-05', '2021-04-06', '2021-04-07', '2021-04-08', '2021-04-09', '2021-04-12', '2021-04-02', '2021-03-31'],
    '2021-04-01',
    '2021-04-12',
  );
  it('lists each date after the start once, up to the end', () => {
    expect(dates).toEqual(['2021-04-02', '2021-04-05', '2021-04-06', '2021-04-07', '2021-04-08', '2021-04-09', '2021-04-12']);
  });
  it('moves a day or a week, and never past the end', () => {
    expect(stepOn(dates, '2021-04-01', 1, []).date).toBe('2021-04-02');
    expect(stepOn(dates, '2021-04-01', 5, []).date).toBe('2021-04-08');
    expect(stepOn(dates, '2021-04-06', 5, [])).toMatchObject({ date: '2021-04-12', finished: true });
    expect(stepOn(dates, '2021-04-12', 1, [])).toMatchObject({ date: '2021-04-12', finished: true });
  });
  it('stops at a checkpoint on the way, on the next trading date if it falls on a holiday', () => {
    const cps = [{ date: '2021-04-03', text: 'x' }];
    expect(stepOn(dates, '2021-04-01', 5, cps)).toMatchObject({ date: '2021-04-05', checkpoint: cps[0] });
    expect(stepOn(dates, '2021-04-05', 1, cps).checkpoint).toBeNull();
  });
});

describe('goals', () => {
  const f = { capitalPaise: 100_000_000, equityPaise: 100_000_000, benchmarkPaise: 100_000_000, buyMonths: 0, flagged: [] as string[] };
  it('beat the index needs a strictly higher value', () => {
    expect(evaluateGoal({ kind: 'beat_index' }, { ...f, equityPaise: 100_000_001 }).met).toBe(true);
    expect(evaluateGoal({ kind: 'beat_index' }, f).met).toBe(false);
  });
  it('limit loss is exact at the boundary', () => {
    expect(evaluateGoal({ kind: 'limit_loss', pct: 5 }, { ...f, equityPaise: 95_000_000 }).met).toBe(true);
    expect(evaluateGoal({ kind: 'limit_loss', pct: 5 }, { ...f, equityPaise: 94_999_999 }).met).toBe(false);
  });
  it('buy months and flags', () => {
    expect(evaluateGoal({ kind: 'buy_months', count: 9 }, { ...f, buyMonths: 9 }).met).toBe(true);
    expect(evaluateGoal({ kind: 'buy_months', count: 9 }, { ...f, buyMonths: 8 }).met).toBe(false);
    const g = { kind: 'no_flag', rules: ['position_too_large', 'averaging_down'] } as const;
    expect(evaluateGoal(g, { ...f, flagged: ['no_exit_plan'] }).met).toBe(true);
    expect(evaluateGoal(g, { ...f, flagged: ['averaging_down'] }).met).toBe(false);
  });
  it('shows returns in hundredths of a percent', () => {
    expect(returnBps(100_000_000, 112_345_000)).toBe(1235);
    expect(bpsText(1235)).toBe('+12.35%');
    expect(bpsText(-350)).toBe('-3.50%');
    expect(bpsText(5)).toBe('+0.05%');
  });
});

describe('benchmarks', () => {
  it('holding the Nifty ETF from April to September 2020 gained about a third', () => {
    const v = shareBenchmark(REAL, 'NIFTYBEES', '2020-04-01', '2020-09-30', CAP);
    expect(v).toBeGreaterThan(CAP * 1.3);
    expect(v).toBeLessThan(CAP * 1.4);
    expect(shareBenchmark(REAL, 'NIFTYBEES', '2020-04-01', '2020-04-01', CAP)).toBe(CAP);
  });
  it('a fund held through 2022 is worth the NAV ratio of the cash put in', () => {
    const navs = fundsFile.navs['120716'] ?? [];
    const entry = navs.find((n) => n[0] > '2022-01-03');
    const last = [...navs].filter((n) => n[0] <= '2022-12-30').pop();
    expect(fundBenchmark(fundsFile, '120716', '2022-01-03', '2022-12-30', CAP)).toBe(Math.round((CAP * (last?.[1] ?? 0)) / (entry?.[1] ?? 1)));
  });
});

/** True when no instrument of the market has a bar dated after the date. */
const nothingAfter = (date: string, m: Market): boolean => Object.values(m.snapshot.bars).every((bars) => (bars[bars.length - 1]?.date ?? '') <= date);

describe('a 2020 session played end to end', () => {
  it('buys on day one, steps by weeks through the checkpoints, ends on the last date and is judged against the goal', async () => {
    const sc = scenario('recovery-2020');
    const kv = new MemoryKv();
    let s = await createSession(kv, { title: sc.title, scenarioId: sc.id, pot: sc.pot, allowed: [...sc.instruments], start: sc.start, end: sc.end, capitalPaise: CAP }, NOW());
    const dates = sessionDates(Object.values(REAL.snapshot.bars).flatMap((b) => b.map((x) => x.date)), s.start, s.end);
    const book = scopeOf(kv, s.id);
    const m0 = sessionMarket(s, REAL) as Market;
    expect((await (await PaperSession.open(book, NOW, m0)).place(buy(m0, 'NIFTYBEES', 1000, s.start))).ok).toBe(true);
    const seen: string[] = [];
    for (let guard = 0; guard < 100; guard += 1) {
      const step = stepOn(dates, s.current, 5, sc.checkpoints);
      s = { ...s, current: step.date };
      if (step.checkpoint !== null) seen.push(step.checkpoint.date);
      expect(nothingAfter(s.current, sessionMarket(s, REAL) as Market)).toBe(true);
      if (step.finished) break;
    }
    expect(s.current).toBe(dates[dates.length - 1]);
    expect(s.current <= sc.end).toBe(true);
    expect(seen.length).toBe(2);
    const out = await outcomeOf(s, REAL, fundsFile, kv, NOW);
    const nifty = REAL.snapshot.bars[idOf(REAL, 'NIFTYBEES')] ?? [];
    const fill = nifty.find((x) => x.date === '2020-04-03')?.open ?? 0;
    const close = nifty.filter((x) => x.date <= s.current).pop()?.close ?? 0;
    const gross = CAP + 1000 * (close - fill);
    expect(Math.abs(out.mainPaise - gross)).toBeLessThan(300_000); // within ₹3,000: charges and the adjusted close
    expect(out.mainPaise).toBeGreaterThan(CAP);
    expect(out.benchmarkPaise).toBeGreaterThan(out.mainPaise); // only 9% of the cash was invested
    expect(out.goal?.met).toBe(false);
    expect(out.flagged).toContain('no_exit_plan');
  });
});

describe('a fund scenario', () => {
  it('counts the months of purchases and judges the goal', async () => {
    const sc = scenario('sip-2022');
    const kv = new MemoryKv();
    const s = await createSession(kv, { title: sc.title, scenarioId: sc.id, pot: sc.pot, allowed: [...sc.instruments], start: sc.start, end: sc.end, capitalPaise: CAP }, NOW());
    const book = await FundSession.open(scopeOf(kv, s.id), NOW, fundsAsOf(fundsFile, s.current, [...sc.instruments]));
    const r = await book.place({ fundId: '120716', action: 'sip', amount: '10000', date: '2022-01-03', dayOfMonth: '5', instalments: '12', beforeCutoff: true, units: '' });
    expect(r).toMatchObject({ ok: true });
    const out = await outcomeOf({ ...s, current: sc.end }, REAL, fundsFile, kv, NOW);
    expect(out.buyMonths).toBeGreaterThanOrEqual(11);
    expect(out.goal?.met).toBe(true);
    expect(out.fundsPaise).not.toBeNull();
    expect(out.sharesPaise).toBeNull();
  });
});

describe('saving, deleting and backing up sessions', () => {
  const free = { scenarioId: null, pot: 'both', allowed: null, capitalPaise: CAP } as const;
  it('keeps each session’s orders apart and deletes them with it', async () => {
    const kv = new MemoryKv();
    const a = await createSession(kv, { ...free, title: 'A', start: '2020-04-01', end: '2020-12-31' }, NOW());
    const b = await createSession(kv, { ...free, title: 'B', start: '2021-01-01', end: '2021-12-31' }, NOW());
    expect([a.id, b.id]).toEqual(['s1', 's2']);
    const ma = sessionMarket(a, REAL) as Market;
    await (await PaperSession.open(scopeOf(kv, a.id), NOW, ma)).place(buy(ma, 'TCS', 5, '2020-04-01'));
    expect((await kv.keys()).some((k) => k.startsWith('tm/s1/'))).toBe(true);
    expect((await PaperSession.open(scopeOf(kv, b.id), NOW, sessionMarket(b, REAL) as Market)).equityPaise()).toBe(CAP);
    await deleteSession(kv, a.id, NOW());
    expect((await listSessions(kv)).map((x) => x.id)).toEqual(['s2']);
    expect((await kv.keys()).filter((k) => k.startsWith('tm/s1/'))).toEqual([]);
  });

  it('travels in the signed profile backup and comes back the same', async () => {
    const dev = new MemoryKv();
    const profiles = new ProfileStore(dev, new MemorySecureStore(), NOW, () => 'ab'.repeat(32));
    const p = await profiles.create('Sunil');
    const kv = profiles.scope(p.id);
    const s = await createSession(kv, { ...free, title: 'A', start: '2020-04-01', end: '2020-12-31' }, NOW());
    const m = sessionMarket({ ...s, current: '2020-06-01' }, REAL) as Market;
    await (await PaperSession.open(scopeOf(kv, s.id), NOW, m)).place(buy(m, 'TCS', 5, '2020-04-01'));
    const out = await exportProfile({ device: dev, profileKv: kv, profile: p, snapshotId: 'snap', now: NOW(), randomHex: () => 'cd'.repeat(32) });
    const read = await readBackup(new MemoryKv(), out.text, 'cd'.repeat(32), 'snap');
    if (!read.ok) throw new Error(read.message);
    expect(read.backup.tm.length).toBe(2);
    const other = new ProfileStore(new MemoryKv(), new MemorySecureStore(), NOW, () => 'ef'.repeat(32));
    const target = await applyImport(read.backup, other, NOW());
    const back = other.scope(target.id);
    expect((await listSessions(back)).map((x) => x.id)).toEqual([s.id]);
    const equity = async (k: MemoryKv | ReturnType<ProfileStore['scope']>) => (await PaperSession.open(scopeOf(k, s.id), NOW, m)).equityPaise();
    expect(await equity(back)).toBe(await equity(kv as never));
  });
});
