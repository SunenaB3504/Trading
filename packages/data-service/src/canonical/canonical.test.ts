import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CorporateAction } from '@trading/core';
import { describe, expect, it } from 'vitest';
import {
  IdentityIndex,
  SeriesStore,
  buildIdentities,
  canonicalize,
  parseBhavcopyLegacy,
  parseBhavcopyUdiff,
  parseYahooChart,
  verifyAdjustment,
} from '../index';
import type { RawBarRow } from '../index';

// Real unadjusted NSE bars around five splits/bonuses, recorded from the exchange's bhavcopy
// archives on 2026-10-17 (fixtures/providers/events_*_subset.csv, EQ series, 5 sessions either side).
const dir = join(process.cwd(), 'fixtures', 'providers');
const text = (name: string): string => readFileSync(join(dir, name), 'utf8');
const rows: RawBarRow[] = [
  ...parseBhavcopyLegacy(text('events_legacy_subset.csv')).rows,
  ...parseBhavcopyUdiff(text('events_udiff_subset.csv')).rows,
];
const identities = buildIdentities(rows);
const index = new IdentityIndex(identities);
const canon = canonicalize(rows, index, 'events-v1');

const id = (symbol: string): string =>
  identities.find((i) => i.listings.some((l) => l.symbol === symbol))?.instrumentId ?? '';

function action(
  symbol: string,
  type: 'split' | 'bonus',
  exDate: string,
  numerator: number,
  denominator = 1,
): CorporateAction {
  return {
    id: `${symbol}-${type}-${exDate}`,
    instrumentId: id(symbol),
    type,
    exDate,
    ratio: { numerator, denominator },
    dividendPaisePerShare: null,
    source: 'NSE',
    effectiveAt: 0,
  };
}

const EVENTS: Array<{ symbol: string; actions: CorporateAction[] }> = [
  { symbol: 'TATASTEEL', actions: [action('TATASTEEL', 'split', '2022-07-28', 10)] },
  { symbol: 'IRCTC', actions: [action('IRCTC', 'split', '2021-10-28', 5)] },
  { symbol: 'NESTLEIND', actions: [action('NESTLEIND', 'split', '2024-01-05', 10)] },
  { symbol: 'RELIANCE', actions: [action('RELIANCE', 'bonus', '2024-10-28', 2)] },
  {
    symbol: 'BAJAJFINSV',
    actions: [
      action('BAJAJFINSV', 'split', '2022-09-13', 5),
      action('BAJAJFINSV', 'bonus', '2022-09-13', 2),
    ],
  },
];

describe('instrument identity across ISIN changes', () => {
  it('finds five instruments, joining the old and new ISIN issued after a face-value change', () => {
    expect(identities).toHaveLength(5);
    const tata = identities.find((i) => i.instrumentId.startsWith('TATASTEEL'));
    expect(tata?.listings.map((l) => l.isin)).toEqual(['INE081A01012', 'INE081A01020']);
  });

  it('shows the real quirk: the new ISIN starts the session AFTER the ex-date', () => {
    const [old, next] =
      identities.find((i) => i.instrumentId.startsWith('TATASTEEL'))?.listings ?? [];
    expect(old?.lastSeen).toBe('2022-07-28'); // ex-date, already at the post-split price, still the old ISIN
    expect(next?.firstSeen).toBe('2022-07-29');
    expect(index.idFor('TATASTEEL', '2022-07-28')).toBe(index.idFor('TATASTEEL', '2022-07-29'));
  });

  it('returns nothing for a date outside what was seen', () => {
    expect(index.idFor('TATASTEEL', '2020-01-01')).toBeUndefined();
    expect(index.idFor('NOSUCH', '2022-07-28')).toBeUndefined();
  });

  const row = (symbol: string, isin: string | null, date: string): RawBarRow => ({
    provider: 'nse-bhavcopy',
    symbol,
    series: 'EQ',
    isin,
    date,
    open: 100,
    high: 100,
    low: 100,
    close: 100,
    prevClose: null,
    volume: 1,
    adjusted: false,
  });

  it('treats a rename with the same ISIN as one stock, and a symbol reused years later as another', () => {
    const renamed = buildIdentities([
      row('OLD', 'INE000A01010', '2024-01-02'),
      row('NEW', 'INE000A01010', '2024-02-01'),
    ]);
    expect(renamed).toHaveLength(1);
    const reused = buildIdentities([
      row('ABC', 'INE111A01010', '2020-01-02'),
      row('ABC', 'INE222B01010', '2024-03-01'),
    ]);
    expect(reused).toHaveLength(2);
  });

  it('ignores rows with no ISIN', () => {
    expect(buildIdentities([row('X', null, '2024-01-02')])).toEqual([]);
  });
});

