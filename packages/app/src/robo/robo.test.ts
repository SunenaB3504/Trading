import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_STRATEGY, parseLearningMarket } from '@trading/core';
import { describe, expect, it } from 'vitest';
import { MemoryKv } from '../store/kv';
import { marketAsOf } from '../timeMachine/truncate';
import { realMarket } from '../trading/market';
import type { Market } from '../trading/market';
import { catchUp, defaultStart, loadSandbox, saveSandbox } from './roboAccounts';

const file = parseLearningMarket(JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'assets', 'learning-market.market'), 'utf8')));
if (file === null) throw new Error('the bundled market file is unreadable');
const REAL: Market = realMarket(file);
const NOW = 1_760_000_000_000;
const upTo = (date: string): Market => marketAsOf(REAL, { id: REAL.id, date, symbols: null, capitalPaise: REAL.config.capitalPaise });
const brief = (v: Awaited<ReturnType<typeof catchUp>>) => v.map((x) => [x.def.id, x.lastDate, x.sessions, x.valuePaise, x.holdings.length, x.recent.join('|')]);

describe('Robo accounts', () => {
  it('starts five accounts a year back and brings them up to the latest price date', async () => {
    const views = await catchUp(new MemoryKv(), REAL, NOW);
    expect(views.map((v) => v.def.id)).toEqual(['index', 'sunil', 'neil', 'shine', 'sandbox']);
    for (const v of views) {
      expect(v.startDate).toBe(defaultStart(REAL));
      expect(v.lastDate).toBe(REAL.lastDate);
      expect(v.sessions).toBeGreaterThan(200);
      expect(v.valuePaise).toBeGreaterThan(50_000_000);
    }
    expect(views[0]?.holdings.map((h) => h.symbol)).toEqual(['NIFTYBEES']);
    expect(views[0]?.vsIndexBps).toBeNull();
    expect(views[1]?.vsIndexBps).toBe((views[1]?.returnBps ?? 0) - (views[0]?.returnBps ?? 0));
  });

  it('opening the app again with no new prices changes nothing', async () => {
    const kv = new MemoryKv();
    const first = await catchUp(kv, REAL, NOW);
    const second = await catchUp(kv, REAL, NOW + 1);
    expect(brief(second)).toEqual(brief(first));
  });

  it('a fortnight missed is caught up in order and ends exactly where a never-closed app would', async () => {
    const lastDay = REAL.lastDate;
    const earlier = (await catchUp(new MemoryKv(), upTo(lastDay), NOW)).map((v) => v.lastDate);
    expect(earlier[0]).toBe(lastDay);
    const cutDate = REAL.snapshot.bars[REAL.instruments[0] as string]?.map((b) => b.date).filter((d) => d <= lastDay).slice(-11)[0] as string;
    const kv = new MemoryKv();
    const before = await catchUp(kv, upTo(cutDate), NOW, defaultStart(REAL));
    expect(before[0]?.lastDate).toBe(cutDate);
    const after = await catchUp(kv, REAL, NOW + 1);
    const never = await catchUp(new MemoryKv(), REAL, NOW, defaultStart(REAL));
    expect(after[0]?.sessions).toBeGreaterThan(before[0]?.sessions ?? 0);
    expect(brief(after)).toEqual(brief(never));
  });

  it('prices that arrive later cannot change what an earlier session decided', async () => {
    const cutDate = REAL.snapshot.bars[REAL.instruments[0] as string]?.map((b) => b.date).slice(-30)[0] as string;
    const kv = new MemoryKv();
    const early = await catchUp(kv, upTo(cutDate), NOW, defaultStart(REAL));
    const late = await catchUp(kv, REAL, NOW + 1);
    for (const e of early) {
      const l = late.find((x) => x.def.id === e.def.id);
      expect(l?.curve.slice(0, e.curve.length)).toEqual(e.curve);
    }
  });

  it('the Sandbox account follows saved settings and starts again when they change', async () => {
    const kv = new MemoryKv();
    expect(await loadSandbox(kv)).toEqual(DEFAULT_STRATEGY);
    const a = await catchUp(kv, REAL, NOW);
    await saveSandbox(kv, { ...DEFAULT_STRATEGY, positionBps: 500, maxPositions: 20, stopBps: 300 }, NOW);
    expect((await loadSandbox(kv)).stopBps).toBe(300);
    const b = await catchUp(kv, REAL, NOW + 1);
    expect(brief(b).filter((x) => x[0] !== 'sandbox')).toEqual(brief(a).filter((x) => x[0] !== 'sandbox'));
    expect(b.find((x) => x.def.id === 'sandbox')?.recent.join('|')).not.toBe(a.find((x) => x.def.id === 'sandbox')?.recent.join('|'));
  });
});
