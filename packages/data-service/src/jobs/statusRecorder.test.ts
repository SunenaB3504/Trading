import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRng } from '@trading/core';
import { describe, expect, it } from 'vitest';
import {
  ASM_URL,
  GSM_URL,
  HOME_URL,
  MemoryRawStore,
  RateLimiter,
  cookieHeader,
  loadHistory,
  recordDailyStatus,
  reportDate,
  secListUrl,
} from '../index';
import type { FetchDeps, HttpClient, HttpResponse } from '../index';

// Responses are the real files recorded from NSE on 2026-10-17 (fixtures/providers), served by a fake
// client that behaves like NSE: the reports are refused without the cookie the home page sets.
const fixture = (name: string): string =>
  readFileSync(join(process.cwd(), 'fixtures', 'providers', name), 'utf8');
const SEC_LIST = fixture('sec_list_2026-10-16_subset.csv');
const ASM = fixture('nse_report_asm_2026-10-16_subset.json');
const GSM = fixture('nse_report_gsm_2026-10-16_subset.json');
const COOKIES = 'nsit=abc; Path=/; HttpOnly\nnseappid=xyz; Path=/';

const ok = (text: string, headers: Record<string, string> = {}): HttpResponse => ({
  status: 200,
  body: new TextEncoder().encode(text),
  headers,
});
const status = (code: number): HttpResponse => ({
  status: code,
  body: new Uint8Array(),
  headers: {},
});

interface Call {
  url: string;
  headers: Record<string, string>;
}

