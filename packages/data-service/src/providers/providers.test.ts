import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ProviderError,
  bhavcopyFormatFor,
  bhavcopyUrl,
  legacyDate,
  parseBhavcopyLegacy,
  parseBhavcopyUdiff,
  parseCsv,
  parseCsvBars,
  parseYahooChart,
  unzipFirst,
} from '../index';

// Contract tests against RECORDED responses (fetched from NSE and Yahoo on 2026-10-17); see
// fixtures/providers. The CSV fixtures are trimmed to a handful of rows, the Yahoo ones are complete.
const dir = join(process.cwd(), 'fixtures', 'providers');
const text = (name: string): string => readFileSync(join(dir, name), 'utf8');
const bytes = (name: string): Uint8Array => new Uint8Array(readFileSync(join(dir, name)));
const json = (name: string): unknown => JSON.parse(text(name));

const UDIFF = 'nse_bhavcopy_udiff_2025-10-16_subset.csv';
const LEGACY = 'nse_bhavcopy_legacy_2024-06-03_subset.csv';
const YAHOO = 'yahoo_chart_RELIANCE.NS_2025-10-09_2025-10-16.json';

describe('NSE bhavcopy, UDiFF format', () => {
  const { rows, skipped } = parseBhavcopyUdiff(text(UDIFF));
  const reliance = rows.find((r) => r.symbol === 'RELIANCE');

  it('reads every recorded row, including bonds, SME and debt series', () => {
    expect(skipped).toEqual([]);
    expect(rows).toHaveLength(16);
    expect(new Set(rows.map((r) => r.series)).size).toBeGreaterThan(8);
  });

  it('parses RELIANCE exactly, in integer paise', () => {
    expect(reliance).toEqual({
      provider: 'nse-bhavcopy',
      symbol: 'RELIANCE',
      series: 'EQ',
      isin: 'INE002A01018',
      date: '2025-10-16',
      open: 137510,
      high: 140050,
      low: 137500,
      close: 139830,
      prevClose: 137430,
      volume: 12315932,
      adjusted: false,
    });
  });

  it('can filter by series', () => {
    expect(
      parseBhavcopyUdiff(text(UDIFF), ['EQ'])
        .rows.map((r) => r.symbol)
        .sort(),
    ).toEqual(['HDFCBANK', 'INFY', 'RELIANCE', 'SUZLON', 'TCS']);
  });

  it('reports unusable rows with their line number instead of dropping them', () => {
    const lines = text(UDIFF).split('\n');
    const broken = [...lines];
    broken[2] = (lines[2] as string).replace(
      /,\d+\.\d\d,\d+\.\d\d,\d+\.\d\d,\d+\.\d\d,/,
      ',100.00,90.00,95.00,98.00,',
    );
    const r = parseBhavcopyUdiff(broken.join('\n'));
    expect(r.rows).toHaveLength(15);
    expect(r.skipped).toEqual([{ line: 3, reason: 'inconsistent open/high/low/close' }]);
  });

  it('rejects a file with the wrong header', () => {
    expect(() => parseBhavcopyUdiff('a,b,c\n1,2,3\n')).toThrow(ProviderError);
    expect(() => parseBhavcopyUdiff('')).toThrow(ProviderError);
  });
});

describe('NSE bhavcopy, legacy format', () => {
  const { rows, skipped } = parseBhavcopyLegacy(text(LEGACY));

  it('parses RELIANCE on 2024-06-03 exactly, including prices printed without decimals', () => {
    expect(skipped).toEqual([]);
    expect(rows).toHaveLength(9);
    expect(rows.find((r) => r.symbol === 'RELIANCE')).toEqual({
      provider: 'nse-bhavcopy',
      symbol: 'RELIANCE',
      series: 'EQ',
      isin: 'INE002A01018',
      date: '2024-06-03',
      open: 296600,
      high: 302900,
      low: 291800,
      close: 302065,
      prevClose: 286080,
      volume: 10763971,
      adjusted: false,
    });
  });

  it('parses one-decimal prices exactly (INFY close 1405.9)', () => {
    expect(rows.find((r) => r.symbol === 'INFY')?.close).toBe(140590);
  });

  it('converts DD-MON-YYYY dates', () => {
    expect(legacyDate('03-JUN-2024')).toBe('2024-06-03');
    expect(legacyDate('31-dec-2020')).toBe('2020-12-31');
    expect(legacyDate('3-NOV-1994')).toBe('1994-11-03');
    expect(() => legacyDate('2024-06-03')).toThrow();
    expect(() => legacyDate('03-XXX-2024')).toThrow();
  });
});

