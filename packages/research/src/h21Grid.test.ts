import { APPROVED_NAMA_TABLE_V1, H21_BUYER } from '@trading/astro-engine';
import type { InstrumentName } from '@trading/core';
import { describe, expect, it } from 'vitest';
import { buildH21Grid } from './h21Grid';
import type { GridInput, GridMember } from './h21Grid';
import { parseNameHistory } from './names';

const sessions = Array.from({ length: 12 }, (_, i) => `2026-03-${String(i + 2).padStart(2, '0')}`);
const name = (id: string, legalName: string): InstrumentName[] => [
  { instrumentId: id, legalName, effectiveFrom: 0, effectiveTo: null, source: 't' },
];
const bars = (skip: string[] = []) =>
  sessions
    .filter((d) => !skip.includes(d))
    .map((date, i) => ({ date, open: 100 + i, close: 100 + i + 1 }));

const members: GridMember[] = [
  {
    instrumentId: 'A',
    bars: bars(),
    disputed: new Set(),
    names: name('A', 'Reliance Industries'),
  },
  {
    instrumentId: 'B',
    bars: bars([sessions[5] as string]),
    disputed: new Set(),
    names: name('B', 'Infosys'),
  },
  { instrumentId: 'C', bars: bars(), disputed: new Set([sessions[6] as string]), names: [] },
];

const input = (over: Partial<GridInput> = {}): GridInput => ({
  sessions,
  horizon: 3,
  members,
  buyer: H21_BUYER,
  table: APPROVED_NAMA_TABLE_V1,
  decidedAtOf: (d) => Date.parse(`${d}T10:00:00Z`),
  transitSignAt: () => 0,
  ...over,
});

describe('the H-21 candidate grid', () => {
  it('lays out one buy candidate per company and decision session, with the forward return', () => {
    const g = buildH21Grid(input());
    expect(g.dates).toHaveLength(9);
    expect(g.grid.candidates).toHaveLength(27);
    expect(g.grid.candidates[0]).toEqual({
      instrumentId: 'A',
      date: sessions[0],
      side: 'buy',
      quantity: 1,
    });
    // decision at close of session 0, fills at the open of session 1, exits at the close of session 3
    const entryOpen = 101;
    const exitClose = 100 + 3 + 1;
    expect(g.grid.panel.ret[0]).toBeCloseTo(exitClose / entryOpen - 1, 12);
    expect(g.grid.panel.valid?.[0]).toBe(1);
  });

  it('marks a cell unusable when a bar it needs is missing or a disputed day lies in its window', () => {
    const g = buildH21Grid(input());
    const at = (i: number, t: number) => g.grid.panel.valid?.[i * g.dates.length + t];
    expect(at(1, 5)).toBe(0); // B has no bar on the decision day
    expect(at(1, 2)).toBe(0); // the missing day is the exit
    expect(at(1, 0)).toBe(1);
    expect(at(2, 3)).toBe(0); // C has a disputed day inside the window
    expect(at(2, 7)).toBe(1);
    expect(g.summary.validCells).toBe(g.grid.panel.valid?.reduce((n, v) => n + v, 0));
  });

  it('gives the overlay only the name and the Moon, never a return', () => {
    const g = buildH21Grid(input());
    for (const c of g.grid.contexts) {
      expect(Object.keys(c.features).sort()).toEqual([
        'chandrashtama',
        'nameReason',
        'taraGroup',
        'taraNumber',
      ]);
    }
    // company C has no name history: no name, no star
    const c0 = g.grid.contexts[2 * g.dates.length] as { features: Record<string, unknown> };
    expect(c0.features.nameReason).toBe('no-name');
    expect(g.summary.taraGroups.none).toBeGreaterThanOrEqual(g.dates.length);
  });

  it("counts the days the Moon is in the buyer's eighth sign", () => {
    const eighth = (H21_BUYER.moonSign + 7) % 12;
    expect(buildH21Grid(input({ transitSignAt: () => eighth })).summary.chandrashtamaDays).toBe(9);
    expect(buildH21Grid(input({ transitSignAt: () => 0 })).summary.chandrashtamaDays).toBe(0);
  });
});

describe('the company-name table', () => {
  it('reads dated names, leaves unidentified companies without a history and keeps ranges apart', () => {
    const csv = [
      'instrumentId,legalName,effectiveFrom,effectiveTo,confidence,note',
      'X:1,Old Name Limited,,2019-01-23,check,',
      'X:1,New Name Limited,2019-01-24,,check,',
      'Y:2,,,,unknown,not identified',
      'Z:3,"Smith, Jones & Co",,,high,',
    ].join('\n');
    const h = parseNameHistory(csv);
    expect(h.get('X:1')).toHaveLength(2);
    expect(h.get('X:1')?.[0]?.effectiveTo).toBe(Date.parse('2019-01-24T00:00:00Z'));
    expect(h.get('X:1')?.[1]?.effectiveFrom).toBe(Date.parse('2019-01-24T00:00:00Z'));
    expect(h.get('Y:2')).toEqual([]);
    expect(h.get('Z:3')?.[0]?.legalName).toBe('Smith, Jones & Co');
  });
});
