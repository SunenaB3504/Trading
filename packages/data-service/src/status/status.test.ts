import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BarUnadj } from '@trading/core';
import { describe, expect, it } from 'vitest';
import {
  ProviderError,
  StatusHistory,
  circuitFlagFor,
  flagCircuits,
  parseAsmReport,
  parseGsmReport,
  parseSecList,
  secListUrl,
} from '../index';

// Real files recorded from NSE on 2026-10-17 (fixtures/providers): the security list (band, series,
// remarks) for three dates, the same-day bhavcopy for 2025-10-16, and the ASM and GSM reports.
const dir = join(process.cwd(), 'fixtures', 'providers');
const text = (name: string): string => readFileSync(join(dir, name), 'utf8');
const list = (date: string) => parseSecList(text(`sec_list_${date}_subset.csv`));
const bySymbol = (rows: ReturnType<typeof list>['rows'], symbol: string) =>
  rows.find((r) => r.symbol === symbol);

describe('security list (price band, trade-for-trade, GSM remarks)', () => {
  it('reads bands, trade-for-trade series and GSM stages from the 2020 file', () => {
    const { rows, skipped } = list('2020-10-16');
    expect(skipped).toEqual([]);
    expect(bySymbol(rows, 'BLUECHIP')).toMatchObject({
      series: 'BE',
      bandPct: 2,
      tradeForTrade: true,
      gsmStage: 4,
    });
    expect(bySymbol(rows, 'BLUECOAST')).toMatchObject({ bandPct: 5, gsmStage: 2 });
    expect(bySymbol(rows, 'CANDC')).toMatchObject({
      series: 'BZ',
      tradeForTrade: true,
      gsmStage: 1,
    });
    expect(bySymbol(rows, '3IINFOTECH')).toMatchObject({
      series: 'EQ',
      tradeForTrade: false,
      gsmStage: null,
    });
    expect(bySymbol(rows, 'RELIANCE')).toMatchObject({ bandPct: null, gsmStage: null });
  });

  it('reads the 2025 and 2026 files, including stage 0 and the stray tab in the remarks', () => {
    const r25 = list('2025-10-16').rows;
    expect(r25.filter((r) => r.gsmStage === 0).length).toBeGreaterThan(0);
    expect(r25.every((r) => !r.remarks.includes('\t'))).toBe(true);
    const r26 = list('2026-10-16').rows;
    expect(r26.some((r) => r.gsmStage !== null && r.gsmStage >= 1)).toBe(true);
    expect(r26.filter((r) => r.bandPct === null).length).toBeGreaterThan(0);
  });

  it('refuses a file with the wrong header, skips unreadable rows and builds the URL', () => {
    expect(() => parseSecList('A,B\n1,2\n')).toThrow(ProviderError);
    const bad = parseSecList(
      'Symbol,Series,Security Name,Band,Remarks\nAAA,EQ,A Ltd,abc,"-"\n,EQ,B Ltd,5,"-"\nCCC,BE,C Ltd,5,"GSM STAGE - III\t"\n',
    );
    expect(bad.skipped.map((s) => s.line)).toEqual([2, 3]);
    expect(bad.rows).toEqual([
      expect.objectContaining({ symbol: 'CCC', gsmStage: 3, tradeForTrade: true }),
    ]);
    expect(secListUrl('2025-10-16')).toBe(
      'https://nsearchives.nseindia.com/content/equities/sec_list_16102025.csv',
    );
  });
});

describe('ASM and GSM reports', () => {
  it('reads long-term and short-term ASM stages', () => {
    const { entries, skipped } = parseAsmReport(
      JSON.parse(text('nse_report_asm_2026-10-16_subset.json')),
    );
    expect(skipped).toBe(0);
    expect(
      entries
        .filter((e) => e.kind === 'long_term')
        .map((e) => e.stage)
        .sort(),
    ).toEqual([1, 2, 3, 4]);
    expect(
      entries
        .filter((e) => e.kind === 'short_term')
        .map((e) => e.stage)
        .sort(),
    ).toEqual([1, 2]);
    expect(entries[0]?.code).toMatch(/ASM/);
  });

  it('reads GSM stages and the other measure a name is also under', () => {
    const { entries } = parseGsmReport(JSON.parse(text('nse_report_gsm_2026-10-16_subset.json')));
    const by = (code: string) => entries.find((e) => e.code === code);
    expect(by('GSM - VI (6)')).toMatchObject({ stage: 6, alsoUnder: null });
    expect(by('GSM - II (2)')).toMatchObject({ stage: 2 });
    expect(by('IBC I & GSM 0 (58)')).toMatchObject({ stage: 0, alsoUnder: 'IBC I' });
    expect(by('LTASM I & GSM 0 (50)')).toMatchObject({ alsoUnder: 'LTASM I' });
  });

  it('rejects a response of the wrong shape and counts rows it cannot read', () => {
    expect(() => parseAsmReport({})).toThrow(ProviderError);
    expect(() => parseGsmReport({})).toThrow(ProviderError);
    expect(parseGsmReport([{ symbol: 'X', survCode: 'nonsense' }, {}]).skipped).toBe(2);
    expect(parseAsmReport({ longterm: { data: [{ symbol: 'X', survCode: 'odd' }] } }).skipped).toBe(
      1,
    );
  });
});

