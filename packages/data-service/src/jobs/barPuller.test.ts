import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { createRng } from '@trading/core';
import { describe, expect, it } from 'vitest';
import {
  IdentityIndex,
  MemoryRawStore,
  RateLimiter,
  bhavcopyUrl,
  buildIdentities,
  loadActions,
  loadBars,
  prZipUrl,
  pullRange,
  toCorporateActions,
  unzipAll,
  unzipFirst,
  weekdays,
} from '../index';
import type { FetchDeps, HttpClient, HttpResponse } from '../index';

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);
const fixture = (name: string): string =>
  readFileSync(join(process.cwd(), 'fixtures', 'providers', name), 'utf8');

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** A minimal .zip writer for tests: deflated or stored entries, central directory, no checksums. */
function makeZip(entries: Array<{ name: string; text: string; store?: boolean }>): Uint8Array {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const e of entries) {
    const raw = enc(e.text);
    const data = e.store === true ? raw : new Uint8Array(deflateRawSync(raw));
    const name = enc(e.name);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(8, e.store === true ? 0 : 8, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, raw.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    const cd = new Uint8Array(46 + name.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(10, e.store === true ? 0 : 8, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, raw.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    cd.set(name, 46);
    parts.push(local, data);
    central.push(cd);
    offset += local.length + data.length;
  }
  const cdSize = central.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  return concat([...parts, ...central, end]);
}

describe('reading zip archives with several files', () => {
  it('returns every entry, stored or deflated, with its name', () => {
    const zip = makeZip([
      { name: 'bc251024.csv', text: 'a,b\n1,2\n' },
      { name: 'mcap25102024.csv', text: 'x'.repeat(5000) },
      { name: 'readme.txt', text: 'hello', store: true },
    ]);
    const all = unzipAll(zip);
    expect(all.map((e) => e.name)).toEqual(['bc251024.csv', 'mcap25102024.csv', 'readme.txt']);
    expect(new TextDecoder().decode(all[2]?.data)).toBe('hello');
    expect(all[1]?.data.length).toBe(5000);
    expect(unzipFirst(zip).name).toBe('bc251024.csv');
  });

  it('still reads the real one-file bhavcopy archive recorded from NSE', () => {
    const real = new Uint8Array(
      readFileSync(
        join(
          process.cwd(),
          'fixtures',
          'providers',
          'nse_bhavcopy_udiff_2025-10-16_subset.csv.zip',
        ),
      ),
    );
    expect(unzipAll(real)).toHaveLength(1);
  });

  it('refuses a file that is not an archive', () => {
    expect(() => unzipAll(enc('not a zip at all, just text of some length here'))).toThrow(
      /not a zip/,
    );
  });
});

// A fake NSE: bhavcopy and PR zips for the dates it knows, 404 for others.
const UDIFF = fixture('nse_bhavcopy_udiff_2025-10-16_subset.csv');
const BC = fixture('nse_pr_bc_2024-10-25.csv');
const ok = (body: Uint8Array): HttpResponse => ({ status: 200, body, headers: {} });
const status = (code: number): HttpResponse => ({
  status: code,
  body: new Uint8Array(),
  headers: {},
});

function fakeNse(opts: { missingPr?: string[]; failBhav?: string[] } = {}): {
  client: HttpClient;
  calls: string[];
} {
  const calls: string[] = [];
  const bhavZip = makeZip([{ name: 'BhavCopy.csv', text: UDIFF }]);
  const prZip = makeZip([
    { name: 'bc251024.csv', text: BC },
    { name: 'bh251024.csv', text: 'SYMBOL,SERIES,SECURITY,HIGH/LOW\n' },
  ]);
  const client: HttpClient = {
    get(url) {
      calls.push(url);
      const date = /(\d{4})(\d{2})(\d{2})_F_0000/.exec(url);
      const prDate = /PR(\d{2})(\d{2})(\d{2})\.zip/.exec(url);
      if (date !== null) {
        const iso = `${date[1]}-${date[2]}-${date[3]}`;
        return Promise.resolve(opts.failBhav?.includes(iso) === true ? status(500) : ok(bhavZip));
      }
      if (prDate !== null) {
        const iso = `20${prDate[3]}-${prDate[2]}-${prDate[1]}`;
        return Promise.resolve(opts.missingPr?.includes(iso) === true ? status(404) : ok(prZip));
      }
      return Promise.resolve(status(404));
    },
  };
  return { client, calls };
}

function deps(
  client: HttpClient,
  store = new MemoryRawStore(),
): FetchDeps & { store: MemoryRawStore } {
  let now = 1_000;
  const sleep = (ms: number): Promise<void> => {
    now += ms;
    return Promise.resolve();
  };
  return {
    client,
    store,
    limiter: new RateLimiter(5, () => now, sleep),
    now: () => now,
    retry: {
      maxAttempts: 2,
      baseDelayMs: 5,
      factor: 2,
      maxDelayMs: 50,
      jitter: 0,
      sleep,
      rng: createRng('pull'),
    },
  };
}

describe('which dates the pull asks for', () => {
  it('asks for every weekday, including years the trading calendar does not cover', () => {
    expect(weekdays('2018-01-01', '2018-01-07')).toEqual([
      '2018-01-01',
      '2018-01-02',
      '2018-01-03',
      '2018-01-04',
      '2018-01-05',
    ]);
    expect(weekdays('2024-10-25', '2024-10-28')).toEqual(['2024-10-25', '2024-10-28']);
    expect(weekdays('2024-10-26', '2024-10-27')).toEqual([]);
  });
});

describe('pulling a range of sessions (WP-2.9)', () => {
  it('stores the bhavcopy and the PR archive for every session, and skips what it already has', async () => {
    const { client, calls } = fakeNse();
    const d = deps(client);
    const first = await pullRange('2024-10-24', '2024-10-28', d); // Thursday, Friday, Monday (weekend skipped)
    expect(first.map((s) => [s.date, s.bhavcopy, s.pr])).toEqual([
      ['2024-10-24', 'stored', 'stored'],
      ['2024-10-25', 'stored', 'stored'],
      ['2024-10-28', 'stored', 'stored'],
    ]);
    expect(calls).toHaveLength(6);
    const again = await pullRange('2024-10-24', '2024-10-28', d);
    expect(again.every((s) => s.bhavcopy === 'have' && s.pr === 'have')).toBe(true);
    expect(calls).toHaveLength(6); // nothing fetched the second time
  });

  it('uses the right file for the date: PR zip and the UDiFF or legacy bhavcopy', async () => {
    const { client, calls } = fakeNse();
    await pullRange('2024-07-05', '2024-07-08', deps(client));
    expect(calls).toContain(bhavcopyUrl('2024-07-05', 'legacy'));
    expect(calls).toContain(bhavcopyUrl('2024-07-08', 'udiff'));
    expect(calls).toContain(prZipUrl('2024-07-05'));
  });

  it('notes a missing file without calling it an error, and carries on past a failing day', async () => {
    const { client } = fakeNse({ missingPr: ['2024-10-25'], failBhav: ['2024-10-28'] });
    const out = await pullRange('2024-10-24', '2024-10-28', deps(client));
    const by = Object.fromEntries(out.map((s) => [s.date, s]));
    expect(by['2024-10-25']).toMatchObject({ bhavcopy: 'stored', pr: 'none', problems: [] });
    expect(by['2024-10-28']).toMatchObject({ bhavcopy: 'failed', pr: 'stored' });
    expect(by['2024-10-28']?.problems[0]).toMatch(/bhavcopy-udiff 2024-10-28/);
    expect(by['2024-10-24']?.bhavcopy).toBe('stored');
  });

  it('retries a day that failed when the pull is run again', async () => {
    const store = new MemoryRawStore();
    await pullRange(
      '2024-10-28',
      '2024-10-28',
      deps(fakeNse({ failBhav: ['2024-10-28'] }).client, store),
    );
    const retry = await pullRange('2024-10-28', '2024-10-28', deps(fakeNse().client, store));
    expect(retry[0]).toMatchObject({ bhavcopy: 'stored', pr: 'have' });
  });
});

describe('reading the archive back', () => {
  it('returns the price rows of the sessions in the range, once per session', async () => {
    const d = deps(fakeNse().client);
    await pullRange('2024-10-24', '2024-10-28', d);
    const some = await loadBars(d.store, '2024-10-25', '2024-10-28');
    const all = await loadBars(d.store, '2024-10-01', '2024-10-31');
    expect(some.length).toBe((all.length / 3) * 2);
    expect(all.length % 3).toBe(0);
    expect(all.some((r) => r.symbol === 'RELIANCE')).toBe(true);
  });

  it('merges the corporate actions of all archived days into one list, with the Reliance bonus once', async () => {
    const d = deps(fakeNse().client);
    await pullRange('2024-10-24', '2024-10-28', d);
    const actions = await loadActions(d.store);
    const bonus = actions.filter((a) => a.symbol === 'RELIANCE' && a.type === 'bonus');
    expect(bonus).toHaveLength(1);
    expect(bonus[0]).toMatchObject({
      exDate: '2024-10-28',
      ratio: { numerator: 2, denominator: 1 },
    });
    const ids = new Map<string, string>([['RELIANCE', 'RELIANCE:INE002A01018']]);
    const converted = toCorporateActions(actions, (s) => ids.get(s));
    expect(converted.actions.map((a) => a.id)).toEqual(['RELIANCE-bonus-2024-10-28']);
  });

  it('builds instruments from the stored prices', async () => {
    const d = deps(fakeNse().client);
    await pullRange('2024-10-25', '2024-10-25', d);
    const identities = buildIdentities(await loadBars(d.store, '2024-10-25', '2024-10-25'));
    expect(identities.length).toBeGreaterThan(5);
    expect(new IdentityIndex(identities).idFor('RELIANCE', '2025-10-16')).toBeDefined();
  });
});
