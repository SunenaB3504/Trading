import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BUCKET_RULES_V1, assignBucket } from '@trading/core';
import { describe, expect, it } from 'vitest';
import {
  AMFI_MAX_AGE_DAYS,
  AmfiRanks,
  ProviderError,
  StatusHistory,
  betaOf,
  buildBucketInputs,
  indexCloseAllUrl,
  parseAmfiCsv,
  parseIndexCloseAll,
  parseMcapFile,
  parseSectorTable,
  prZipUrl,
  volatilityOf,
} from '../index';
import type { DatedClose, InstrumentFeed } from '../index';

const root = process.cwd();
const fixture = (name: string): string =>
  readFileSync(join(root, 'fixtures', 'providers', name), 'utf8');

describe('NSE daily market cap file (real rows)', () => {
  const day = (name: string) => parseMcapFile(fixture(name)).rows;
  const rel = (rows: ReturnType<typeof day>) => rows.find((r) => r.symbol === 'RELIANCE');

  it('reads shares outstanding, close and market cap, and they agree to the rupee-paise rounding', () => {
    const rows = day('nse_pr_mcap_2024-10-25_subset.csv');
    expect(rows).toHaveLength(10);
    expect(rel(rows)).toMatchObject({
      date: '2024-10-25',
      series: 'EQ',
      sharesOutstanding: 6_765_817_114,
      closePaise: 265_570,
    });
    for (const r of rows) {
      const computed = r.sharesOutstanding * (r.closePaise / 100);
      expect(Math.abs(computed - r.marketCapRupees) / r.marketCapRupees, r.symbol).toBeLessThan(
        1e-3, // NSE's figure uses the unrounded price
      );
    }
  });

  it('shows the 1:1 bonus as a doubled share count on the ex-date, so market cap stays continuous', () => {
    const before = rel(day('nse_pr_mcap_2024-10-25_subset.csv'));
    const after = rel(day('nse_pr_mcap_2024-10-28_subset.csv'));
    expect(after?.sharesOutstanding).toBe(13_531_634_228);
    expect((after?.sharesOutstanding ?? 0) / (before?.sharesOutstanding ?? 1)).toBeCloseTo(2, 3);
    const change = (after?.marketCapRupees ?? 0) / (before?.marketCapRupees ?? 1) - 1;
    expect(Math.abs(change)).toBeLessThan(0.01);
  });

  it('refuses a file with another header and builds the archive URLs', () => {
    expect(() => parseMcapFile('a,b\n1,2\n')).toThrow(ProviderError);
    expect(prZipUrl('2024-10-25')).toBe(
      'https://nsearchives.nseindia.com/archives/equities/bhavcopy/pr/PR251024.zip',
    );
    expect(indexCloseAllUrl('2025-10-16')).toBe(
      'https://nsearchives.nseindia.com/content/indices/ind_close_all_16102025.csv',
    );
  });
});

describe('index closes', () => {
  it('reads Nifty 50 and the other indices from the real file', () => {
    const rows = parseIndexCloseAll(fixture('nse_ind_close_all_2025-10-16_subset.csv'));
    expect(rows.find((r) => r.indexName === 'Nifty 50')).toEqual({
      indexName: 'Nifty 50',
      date: '2025-10-16',
      close: 25585.3,
    });
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(() => parseIndexCloseAll('x,y\n1,2\n')).toThrow(ProviderError);
  });
});