describe('bhavcopy URLs and format cut-over', () => {
  it('uses legacy files to 2024-07-05 and UDiFF from 2024-07-08 (checked against NSE on 2026-10-17)', () => {
    expect(bhavcopyFormatFor('2020-03-02')).toBe('legacy');
    expect(bhavcopyFormatFor('2024-07-05')).toBe('legacy');
    expect(bhavcopyFormatFor('2024-07-08')).toBe('udiff');
    expect(bhavcopyFormatFor('2026-10-16')).toBe('udiff');
  });

  it('builds the archive URLs', () => {
    expect(bhavcopyUrl('2025-10-16')).toBe(
      'https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_20251016_F_0000.csv.zip',
    );
    expect(bhavcopyUrl('2024-06-03')).toBe(
      'https://nsearchives.nseindia.com/content/historical/EQUITIES/2024/JUN/cm03JUN2024bhav.csv.zip',
    );
    expect(bhavcopyUrl('2024-06-03', 'udiff')).toContain('BhavCopy_NSE_CM_0_0_0_20240603_F_0000');
  });
});

describe('zip archives', () => {
  it('extracts the one CSV inside a bhavcopy archive', () => {
    const { name, data } = unzipFirst(bytes(`${UDIFF}.zip`));
    expect(name).toBe('BhavCopy_NSE_CM_0_0_0_20251016_F_0000.csv');
    expect(new TextDecoder().decode(data)).toBe(text(UDIFF));
  });

  it('refuses bytes that are not a zip', () => {
    expect(() => unzipFirst(new Uint8Array(100))).toThrow(ProviderError);
  });
});

describe('Yahoo chart', () => {
  const y = parseYahooChart(json(YAHOO));

  it('reads six sessions, dated on the IST day, flagged as adjusted', () => {
    expect(y.symbol).toBe('RELIANCE');
    expect(y.rows.map((r) => r.date)).toEqual([
      '2025-10-09',
      '2025-10-10',
      '2025-10-13',
      '2025-10-14',
      '2025-10-15',
      '2025-10-16',
    ]);
    expect(y.rows.every((r) => r.adjusted && r.provider === 'yahoo')).toBe(true);
    expect(y.skipped).toEqual([]);
  });

  it('rounds Yahoo float noise to the paise NSE printed', () => {
    expect(y.rows[0]?.close).toBe(137780); // 1377.800048828125
    expect(y.rows[0]?.low).toBe(136910); // 1369.0999755859375
  });

  it('agrees with the NSE bhavcopy for the same day, field for field', () => {
    const nse = parseBhavcopyUdiff(text(UDIFF)).rows.find((r) => r.symbol === 'RELIANCE');
    const yahoo = y.rows.find((r) => r.date === '2025-10-16');
    expect(yahoo).toMatchObject({
      open: nse?.open,
      high: nse?.high,
      low: nse?.low,
      close: nse?.close,
      volume: nse?.volume,
    });
  });

  it('reports the Reliance 1:1 bonus as a 2:1 split on the ex-date, with already-adjusted history', () => {
    const b = parseYahooChart(json('yahoo_chart_RELIANCE.NS_bonus_2024-10.json'));
    expect(b.splits).toEqual([{ date: '2024-10-28', numerator: 2, denominator: 1 }]);
    // 2024-10-25 raw close was about 2,655; Yahoo already shows it halved, so it is NOT a raw price
    expect(b.rows.find((r) => r.date === '2024-10-25')?.close).toBe(132785);
    expect(b.rows.every((r) => r.adjusted)).toBe(true);
  });

  it('treats a not-found symbol as a ProviderError and rejects other shapes', () => {
    expect(() => parseYahooChart(json('yahoo_chart_error_notfound.json'))).toThrow(/No data found/);
    try {
      parseYahooChart(json('yahoo_chart_error_notfound.json'));
    } catch (e) {
      expect(e instanceof ProviderError && e.kind).toBe('not-found');
    }
    expect(() => parseYahooChart({})).toThrow(ProviderError);
    expect(() => parseYahooChart({ chart: { result: null, error: null } })).toThrow(ProviderError);
  });

  it('skips gaps that Yahoo reports as null', () => {
    const copy = JSON.parse(text(YAHOO)) as {
      chart: { result: Array<{ indicators: { quote: Array<{ close: Array<number | null> }> } }> };
    };
    (
      copy.chart.result[0] as { indicators: { quote: Array<{ close: Array<number | null> }> } }
    ).indicators.quote[0]!.close[1] = null;
    const r = parseYahooChart(copy);
    expect(r.rows).toHaveLength(5);
    expect(r.skipped).toEqual([{ line: 1, reason: 'null price' }]);
  });
});

