import { buildFixtureScenario, runReplay } from '@trading/core';
import { describe, expect, it } from 'vitest';
import { DataServiceClient } from './dataClient/client';
import type { FetchLike } from './dataClient/client';
import { readThrough } from './dataClient/readThrough';
import { formatPaise, formatPercent } from './format/rupees';
import { MemoryKv, getStamped, putStamped } from './store/kv';
import { toLedgerView } from './viewModels/ledgerView';

// Mirrors fixtures/golden/replay_scenario_v1.json; the screen must show exactly the core's report.
const GOLDEN = 'e0b425cce01d3276c53909e3af23d198a90d49d14f140fafca9a8a2be9b4b3a8';

describe('rupee formatting from integer paise', () => {
  it('groups digits the Indian way and keeps the sign', () => {
    expect(formatPaise(0)).toBe('₹0.00');
    expect(formatPaise(5)).toBe('₹0.05');
    expect(formatPaise(99_999)).toBe('₹999.99');
    expect(formatPaise(100_000)).toBe('₹1,000.00');
    expect(formatPaise(10_000_000)).toBe('₹1,00,000.00');
    expect(formatPaise(123_456_789)).toBe('₹12,34,567.89');
    expect(formatPaise(-123_456_789)).toBe('-₹12,34,567.89');
    expect(formatPaise(100_000_000_000)).toBe('₹1,00,00,00,000.00');
  });

  it('refuses a number that is not a safe integer', () => {
    expect(() => formatPaise(1.5)).toThrow(RangeError);
    expect(() => formatPaise(Number.MAX_SAFE_INTEGER + 2)).toThrow(RangeError);
  });

  it('formats a ratio to one decimal and shows a dash for none', () => {
    expect(formatPercent(0.4)).toBe('40.0%');
    expect(formatPercent(0.0666)).toBe('6.7%');
    expect(formatPercent(-0.025)).toBe('-2.5%');
    expect(formatPercent(null)).toBe('–');
  });
});

describe('ledger view model', () => {
  const s = buildFixtureScenario();
  const result = runReplay(s.snapshot, s.orders, s.config);
  const view = toLedgerView(result);

  it('carries the core report hash, so the screen is the golden replay', () => {
    expect(view.reportHash).toBe(GOLDEN);
    expect(view.snapshotId).toBe(s.snapshot.id);
  });

  it('shows every figure of the report in rupees, matching the core numbers', () => {
    const by = (label: string) => view.totals.find((r) => r.label === label)?.value;
    expect(by('Cash')).toBe(formatPaise(result.report.cashPaise));
    expect(by('Equity')).toBe(formatPaise(result.report.equityPaise));
    expect(by('Net profit')).toBe(formatPaise(result.report.netPnlPaise));
    expect(view.positions).toHaveLength(result.report.positions.length);
    const outcomeTotal = view.outcomes.reduce((n, r) => n + Number(r.value), 0);
    expect(outcomeTotal).toBe(result.outcomes.length);
    expect(view.trades.find((r) => r.label === 'Closed trades')?.value).toBe(
      String(result.summary.count),
    );
  });
});

describe('key-value store and stamped values', () => {
  it('stores, lists, deletes and reads back stamped JSON', async () => {
    const kv = new MemoryKv();
    await putStamped(kv, 'b', { n: 1 }, 1000);
    await kv.set('a', 'x');
    expect(await kv.keys()).toEqual(['a', 'b']);
    expect(await getStamped<{ n: number }>(kv, 'b')).toEqual({ savedAt: 1000, value: { n: 1 } });
    await kv.set('bad', '{not json');
    expect(await getStamped(kv, 'bad')).toBeNull();
    await kv.delete('b');
    expect(await getStamped(kv, 'b')).toBeNull();
    expect(await kv.get('missing')).toBeNull();
  });
});

const health = {
  status: 'ok',
  time: 5,
  providers: [{ provider: 'nse-bhavcopy', lastFetchAt: 1, lastStatus: 200, ok: true }],
  instruments: 5,
  snapshots: 2,
};
const reply = (body: unknown, status = 200): ReturnType<FetchLike> =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

describe('data service client', () => {
  it('returns typed data from a good response', async () => {
    const c = new DataServiceClient(() => reply(health), 'http://x');
    const r = await c.health();
    expect(r.ok && r.data.instruments).toBe(5);
  });

  it('calls the right URL', async () => {
    let seen = '';
    const c = new DataServiceClient((url) => {
      seen = url;
      return reply([]);
    }, 'http://127.0.0.1:8787');
    await c.instruments();
    expect(seen).toBe('http://127.0.0.1:8787/instruments');
  });

  it('tells apart an unreachable service, an HTTP error and a reply of the wrong shape', async () => {
    const offline = new DataServiceClient(
      () => Promise.reject(new TypeError('Failed to fetch')),
      'http://x',
    );
    expect(await offline.health()).toMatchObject({ ok: false, error: { kind: 'offline' } });
    const http = new DataServiceClient(() => reply({}, 503), 'http://x');
    expect(await http.health()).toMatchObject({ ok: false, error: { kind: 'http', status: 503 } });
    const odd = new DataServiceClient(() => reply({ status: 'ok' }), 'http://x');
    expect(await odd.health()).toMatchObject({ ok: false, error: { kind: 'shape' } });
    const broken = new DataServiceClient(
      () =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.reject(new Error('bad json')),
        }),
      'http://x',
    );
    expect(await broken.health()).toMatchObject({ ok: false, error: { kind: 'shape' } });
  });
});

describe('read-through cache (offline behaviour, NFR-6)', () => {
  it('saves a fresh answer, then serves it marked stale when the network fails', async () => {
    const kv = new MemoryKv();
    const online = new DataServiceClient(() => reply(health), 'http://x');
    const down = new DataServiceClient(() => Promise.reject(new TypeError('offline')), 'http://x');
    const first = await readThrough(kv, 'h', () => online.health(), 1000);
    expect(first).toMatchObject({ ok: true, data: { stale: false, savedAt: 1000 } });
    const second = await readThrough(kv, 'h', () => down.health(), 9000);
    expect(second).toMatchObject({ ok: true, data: { stale: true, savedAt: 1000 } });
    expect(second.ok && second.data.value.instruments).toBe(5);
  });

  it('reports failure only when there is nothing saved', async () => {
    const down = new DataServiceClient(() => Promise.reject(new TypeError('offline')), 'http://x');
    const r = await readThrough(new MemoryKv(), 'h', () => down.health(), 1);
    expect(r).toEqual({ ok: false, error: 'offline' });
  });
});