describe('AMFI ranks (parsed from the real PDFs)', () => {
  const load = (period: string) =>
    parseAmfiCsv(
      period,
      readFileSync(join(root, 'data', 'amfi', `avg_mcap_${period}.csv`), 'utf8'),
    );
  const h2 = load('2018H2');
  const h1 = load('2019H1');

  it('has contiguous ranks, ISINs and the SEBI cut-offs at 100 and 250', () => {
    expect(h1.periodEnd).toBe('2019-06-30');
    expect(h1.usableFrom).toBe('2019-07-31');
    expect(h1.rows.length).toBeGreaterThan(4900);
    expect(h1.rows.slice(0, 300).map((r) => r.rank)).toEqual(
      Array.from({ length: 300 }, (_, i) => i + 1),
    );
    expect(h1.rows[0]).toMatchObject({
      name: expect.stringMatching(/RELIANCE/i),
      isin: 'INE002A01018',
    });
    expect(h1.rows[99]?.category).toBe('Large Cap');
    expect(h1.rows[100]?.category).toBe('Mid Cap');
    expect(h1.rows[249]?.category).toBe('Mid Cap');
    expect(h1.rows[250]?.category).toBe('Small Cap');
    // wrapped company names corrupt a few ISIN cells in the PDF; those rows keep their symbols
    const keyed = h1.rows.filter(
      (r) => /^IN[EF]/.test(r.isin) || r.nseSymbol !== '' || r.bseSymbol !== '',
    );
    expect(keyed.length / h1.rows.length).toBeGreaterThan(0.99);
  });

  it('uses the newest usable list and none that is too old or not yet published', () => {
    const ranks = new AmfiRanks([h1, h2]);
    const reliance = (l: typeof h1) => l.rows.find((r) => r.isin === 'INE002A01018')?.rank;
    expect(ranks.rankOn('INE002A01018', '2019-07-30')).toBe(reliance(h2)); // still the 2018H2 list
    expect(ranks.rankOn('INE002A01018', '2019-08-01')).toBe(reliance(h1));
    expect(ranks.listOn('2019-07-30')?.period).toBe('2018H2');
    expect(ranks.listOn('2019-07-31')?.period).toBe('2019H1');
    expect(ranks.listOn('2018-07-01')).toBeNull(); // before the first list is usable
    expect(ranks.listOn('2020-02-06')?.period).toBe('2019H1'); // 190 days after 2019-07-31
    expect(ranks.listOn('2020-02-07')).toBeNull(); // a gap in the lists shows as unknown, not stale
    expect(AMFI_MAX_AGE_DAYS).toBe(190);
    expect(ranks.rankOn('INE000000000', '2019-08-01')).toBeNull();
    // a row whose ISIN could not be read is found by its symbol
    const noIsin = parseAmfiCsv(
      '2019H1',
      'rank,name,isin,bse_symbol,nse_symbol,avg_mcap_cr,category\n30,POWER GRID,,POWERGRID,POWERGRID,98530.24,Large Cap\n',
    );
    expect(new AmfiRanks([noIsin]).rankOn('INE752E01010', '2019-08-01', 'POWERGRID')).toBe(30);
    expect(new AmfiRanks([noIsin]).rankOn('INE752E01010', '2019-08-01')).toBeNull();
  });
});

describe('sector table', () => {
  it('loads the registered table with a stable hash and rejects duplicates', () => {
    const t = parseSectorTable(
      readFileSync(join(root, 'data', 'sector', 'sector_tags_v1.csv'), 'utf8'),
    );
    expect(t.sectors.get('HAL')).toBe('defence_aerospace');
    expect(t.sectors.get('BALRAMCHIN')).toBe('sugar_distilleries');
    expect(t.hash).toMatch(/^[0-9a-f]{64}$/);
    const sectorsUsed = new Set(t.sectors.values());
    for (const s of [...BUCKET_RULES_V1.cyclicalsSectors, ...BUCKET_RULES_V1.mundaneSectors])
      expect(sectorsUsed.has(s), s).toBe(true);
    expect(() => parseSectorTable('symbol,sector\nA,x\nA,y\n')).toThrow(/duplicate/);
    expect(() => parseSectorTable('a,b\n')).toThrow(ProviderError);
  });
});

// Deterministic closes: a market series, and stocks that move with it by a chosen multiple.
const dates = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(2023, 0, 2) + i * 86_400_000);
    return d.toISOString().slice(0, 10);
  });
const DAYS = dates(320);
const wiggle = (i: number): number => Math.sin(i * 1.3) * 0.01 + Math.cos(i * 0.7) * 0.006;
function series(multiple: number, noise = 0): DatedClose[] {
  let c = 100;
  return DAYS.map((date, i) => {
    c *= 1 + multiple * wiggle(i) + noise * Math.sin(i * 2.9);
    return { date, close: c };
  });
}
const market = series(1);

