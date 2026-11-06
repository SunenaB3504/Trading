import { describe, expect, it } from 'vitest';
import type { JournalEntry } from '../journal/journalStore';
import { STARTER_REASONS } from '../journal/reasons';
import { byReason, tradeRows, tradesCsv } from './analytics';
import type { RoundTrip } from './paperSession';

const trip = (over: Partial<RoundTrip>): RoundTrip => ({
  instrumentId: 'X',
  symbol: 'X',
  buyOrderId: 'h-0001',
  sellOrderId: 'h-0002',
  openedOn: '2026-11-02',
  closedOn: '2026-11-06',
  quantity: 10,
  buyPricePaise: 10_000,
  sellPricePaise: 11_000,
  chargesPaise: 200,
  basisPaise: 100_100,
  netPnlPaise: 9_800,
  planExit: null,
  ...over,
});
const entry = (orderId: string, over: Partial<JournalEntry> = {}): JournalEntry => ({ orderId, market: 'm', at: 1, why: '', target: '', exitPlan: '', confidence: null, ...over });

describe('trades by reason (owner, 2026-11-06)', () => {
  const trips = [
    trip({}),
    trip({ symbol: 'Y', buyOrderId: 'h-0003', sellOrderId: 'x-0001', netPnlPaise: -5_000, planExit: 'stop', closedOn: '2026-11-04' }),
    trip({ symbol: 'Z', buyOrderId: 'h-0005', sellOrderId: 'h-0006', netPnlPaise: 2_000 }),
  ];
  const journal = [
    entry('h-0001', { reasons: ['e-simulator', 'e-dip'], confidence: 4, ticket: 'TKT-X-1', why: 'cusp, "early"' }),
    entry('h-0002', { reasons: ['x-target'] }),
    entry('h-0003', { reasons: ['e-simulator'] }),
  ];
  const rows = tradeRows(trips, journal, 'm', STARTER_REASONS);

  it("joins each trade to its buy's journal and to how it was sold", () => {
    expect(rows[0]).toMatchObject({ entryReasons: ['Simulator signal', 'Buying a dip'], exitReason: 'Target reached', confidence: 4, ticket: 'TKT-X-1', daysHeld: 4 });
    // sold by an exit plan's stop: the app names the reason itself
    expect(rows[1]).toMatchObject({ exitReason: 'Stop-loss hit', daysHeld: 2 });
    expect(rows[2]).toMatchObject({ entryReasons: [], exitReason: null });
  });

  it('counts per reason: trades, win rate, average profit and days held', () => {
    const entryLines = byReason(rows, 'entry');
    expect(entryLines.find((l) => l.label === 'Simulator signal')).toMatchObject({ trades: 2, winRate: 0.5, avgDays: 3 });
    expect(entryLines.find((l) => l.label === 'No reason given')?.trades).toBe(1);
    expect(byReason(rows, 'exit').map((l) => l.label).sort()).toEqual(['No reason given', 'Stop-loss hit', 'Target reached']);
  });

  it('writes a spreadsheet with a header, money in rupees, and quoted text where needed', () => {
    const csv = tradesCsv(rows, 'Owner').split('\r\n');
    expect(csv[0]?.startsWith('Profile,Stock,Buy date,Buy price,Quantity')).toBe(true);
    expect(csv[1]).toContain('Owner,X,2026-11-02,100.00,10,2026-11-06,110.00,2.00,98.00,');
    expect(csv[1]).toContain('"cusp, ""early"""');
    expect(csv).toHaveLength(5);
  });
});