function fakeNse(over: { secListDate?: string; asmStatus?: number } = {}): {
  client: HttpClient;
  calls: Call[];
} {
  const calls: Call[] = [];
  const secDate = over.secListDate ?? '2026-10-16';
  const client: HttpClient = {
    get(url, headers = {}) {
      calls.push({ url, headers });
      if (url === HOME_URL)
        return Promise.resolve({ ...status(403), headers: { 'set-cookie': COOKIES } });
      if (url === secListUrl(secDate)) return Promise.resolve(ok(SEC_LIST));
      const cookieOk = (headers.Cookie ?? '').includes('nsit=abc');
      if (url === ASM_URL)
        return Promise.resolve(
          cookieOk ? (over.asmStatus ? status(over.asmStatus) : ok(ASM)) : status(403),
        );
      if (url === GSM_URL) return Promise.resolve(cookieOk ? ok(GSM) : status(403));
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
    limiter: new RateLimiter(10, () => now, sleep),
    now: () => now,
    retry: {
      maxAttempts: 2,
      baseDelayMs: 5,
      factor: 2,
      maxDelayMs: 50,
      jitter: 0,
      sleep,
      rng: createRng('rec'),
    },
  };
}

describe("recording the day's band and surveillance lists (WP-2.9)", () => {
  it('stores the security list and both reports, sending the cookie the home page set', async () => {
    const { client, calls } = fakeNse();
    const out = await recordDailyStatus('2026-10-16', deps(client));
    expect(out).toMatchObject({
      date: '2026-10-16',
      stored: ['sec_list', 'asm', 'gsm'],
      problems: [],
    });
    expect(out.records.map((r) => r.urlClass)).toEqual([
      'nse-sec-list',
      'nse-asm-report',
      'nse-gsm-report',
    ]);
    expect(
      out.records.every((r) => r.params.date === '2026-10-16' && r.provider === 'nse-status'),
    ).toBe(true);
    const asmCall = calls.find((c) => c.url === ASM_URL);
    expect(asmCall?.headers.Cookie).toBe('nsit=abc; nseappid=xyz');
    expect(asmCall?.headers.Referer).toBe(HOME_URL);
  });

  it('rebuilds the status history from the stored records: band, GSM and, for the first time, ASM', async () => {
    const { client } = fakeNse();
    const d = deps(client);
    await recordDailyStatus('2026-10-16', d);
    const history = await loadHistory(d.store);
    expect(history.statusOn('RELIANCE', '2026-10-16')).toMatchObject({
      inSecurityList: true,
      bandPct: null,
      asmKnown: true,
    });
    const asmName = JSON.parse(ASM).longterm.data[0].symbol as string;
    expect(history.statusOn(asmName, '2026-10-16')).toMatchObject({
      asmKnown: true,
      surveillanceList: expect.stringMatching(/asm|gsm/),
    });
    expect(history.statusOn(asmName, '2026-10-16').asm).not.toBeNull();
    const gsmName = JSON.parse(GSM)[0].symbol as string;
    expect(history.statusOn(gsmName, '2026-10-16').gsmStage).not.toBeNull();
  });

  it('gives the same history when the day is recorded twice (raw bodies are de-duplicated)', async () => {
    const { client } = fakeNse();
    const d = deps(client);
    const a = await recordDailyStatus('2026-10-16', d);
    const b = await recordDailyStatus('2026-10-16', d);
    expect(b.records.map((r) => r.checksum)).toEqual(a.records.map((r) => r.checksum));
    const history = await loadHistory(d.store);
    expect(history.statusOn('RELIANCE', '2026-10-16').inSecurityList).toBe(true);
  });

  it('records a closed day as a plain note, not an error', async () => {
    const { client } = fakeNse({ secListDate: '2026-10-20' }); // no list for the 16th
    const out = await recordDailyStatus('2026-10-16', deps(client));
    expect(out.stored).not.toContain('sec_list');
    expect(out.problems.join(' ')).toMatch(/no security list for this date \(market closed\?\)/);
    expect(out.stored).toEqual(['asm', 'gsm']);
  });

  it("does not file a report dated another day under today's date", async () => {
    const { client } = fakeNse({ secListDate: '2026-10-17' });
    const d = deps(client);
    const out = await recordDailyStatus('2026-10-17', d);
    expect(out.stored).toEqual(['sec_list']);
    expect(out.problems.join(' ')).toMatch(/ASM report is dated 2026-10-16, not 2026-10-17/);
    expect(out.problems.join(' ')).toMatch(/GSM report is dated 2026-10-16, not 2026-10-17/);
    const history = await loadHistory(d.store);
    expect(history.statusOn('RELIANCE', '2026-10-17').asmKnown).toBe(false);
  });

  it('carries on when one report fails and says which', async () => {
    const { client } = fakeNse({ asmStatus: 403 });
    const out = await recordDailyStatus('2026-10-16', deps(client));
    expect(out.stored).toEqual(['sec_list', 'gsm']);
    expect(out.problems.join(' ')).toMatch(/ASM report not recorded: .*403/);
  });
});

describe('helpers', () => {
  it('builds a Cookie header from Set-Cookie lines and ignores attributes and junk', () => {
    expect(cookieHeader(COOKIES)).toBe('nsit=abc; nseappid=xyz');
    expect(cookieHeader('a=1; Expires=Wed, 21 Oct 2026 07:28:00 GMT')).toBe('a=1');
    expect(cookieHeader(undefined)).toBe('');
    expect(cookieHeader('HttpOnly')).toBe('');
  });

  it('reads NSE report dates', () => {
    expect(reportDate('16-Oct-2026')).toBe('2026-10-16');
    expect(reportDate('6-Jan-2027 08:08:02')).toBe('2027-01-06');
    expect(reportDate('2026-10-16')).toBeNull();
    expect(reportDate(undefined)).toBeNull();
  });

  it('skips records that are not status files', async () => {
    const store = new MemoryRawStore();
    await store.put(
      {
        provider: 'nse-bhavcopy',
        urlClass: 'bhavcopy-udiff',
        url: 'u',
        params: { date: '2026-10-16' },
        fetchedAt: 1,
        status: 200,
      },
      new TextEncoder().encode('x'),
    );
    await store.put(
      {
        provider: 'nse-status',
        urlClass: 'nse-sec-list',
        url: 'u',
        params: {},
        fetchedAt: 1,
        status: 200,
      },
      new TextEncoder().encode(SEC_LIST),
    );
    const history = await loadHistory(store);
    expect(history.statusOn('RELIANCE', '2026-10-16').inSecurityList).toBeNull();
  });
});