describe('volatility and beta from closes, point in time', () => {
  it('finds a beta of 2 for a stock that moves twice the market, using only earlier dates', () => {
    const stock = series(2);
    expect(betaOf(stock, market, '2023-11-01', 252)).toBeCloseTo(2, 6);
    const spoiled = stock.map((c) => (c.date >= '2023-11-01' ? { ...c, close: c.close * 5 } : c));
    expect(betaOf(spoiled, market, '2023-11-01', 252)).toBeCloseTo(2, 6); // later data cannot change it
    expect(betaOf(stock, market, '2023-02-01', 252)).toBeNull(); // too little history
  });

  it('is larger for the more volatile series and null without a full lookback', () => {
    const calm = volatilityOf(series(1), '2023-11-01', 252) as number;
    const wild = volatilityOf(series(3), '2023-11-01', 252) as number;
    expect(wild / calm).toBeCloseTo(3, 1);
    expect(volatilityOf(series(1), '2023-03-01', 252)).toBeNull();
  });
});

describe('bucket inputs for a pool of names', () => {
  const csv = (rows: Array<[number, string]>): string =>
    'rank,name,isin,bse_symbol,nse_symbol,avg_mcap_cr,category\n' +
    rows.map(([rank, isin]) => `${rank},N${rank},${isin},S${rank},S${rank},1000,Cap`).join('\n') +
    '\n';
  const isin = (n: number): string => `INE${String(n).padStart(6, '0')}01018`;
  const ranks = new AmfiRanks([
    parseAmfiCsv(
      '2023H1',
      csv([
        [1, isin(1)],
        [2, isin(2)],
        [3, isin(3)],
        [4, isin(4)],
        [5, isin(5)],
        [6, isin(6)],
        [300, isin(300)],
        [301, isin(301)],
        [302, isin(302)],
        [303, isin(303)],
        [150, isin(150)],
      ]),
    ),
  ]);
  const feed = (n: number, multiple: number): InstrumentFeed => ({
    instrumentId: `I${n}`,
    isin: isin(n),
    symbol: `S${n}`,
    closes: series(multiple, 0.002 * n),
  });
  const feeds = [
    feed(1, 1),
    feed(2, 2),
    feed(3, 3),
    feed(4, 4),
    feed(5, 5),
    feed(6, 6),
    feed(300, 1),
    feed(301, 2),
    feed(302, 3),
    feed(303, 4),
    feed(150, 1),
  ];
  const status = new StatusHistory();
  const sectors = new Map([['S2', 'fertilisers']]);
  const inputs = buildBucketInputs(feeds, {
    asOf: '2023-11-01',
    market,
    amfi: ranks,
    status,
    sectors,
  });
  const by = (n: number) => inputs.find((i) => i.instrumentId === `I${n}`);

  it('flags the lowest-volatility third of each size group and nothing for mid caps', () => {
    expect(by(1)?.lowVolatility).toBe(true);
    expect(by(2)?.lowVolatility).toBe(true);
    expect(by(3)?.lowVolatility).toBe(false);
    expect(by(6)?.lowVolatility).toBe(false);
    expect(by(300)?.lowVolatility).toBe(true);
    expect(by(303)?.lowVolatility).toBe(false);
    expect(by(150)?.lowVolatility).toBe(false); // mid cap
  });

  it('carries rank, sector, beta and the unknown surveillance status, and feeds the rules', () => {
    expect(by(1)).toMatchObject({
      amfiRank: 1,
      sector: null,
      asmKnown: false,
      gsmStage: null,
      bandPct: null,
    });
    expect(by(2)?.sector).toBe('fertilisers');
    expect(by(2)?.beta).toBeGreaterThan(1.5);
    const results = Object.fromEntries(inputs.map((i) => [i.instrumentId, assignBucket(i)]));
    expect(results.I1?.bucket).toBe('steady');
    expect(results.I2?.bucket).toBe('speculative'); // beta above 1.5 wins over sector and size
    expect(results.I300?.bucket).toBe('underdogs');
    expect(results.I150?.bucket).toBeNull();
    expect(results.I1?.partial).toEqual(['band_unknown', 'asm_unknown', 'sector_unknown']);
  });

  it('gives no size facts before the first AMFI list is usable', () => {
    const early = buildBucketInputs(feeds, {
      asOf: '2022-03-01',
      market,
      amfi: ranks,
      status,
      sectors,
    });
    expect(early.every((i) => i.amfiRank === null && i.lowVolatility === null)).toBe(true);
  });
});
