import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CorporateAction } from '@trading/core';
import { describe, expect, it } from 'vitest';
import {
  IdentityIndex,
  SeriesStore,
  applyDisputes,
  buildIdentities,
  canonicalize,
  compareSeries,
  parseBhavcopyLegacy,
  parseBhavcopyUdiff,
  parseYahooChart,
} from '../index';
import type { PricePoint, RawBarRow } from '../index';

const dir = join(process.cwd(), 'fixtures', 'providers');
const text = (name: string): string => readFileSync(join(dir, name), 'utf8');

const point = (date: string, close: number, volume = 1_000): PricePoint => ({
  date,
  close,
  volume,
});

describe('NSE legacy file against NSE UDiFF file, same day (both unadjusted)', () => {
  const legacy = parseBhavcopyLegacy(text('nse_bhavcopy_legacy_2024-06-03_subset.csv'));
  const udiff = parseBhavcopyUdiff(text('nse_bhavcopy_udiff_2024-06-03_subset.csv'));

  it('parses the same 9 rows into identical records in both formats, series by series', () => {
    expect(legacy.skipped).toEqual([]);
    expect(udiff.skipped).toEqual([]);
    const byKey = (rows: RawBarRow[]) =>
      new Map(rows.map((r) => [`${r.symbol}|${r.series ?? ''}`, r]));
    const l = byKey(legacy.rows);
    const u = byKey(udiff.rows);
    expect([...l.keys()].sort()).toEqual([...u.keys()].sort());
    for (const [key, row] of l) expect(u.get(key)).toEqual(row);
  });

  it('therefore agrees on every close and volume', () => {
    const u = new Map(udiff.rows.map((r) => [r.symbol, r]));
    for (const row of legacy.rows) {
      const report = compareSeries([row], [u.get(row.symbol) as RawBarRow]);
      expect(report.compared).toBe(1);
      expect(report.discrepancies).toEqual([]);
    }
  });
});

describe('NSE (adjusted with our corporate-action table) against Yahoo, RELIANCE across the 1:1 bonus', () => {
  const rows: RawBarRow[] = parseBhavcopyUdiff(text('events_udiff_subset.csv')).rows;
  const identities = buildIdentities(rows);
  const id = identities[0]?.instrumentId ?? '';
  const bonus: CorporateAction = {
    id: 'b',
    instrumentId: id,
    type: 'bonus',
    exDate: '2024-10-28',
    ratio: { numerator: 2, denominator: 1 },
    dividendPaisePerShare: null,
    source: 'NSE',
    effectiveAt: 0,
  };
  const yahoo = parseYahooChart(
    JSON.parse(text('yahoo_chart_RELIANCE.NS_bonus_2024-10.json')),
  ).rows;

  function ours(actions: CorporateAction[]): PricePoint[] {
    const store = new SeriesStore();
    for (const [k, v] of canonicalize(rows, new IdentityIndex(identities), 's').bars)
      store.putUnadjusted(k, v);
    store.putActions(id, actions);
    return store
      .adjusted(id, { includeDividends: false })
      .map((b) => point(b.date, b.close, b.volume));
  }

  it('agrees on all six shared sessions, close and volume, and reports the sessions only NSE covers', () => {
    const report = compareSeries(ours([bonus]), yahoo);
    expect(report.compared).toBe(6);
    expect(report.agreeing).toBe(6);
    expect(report.discrepancies).toEqual([]);
    expect(report.onlyInPrimary).toEqual(['2024-10-22', '2024-10-23', '2024-11-01', '2024-11-04']);
    expect(report.onlyInOther).toEqual([]);
  });

  it('flags a close that is off by more than 0.5% and a share-count difference', () => {
    const tampered = yahoo.map((y, i) =>
      i === 2
        ? { ...y, close: Math.round(y.close * 1.01) }
        : i === 3
          ? { ...y, volume: y.volume + 1 }
          : y,
    );
    const report = compareSeries(ours([bonus]), tampered);
    expect(report.discrepancies.map((d) => [d.date, d.field])).toEqual([
      ['2024-10-28', 'close'],
      ['2024-10-29', 'volume'],
    ]);
    expect(report.discrepancies[0]?.relDiffBps).toBeCloseTo(100, 0);
    expect(report.disputedDates).toEqual(['2024-10-28', '2024-10-29']);
    expect(report.agreeing).toBe(4);
  });

  it('shows what a missing corporate action looks like: every pre-ex session is twice as high as Yahoo', () => {
    const report = compareSeries(ours([]), yahoo);
    expect(report.disputedDates).toEqual(['2024-10-24', '2024-10-25']);
    expect(report.suspectedActions).toEqual([]); // only two sessions, too few to call it a pattern
  });
});

describe('diagnosing a missing action from a constant ratio', () => {
  const dates = [
    '2022-07-22',
    '2022-07-25',
    '2022-07-26',
    '2022-07-27',
    '2022-07-28',
    '2022-07-29',
  ];
  const closes = [93_605, 96_070, 94_950, 95_940, 10_035, 10_760];
  const raw = dates.map((d, i) => point(d, closes[i] as number, 1_000));
  // what Yahoo would show: everything before the ex-date divided by 10, volume times 10
  const other = dates.map((d, i) =>
    i < 4 ? point(d, (closes[i] as number) / 10, 10_000) : point(d, closes[i] as number, 1_000),
  );

  it('points at a 10-for-1 change between the last disputed and the first agreeing session', () => {
    const report = compareSeries(raw, other);
    expect(report.suspectedActions).toHaveLength(1);
    const s = report.suspectedActions[0];
    expect(s?.ratio).toBeCloseTo(0.1, 9);
    expect(s?.impliedShareRatio).toBeCloseTo(10, 9);
    expect(s?.exDateBetween).toEqual(['2022-07-27', '2022-07-28']);
  });
});

describe('tolerance (decision D4: 0.5% on close, any share-count difference)', () => {
  it('allows exactly 0.5% and disputes anything above', () => {
    expect(compareSeries([point('d', 10_000)], [point('d', 10_050)]).discrepancies).toEqual([]);
    expect(compareSeries([point('d', 10_000)], [point('d', 10_051)]).disputedDates).toEqual(['d']);
    expect(compareSeries([point('d', 10_000)], [point('d', 9_949)]).disputedDates).toEqual(['d']);
    expect(compareSeries([point('d', 10_000)], [point('d', 10_051)], 100).discrepancies).toEqual(
      [],
    );
  });

  it('disputes a one-share volume difference even when prices match', () => {
    const r = compareSeries([point('d', 10_000, 500)], [point('d', 10_000, 501)]);
    expect(r.discrepancies).toEqual([
      { date: 'd', field: 'volume', primary: 500, other: 501, relDiffBps: null },
    ]);
  });
});

describe('applying disputes to the canonical series', () => {
  it('flags only the disputed dates and does not change the input', () => {
    const rows = parseBhavcopyUdiff(text('events_udiff_subset.csv')).rows;
    const identities = buildIdentities(rows);
    const bars = [...canonicalize(rows, new IdentityIndex(identities), 's').bars.values()][0] ?? [];
    const flagged = applyDisputes(bars, {
      compared: 0,
      agreeing: 0,
      discrepancies: [],
      disputedDates: ['2024-10-28'],
      onlyInPrimary: [],
      onlyInOther: [],
      suspectedActions: [],
    });
    expect(flagged.filter((b) => b.disputed).map((b) => b.date)).toEqual(['2024-10-28']);
    expect(bars.every((b) => !b.disputed)).toBe(true);
  });
});
