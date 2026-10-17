import { describe, expect, it } from 'vitest';
import { seedEntries, seededUniverse } from './seed';
import { toUniverseRows } from './universeView';
import type { UniverseRow } from './universeView';

const rows = toUniverseRows(seedEntries());
const by = (symbol: string): UniverseRow => {
  const r = rows.find((x) => x.symbol === symbol);
  if (r === undefined) throw new Error(`no row for ${symbol}`);
  return r;
};

describe('seeded universe (UC1)', () => {
  it('holds 16 distinct names and says plainly what is real and what is assumed', async () => {
    const entries = await seededUniverse.load();
    expect(entries).toHaveLength(16);
    expect(new Set(entries.map((e) => e.symbol)).size).toBe(16);
    expect(seededUniverse.description).toMatch(/assumed/);
    expect(seededUniverse.description).toMatch(/not a 60-session median/);
  });

  it('finds six eligible names and gives every other name its first failing rule', () => {
    expect(
      rows
        .filter((r) => r.eligible)
        .map((r) => r.symbol)
        .sort(),
    ).toEqual(['AADHARHFC', 'AXISCADES', 'HDFCBANK', 'INFY', 'RELIANCE', 'TCS']);
    for (const r of rows.filter((x) => !x.eligible))
      expect(r.firstFailure, r.symbol).toMatch(/^E[15]:/);
  });

  it('fails SME and trade-for-trade-only series on E1 and thin names on E5', () => {
    for (const s of ['ACCENTMIC', 'KCK', 'ACCORD', 'BOSS'])
      expect(by(s).firstFailure, s).toMatch(/^E1: series (ST|SM)/);
    for (const s of ['20MICRONS', 'BHARATGEAR', 'CEREBRAINT', 'BLUECOAST', 'FEL', 'CURAA'])
      expect(by(s).firstFailure, s).toMatch(/^E5:/);
    expect(by('AXISCADES').eligible).toBe(true); // BE is allowed; Rs 8.7 crore traded
  });

  it('turns a traded value exactly at the threshold into a pass', () => {
    const edge = seedEntries().find((e) => e.symbol === 'AADHARHFC');
    if (edge === undefined) throw new Error('missing seed');
    const exact = { ...edge, facts: { ...edge.facts, medianTradedValuePaise: 5_000_000_000 } };
    const under = { ...edge, facts: { ...edge.facts, medianTradedValuePaise: 4_999_999_999 } };
    expect(toUniverseRows([exact])[0]?.eligible).toBe(true);
    expect(toUniverseRows([under])[0]?.firstFailure).toMatch(/^E5:/);
  });

  it('marks the rules whose inputs were assumed, and not the ones that were measured', () => {
    const r = by('RELIANCE');
    expect(r.rules.filter((x) => x.assumed).map((x) => x.rule)).toEqual(['E2', 'E3', 'E6', 'E7']);
    expect(r.rules.find((x) => x.rule === 'E1')?.assumed).toBe(false);
    expect(r.rules.find((x) => x.rule === 'E5')?.assumed).toBe(false);
    expect(r.rules).toHaveLength(7);
  });
});

describe('status flags and buckets on the seeded names', () => {
  it('reads series, band, trade-for-trade and GSM stage from the recorded files', () => {
    expect(by('RELIANCE').flags).toContain('no fixed price band');
    expect(by('AADHARHFC').flags).toContain('price band 10%');
    expect(by('FEL').flags).toEqual(
      expect.arrayContaining([
        'series BZ',
        'price band 2%',
        'trade-for-trade',
        'GSM stage 0 (shortlisted only)',
      ]),
    );
    expect(by('TCS').flags).not.toContain('trade-for-trade');
    expect(by('TCS').flags).toContain('ASM status not recorded');
  });

  it('puts Reliance in a sector bucket, narrow-band names in speculative, and leaves others without a bucket', () => {
    expect(by('RELIANCE')).toMatchObject({
      bucket: 'mundane',
      bucketWhy: 'sector:oil gas upstream refining',
    });
    for (const s of ['AXISCADES', 'BHARATGEAR', 'ACCENTMIC', 'FEL', 'CURAA'])
      expect(by(s), s).toMatchObject({ bucket: 'speculative', bucketWhy: 'narrow band' });
    expect(by('TCS').bucket).toBe('none');
    expect(by('AADHARHFC').bucket).toBe('none');
  });

  it('lists what the bucket rule could not use, without calling "No Band" a gap', () => {
    const tcs = by('TCS').gaps;
    expect(tcs).toContain('volatility needs price history');
    expect(tcs).toContain('beta needs price history and the index');
    expect(tcs).not.toContain('price band not recorded');
    expect(by('RELIANCE').gaps).not.toContain('no sector tag');
    expect(tcs).toContain('no sector tag');
  });
});

describe('filter', () => {
  it('splits the list into eligible and not eligible', () => {
    const all = seedEntries();
    expect(toUniverseRows(all, 'all')).toHaveLength(16);
    expect(toUniverseRows(all, 'eligible')).toHaveLength(6);
    expect(toUniverseRows(all, 'not_eligible')).toHaveLength(10);
  });
});
