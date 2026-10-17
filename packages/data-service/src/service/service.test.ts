import type { AddressInfo } from 'node:net';
import { FixedClock } from '@trading/core';
import type { BarUnadj } from '@trading/core';
import { describe, expect, it } from 'vitest';
import { SnapshotStore, createHandler, startServer } from '../index';
import type { ServiceDeps, ServiceRequest } from '../index';
import { buildFixture, identities, idOf } from '../snapshot/testFixture';

const fixture = buildFixture();
const deps = (): ServiceDeps => ({
  series: fixture.store,
  snapshots: new SnapshotStore(),
  clock: new FixedClock(1_760_000_000_000),
  identities,
  lifecycles: fixture.lifecycles,
  providerHealth: () => [{ provider: 'nse-bhavcopy', lastFetchAt: 1, lastStatus: 200, ok: true }],
});
const get = (path: string, query: Record<string, string> = {}): ServiceRequest => ({
  method: 'GET',
  path,
  query,
});
const post = (body: unknown): ServiceRequest => ({
  method: 'POST',
  path: '/snapshots',
  query: {},
  body,
});

describe('data service endpoints (SSD §9.2)', () => {
  it('reports provider status and counts on /health', () => {
    const r = createHandler(deps())(get('/health'));
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      status: 'ok',
      time: 1_760_000_000_000,
      instruments: 5,
      snapshots: 0,
      providers: [{ provider: 'nse-bhavcopy', ok: true }],
    });
  });

  it('lists instruments with their lifecycle status', () => {
    const list = createHandler(deps())(get('/instruments')).body as Array<{ symbol: string }>;
    expect(list).toHaveLength(5);
    expect(list.map((i) => i.symbol)).toContain('TATASTEEL');
  });

  it('serves raw and adjusted bars for a date range', () => {
    const h = createHandler(deps());
    const q = { symbol: 'TATASTEEL', from: '2022-07-25', to: '2022-07-29' };
    const raw = h(get('/bars', q)).body as BarUnadj[];
    const adj = h(get('/bars', { ...q, adj: 'adjusted' })).body as Array<{ close: number }>;
    expect(raw.map((b) => b.date)).toEqual([
      '2022-07-25',
      '2022-07-26',
      '2022-07-27',
      '2022-07-28',
      '2022-07-29',
    ]);
    expect(adj[0]?.close).toBeCloseTo((raw[0]?.close ?? 0) / 10, 6); // before the 10-for-1 split
    expect(adj[4]?.close).toBeCloseTo(raw[4]?.close ?? 0, 6);
  });

  it('serves corporate actions and a price-history status that admits what it cannot know', () => {
    const h = createHandler(deps());
    expect(h(get('/actions', { symbol: 'TATASTEEL' })).body).toHaveLength(1);
    expect(h(get('/actions', { symbol: 'TATASTEEL', from: '2023-01-01' })).body).toEqual([]);
    const s = h(get('/status', { symbol: 'TATASTEEL', asOf: '2022-07-27' })).body;
    expect(s).toMatchObject({
      listed: true,
      ceased: false,
      suspended: false,
      surveillanceList: null,
      bandPct: null,
      flags: ['surveillance_status_not_recorded'],
    });
    expect(h(get('/status', { symbol: 'TATASTEEL', asOf: '1999-01-01' })).body).toMatchObject({
      listed: false,
    });
  });

  it('creates a snapshot, returns the same one for the same request, and serves it frozen', () => {
    const d = deps();
    const h = createHandler(d);
    const a = h(post({ asOf: '2024-12-31' }));
    const b = h(post({ asOf: '2024-12-31' }));
    expect(a.status).toBe(201);
    const id = (a.body as { id: string }).id;
    expect((b.body as { id: string }).id).toBe(id);
    expect(d.snapshots.list()).toHaveLength(1);
    const got = h(get(`/snapshots/${id}`)).body as {
      snapshot: { status: string };
      series: unknown[];
    };
    expect(got.snapshot.status).toBe('verified');
    expect(got.series).toHaveLength(5);
    const only = h(post({ asOf: '2024-12-31', instruments: [idOf('IRCTC')] }));
    expect((only.body as { id: string }).id).not.toBe(id);
  });

  it('answers bad requests with a clear error and the right status', () => {
    const h = createHandler(deps());
    const status = (r: ServiceRequest): number => h(r).status;
    expect(status(get('/bars'))).toBe(400); // no symbol
    expect(status(get('/bars', { symbol: 'NOPE' }))).toBe(404);
    expect(status(get('/bars', { symbol: 'TATASTEEL', from: '2022-13' }))).toBe(400);
    expect(
      status(get('/bars', { symbol: 'TATASTEEL', from: '2023-01-01', to: '2022-01-01' })),
    ).toBe(400);
    expect(status(get('/bars', { symbol: 'TATASTEEL', adj: 'x' }))).toBe(400);
    expect(status(get('/status', { symbol: 'TATASTEEL' }))).toBe(400);
    expect(status(post({}))).toBe(400);
    expect(status(post({ asOf: '2024-12-31', instruments: [3] }))).toBe(400);
    expect(status(post({ asOf: '2024-12-31', instruments: ['ghost'] }))).toBe(404);
    expect(status(post({ asOf: '1990-01-01' }))).toBe(422);
    expect(status(get('/snapshots/missing'))).toBe(404);
    expect(status(get('/nothing'))).toBe(404);
    expect(status({ method: 'DELETE', path: '/bars', query: {} })).toBe(405);
  });
});

describe('the HTTP server', () => {
  it('serves over a local socket, bound to 127.0.0.1, and sends the CORS origin only when asked', async () => {
    const server = await startServer(createHandler(deps()), {
      port: 0,
      allowedOrigin: 'http://localhost:8081',
    });
    try {
      const { address, port } = server.address() as AddressInfo;
      expect(address).toBe('127.0.0.1');
      const base = `http://127.0.0.1:${port}`;
      const health = await fetch(`${base}/health`);
      expect(health.status).toBe(200);
      expect(health.headers.get('access-control-allow-origin')).toBe('http://localhost:8081');
      const made = await fetch(`${base}/snapshots`, {
        method: 'POST',
        body: JSON.stringify({ asOf: '2024-12-31' }),
      });
      expect(made.status).toBe(201);
      const id = ((await made.json()) as { id: string }).id;
      expect((await fetch(`${base}/snapshots/${id}`)).status).toBe(200);
      const bad = await fetch(`${base}/snapshots`, { method: 'POST', body: '{not json' });
      expect(bad.status).toBe(400);
    } finally {
      await new Promise((r) => server.close(r));
    }
  });
});