describe('canonical unadjusted series', () => {
  it('builds one ascending series per instrument from both bhavcopy formats, with no conflicts or refusals', () => {
    expect(canon.refused).toEqual([]);
    expect(canon.conflicts).toEqual([]);
    const counts = Object.fromEntries([...canon.bars].map(([k, v]) => [k.split(':')[0], v.length]));
    expect(counts).toEqual({ TATASTEEL: 9, IRCTC: 9, NESTLEIND: 8, RELIANCE: 10, BAJAJFINSV: 7 });
    for (const bars of canon.bars.values()) {
      expect(bars.map((b) => b.date)).toEqual([...bars.map((b) => b.date)].sort());
      expect(
        bars.every(
          (b) => b.provider === 'nse-bhavcopy' && !b.disputed && b.snapshotId === 'events-v1',
        ),
      ).toBe(true);
    }
  });

  it('keeps the Muhurat session bar of 2024-11-01 as a trading day', () => {
    const bar = canon.bars.get(id('RELIANCE'))?.find((b) => b.date === '2024-11-01');
    expect(bar?.volume).toBe(2127335);
  });

  it('refuses Yahoo rows because their prices are adjusted', () => {
    const yahoo = parseYahooChart(
      JSON.parse(text('yahoo_chart_RELIANCE.NS_bonus_2024-10.json')),
    ).rows;
    const r = canonicalize(yahoo, index, 's');
    expect(r.bars.size).toBe(0);
    expect(r.refused).toHaveLength(6);
    expect(new Set(r.refused.map((x) => x.reason))).toEqual(
      new Set(['provider prices are already adjusted']),
    );
  });

  it('flags disagreeing providers as disputed, prefers the exchange file, and refuses unknown symbols', () => {
    const base = rows.find((r) => r.symbol === 'RELIANCE' && r.date === '2024-10-25') as RawBarRow;
    const other: RawBarRow = { ...base, provider: 'csv', close: base.close + 5 };
    const r = canonicalize([base, other, { ...base, symbol: 'MYSTERY' }], index, 's');
    const bar = r.bars.get(id('RELIANCE'))?.[0];
    expect(bar).toMatchObject({ close: base.close, provider: 'nse-bhavcopy', disputed: true });
    expect(r.conflicts).toEqual([
      { instrumentId: id('RELIANCE'), date: '2024-10-25', providers: ['nse-bhavcopy', 'csv'] },
    ]);
    expect(r.refused.map((x) => x.symbol)).toEqual(['MYSTERY']);
    const same = canonicalize([base, { ...base, provider: 'csv' }], index, 's');
    expect(same.conflicts).toEqual([]);
  });
});