describe('point-in-time status', () => {
  const history = new StatusHistory();
  history.addSecList('2020-10-16', list('2020-10-16').rows);
  history.addSecList('2026-10-16', list('2026-10-16').rows);
  const asm = parseAsmReport(JSON.parse(text('nse_report_asm_2026-10-16_subset.json'))).entries;

  it('answers from the newest file on or before the date and never from a later one', () => {
    const s = history.statusOn('BLUECHIP', '2020-10-16');
    expect(s).toMatchObject({
      sourceDate: '2020-10-16',
      bandPct: 2,
      gsmStage: 4,
      surveillanceList: 'gsm',
      tradeForTrade: true,
      inSecurityList: true,
    });
    expect(history.statusOn('BLUECHIP', '2020-10-19').sourceDate).toBe('2020-10-16'); // next session
    const early = history.statusOn('BLUECHIP', '2020-10-15');
    expect(early).toMatchObject({ sourceDate: null, bandPct: null, inSecurityList: null });
    expect(early.flags).toContain('status_unavailable');
  });

  it('says so when the newest file is too old, the name is not listed, or no band applies', () => {
    const stale = history.statusOn('BLUECHIP', '2020-12-01');
    expect(stale.flags).toContain('status_stale');
    expect(stale.bandPct).toBeNull();
    const absent = history.statusOn('NOSUCH', '2020-10-16');
    expect(absent).toMatchObject({ inSecurityList: false, surveillanceList: 'none' });
    expect(absent.flags).toContain('not_in_security_list');
    const rel = history.statusOn('RELIANCE', '2026-10-16');
    expect(rel).toMatchObject({ bandPct: null, inSecurityList: true });
    expect(rel.flags).toContain('no_price_band');
  });

  it('knows ASM only for dates a snapshot was recorded on', () => {
    expect(history.statusOn('A2ZINFRA', '2026-10-16').asmKnown).toBe(false);
    history.addAsm('2026-10-16', asm);
    const first = asm[0];
    const s = history.statusOn(first?.symbol ?? '', '2026-10-16');
    expect(s.asmKnown).toBe(true);
    expect(s.asm).toEqual({ kind: first?.kind, stage: first?.stage });
    expect(s.flags).not.toContain('asm_not_recorded');
    expect(history.statusOn(first?.symbol ?? '', '2020-10-16').asmKnown).toBe(false); // before the snapshot
  });
});

// Same-day real data: 2025-10-16 bhavcopy rows with the day's security list.
const bhav = text('sec_bhavdata_full_2025-10-16_subset.csv')
  .trim()
  .split('\n')
  .slice(1)
  .map((line) => line.split(',').map((c) => c.trim()))
  .map((c) => ({
    symbol: c[0] as string,
    prev: Math.round(Number(c[3]) * 100),
    high: Math.round(Number(c[5]) * 100),
    low: Math.round(Number(c[6]) * 100),
    close: Math.round(Number(c[8]) * 100),
  }));
const band25 = (symbol: string): number | null =>
  bySymbol(list('2025-10-16').rows, symbol)?.bandPct ?? null;
const flagOf = (symbol: string) => {
  const r = bhav.find((x) => x.symbol === symbol);
  if (r === undefined) throw new Error(`no row for ${symbol}`);
  return circuitFlagFor(r, r.prev, band25(symbol));
};

describe('circuit flags on real sessions (2025-10-16)', () => {
  it('flags names that closed at the upper band with the high on it', () => {
    for (const s of ['ACCENTMIC', 'BLUECOAST', 'CEREBRAINT', 'BHARATGEAR'])
      expect(flagOf(s), s).toBe('upper');
  });

  it('flags names that closed at the lower band with the low on it', () => {
    for (const s of ['ACCORD', 'BOSS', 'KCK']) expect(flagOf(s), s).toBe('lower');
  });

  it('flags a name that rose to its high and then fell to the lower band, since it closed locked', () => {
    // AXISCADES: previous close 1602.30, high 1628.00 (up), low and close 1522.20 (the lower band).
    expect(flagOf('AXISCADES')).toBe('lower');
  });

  it('does not flag ordinary sessions or names with no band', () => {
    expect(flagOf('20MICRONS')).toBe('none');
    expect(flagOf('RELIANCE')).toBe('none');
    expect(flagOf('TCS')).toBe('none');
  });

  it('flags a series only where a previous regular session precedes it and the date is not skipped', () => {
    const r = bhav.find((x) => x.symbol === 'ACCENTMIC') as (typeof bhav)[number];
    const bar = (date: string, close: number, high = close, low = close): BarUnadj => ({
      instrumentId: 'ACCENTMIC',
      date,
      open: close,
      high,
      low,
      close,
      volume: 1,
      provider: 'nse-bhavcopy',
      snapshotId: 's',
      disputed: false,
      circuitFlag: 'none',
    });
    const series = [bar('2025-10-15', r.prev), bar('2025-10-16', r.close, r.high, r.low)];
    const band = (): number | null => 5;
    expect(flagCircuits(series, band).map((b) => b.circuitFlag)).toEqual(['none', 'upper']);
    expect(flagCircuits(series, band, new Set(['2025-10-16'])).map((b) => b.circuitFlag)).toEqual([
      'none',
      'none',
    ]);
    const gap = [bar('2025-10-14', r.prev), series[1] as BarUnadj];
    expect(flagCircuits(gap, band)[1]?.circuitFlag).toBe('none'); // 10-15 missing: previous close is not the day before
    expect(flagCircuits(series, () => null)[1]?.circuitFlag).toBe('none');
  });
});