describe('generic CSV import', () => {
  const mapping = {
    columns: {
      date: 'Date',
      open: 'Open',
      high: 'High',
      low: 'Low',
      close: 'Close',
      volume: 'Volume',
    },
    defaultSymbol: 'TEST',
    dateFormat: 'DD-MM-YYYY' as const,
    adjusted: false,
  };

  it('reads a file with another layout and skips bad rows with a reason', () => {
    const csv =
      'Date,Open,High,Low,Close,Volume\n02-01-2025,100.5,102,99.25,101,1000\n03-01-2025,100,99,98,99,50\n04-01-2025,abc,1,1,1,1\n';
    const r = parseCsvBars(csv, mapping);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({
      symbol: 'TEST',
      date: '2025-01-02',
      open: 10050,
      low: 9925,
      volume: 1000,
    });
    expect(r.skipped.map((s) => s.line)).toEqual([3, 4]);
  });

  it('rejects a file missing a mapped column', () => {
    expect(() => parseCsvBars('Date,Open\n1,2\n', mapping)).toThrow(ProviderError);
  });
});

describe('CSV reader', () => {
  it('handles quotes, doubled quotes, CRLF, blank lines and trailing commas', () => {
    expect(parseCsv('a,"b,c","d""e"\r\n\r\nx,y,\n')).toEqual([
      ['a', 'b,c', 'd"e'],
      ['x', 'y', ''],
    ]);
    expect(parseCsv('')).toEqual([]);
    expect(parseCsv('last,row')).toEqual([['last', 'row']]);
  });
});

describe('NSE bhavcopy, legacy format before ISINs were published', () => {
  const old = [
    'SYMBOL,SERIES,OPEN,HIGH,LOW,CLOSE,LAST,PREVCLOSE,TOTTRDQTY,TOTTRDVAL,TIMESTAMP,',
    'RELIANCE,EQ,360,364,356.75,361.25,360.5,361.5,66900,24149512.5,15-NOV-1994,',
  ].join('\n');

  it('reads a 1994 row with no ISIN column and gives it a null ISIN', () => {
    const { rows, skipped } = parseBhavcopyLegacy(old);
    expect(skipped).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      symbol: 'RELIANCE',
      series: 'EQ',
      isin: null,
      date: '1994-11-15',
      close: 36125,
      volume: 66900,
    });
  });

  it('still requires the ISIN column in the UDiFF format', () => {
    expect(() => parseBhavcopyUdiff('TckrSymb,SctySrs\nX,EQ')).toThrow();
  });
});