describe('adjusted series equals unadjusted times the factor, on real splits and bonuses', () => {
  const store = new SeriesStore();
  for (const [instrumentId, bars] of canon.bars) store.putUnadjusted(instrumentId, bars);
  for (const e of EVENTS) store.putActions(id(e.symbol), e.actions);

  it.each(EVENTS)(
    '$symbol: factor verified by an independent recomputation, history continuous',
    (e) => {
      const instrumentId = id(e.symbol);
      const before = store.unadjusted(instrumentId);
      const adjusted = store.adjusted(instrumentId, { includeDividends: false });
      expect(verifyAdjustment(before, adjusted, e.actions)).toEqual([]);
      // the unadjusted series still shows the cliff; the adjusted one does not
      const ex = before.findIndex((b) => b.date >= (e.actions[0] as CorporateAction).exDate);
      const cliff =
        (before[ex - 1] as { close: number }).close / (before[ex] as { close: number }).close;
      const smooth =
        (adjusted[ex - 1] as { close: number }).close / (adjusted[ex] as { close: number }).close;
      expect(cliff).toBeGreaterThan(1.5);
      expect(Math.abs(smooth - 1)).toBeLessThan(0.1);
      expect(store.unadjusted(instrumentId)).toEqual(before); // adjusting changed nothing stored
    },
  );

  it('agrees with Yahoo for RELIANCE on every session both cover (first real cross-check)', () => {
    const yahoo = parseYahooChart(
      JSON.parse(text('yahoo_chart_RELIANCE.NS_bonus_2024-10.json')),
    ).rows;
    const ours = new Map(
      store.adjusted(id('RELIANCE'), { includeDividends: false }).map((b) => [b.date, b.close]),
    );
    const compared = yahoo.filter((y) => ours.has(y.date));
    expect(compared).toHaveLength(6);
    for (const y of compared)
      expect(Math.abs((ours.get(y.date) as number) - y.close)).toBeLessThanOrEqual(1);
  });

  it('scales volume with the share count: 10x for the Tata Steel split', () => {
    const adj = store.adjusted(id('TATASTEEL'), { includeDividends: false });
    const raw = store.unadjusted(id('TATASTEEL'));
    expect(adj.find((b) => b.date === '2022-07-27')?.volume).toBe(
      10 * (raw.find((b) => b.date === '2022-07-27')?.volume as number),
    );
    expect(adj.find((b) => b.date === '2022-07-29')?.volume).toBe(
      raw.find((b) => b.date === '2022-07-29')?.volume,
    );
  });

  it('is cut off by asOf, and the verifier catches a tampered adjusted bar', () => {
    const instrumentId = id('IRCTC');
    const raw = store.unadjusted(instrumentId);
    const early = store.adjusted(instrumentId, { includeDividends: false, asOf: '2021-10-27' });
    expect(early.map((b) => b.close)).toEqual(raw.map((b) => b.close));
    const adjusted = store.adjusted(instrumentId, { includeDividends: false });
    const tampered = adjusted.map((b, i) => (i === 0 ? { ...b, close: b.close + 1 } : b));
    const problems = verifyAdjustment(
      raw,
      tampered,
      (EVENTS[1] as { actions: CorporateAction[] }).actions,
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ date: '2021-10-22', field: 'close' });
  });

  it('hands out copies, so callers cannot change the stored series', () => {
    const copy = store.unadjusted(id('RELIANCE'));
    (copy[0] as { close: number }).close = 1;
    expect(store.unadjusted(id('RELIANCE'))[0]?.close).not.toBe(1);
    expect(store.instruments()).toHaveLength(5);
  });
});

describe('debt series that share a share symbol (the NTPC and PFC bond lines)', () => {
  const row = (series: string, isin: string, close: number, date: string): RawBarRow => ({
    provider: 'nse-bhavcopy',
    symbol: 'NTPC',
    series,
    isin,
    date,
    open: close,
    high: close,
    low: close,
    close,
    prevClose: close,
    volume: 100,
    adjusted: false,
  });
  const rows = ['2020-06-01', '2020-06-02'].flatMap((d) => [
    row('EQ', 'INE733E01010', 9790, d),
    row('N2', 'INE733E07JF7', 125700, d),
    row('N7', 'INE733E07JP6', 1355, d),
  ]);

  it('keeps the share as one instrument and its bar is the share price, not a bond price', () => {
    const identities = buildIdentities(rows);
    expect(identities).toHaveLength(1);
    expect(identities[0]?.listings.map((l) => l.isin)).toEqual(['INE733E01010']);
    const out = canonicalize(rows, new IdentityIndex(identities), 's');
    const bars = out.bars.get(identities[0]?.instrumentId ?? '') ?? [];
    expect(bars.map((b) => b.close)).toEqual([9790, 9790]);
    expect(bars.some((b) => b.disputed)).toBe(false);
    expect(out.conflicts).toEqual([]);
  });
});
