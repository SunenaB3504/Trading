import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contractId, parseLearningMarket, taxReport, taxYears } from '@trading/core';
import { describe, expect, it } from 'vitest';
import { createFno, fnoDataOf, saveFno } from '../fno/fnoSessions';
import { MemoryKv } from '../store/kv';
import { realMarket } from '../trading/market';
import type { Market } from '../trading/market';
import type { OrderForm } from '../trading/orderRequest';
import { PaperSession } from '../trading/paperSession';
import { fnoTaxTrades, shareTaxTrades } from './taxSources';

const file = parseLearningMarket(JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'assets', 'learning-market.market'), 'utf8')));
if (file === null) throw new Error('the bundled market file is unreadable');
const REAL: Market = realMarket(file);
const NOW = () => 1_760_000_000_000;
const idOf = (sym: string): string => REAL.instruments.find((i) => REAL.symbols[i] === sym) ?? '';
const order = (sym: string, side: 'buy' | 'sell', date: string): OrderForm => ({ instrumentId: idOf(sym), side, type: 'market', quantity: '10', limit: '', stop: '', date });

describe('tax lines from the practice book', () => {
  it('a delivery round trip held under 12 months is a short-term gain in the year it closed', async () => {
    const s = await PaperSession.open(new MemoryKv(), NOW, REAL);
    await s.place(order('NIFTYBEES', 'buy', '2024-01-02'));
    await s.place(order('NIFTYBEES', 'sell', '2024-03-04'));
    const lines = shareTaxTrades(s.closedTrades(), REAL);
    const line = lines[0];
    if (line === undefined) throw new Error('no closed trade');
    expect(line).toMatchObject({ kind: 'equity', label: 'NIFTYBEES x 10' });
    expect(line.sttPaise).toBeGreaterThan(0);
    expect(line.chargesPaise).toBeGreaterThan(line.sttPaise);
    const year = taxYears(lines)[0] ?? '';
    expect(year).toBe('2023-24');
    const r = taxReport(lines, year);
    expect(r.trades).toBe(1);
    expect(r.ltcgPaise).toBe(0);
    expect(r.stcgPaise).toBe(line.grossPaise - (line.chargesPaise - line.sttPaise));
  });

  it('a gold ETF trade is taxed at the slab rate, and open positions are not reported', async () => {
    const s = await PaperSession.open(new MemoryKv(), NOW, REAL);
    await s.place(order('GOLDBEES', 'buy', '2024-01-02'));
    expect(shareTaxTrades(s.closedTrades(), REAL)).toHaveLength(0);
    await s.place(order('GOLDBEES', 'sell', '2024-02-01'));
    expect(shareTaxTrades(s.closedTrades(), REAL)[0]?.kind).toBe('slab_asset');
  });
});

describe('tax lines from F&O sessions', () => {
  it('each fill is business income: the profit on lots closed less that fill’s charges', async () => {
    const data = fnoDataOf(REAL);
    if (data === null) throw new Error('no F&O prices');
    const kv = new MemoryKv();
    const made = await createFno(kv, { title: 'T', scenarioId: null, underlyings: ['NIFTY'], start: '2024-01-02', end: '2024-02-29' }, 1);
    const fut = contractId({ u: 'NIFTY', kind: 'FUT', expiry: '2024-01-30', strike: null });
    const session = { ...made, current: '2024-01-25', orders: [
      { id: 'o1', date: '2024-01-02', contract: fut, side: 'buy' as const, lots: 1 },
      { id: 'o2', date: '2024-01-12', contract: fut, side: 'sell' as const, lots: 1 },
    ] };
    await saveFno(kv, session, 2);
    const lines = fnoTaxTrades(session, data);
    expect(lines).toHaveLength(2);
    expect(lines.every((l) => l.kind === 'derivative')).toBe(true);
    const r = taxReport(lines, '2023-24');
    expect(r.trades).toBe(2);
    expect(r.businessPaise).toBe(lines.reduce((a, l) => a + l.grossPaise - l.chargesPaise, 0));
    expect(r.capitalGainsTaxPaise).toBe(0);
  });
});
