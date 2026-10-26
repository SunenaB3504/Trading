import type { InstrumentIdentity } from '../canonical/identity';
import { createSnapshot } from '../snapshot/snapshot';
import { dateRange, fail, isDate, isResponse, ok, resolveSymbol } from './params';
import type { Lifecycle } from '../universe/lifecycle';
import type { ServiceDeps, ServiceRequest, ServiceResponse } from './types';

type Route = (deps: ServiceDeps, req: ServiceRequest) => ServiceResponse;

function health(deps: ServiceDeps): ServiceResponse {
  return ok({
    status: 'ok',
    time: deps.clock.now(),
    providers: deps.providerHealth(),
    instruments: deps.series.instruments().length,
    snapshots: deps.snapshots.list().length,
  });
}

function lifeFields(life: Lifecycle | undefined): Record<string, unknown> {
  return {
    status: life?.status ?? 'unknown',
    firstSeen: life?.firstSeen ?? null,
    lastSeen: life?.lastSeen ?? null,
  };
}

function describe(i: InstrumentIdentity, life: Lifecycle | undefined): Record<string, unknown> {
  const latest = i.listings[i.listings.length - 1];
  return {
    instrumentId: i.instrumentId,
    symbol: latest?.symbol ?? '',
    isin: latest?.isin ?? '',
    ...lifeFields(life),
  };
}

function instruments(deps: ServiceDeps): ServiceResponse {
  const lifeOf = new Map(deps.lifecycles.map((l) => [l.instrumentId, l]));
  return ok(deps.identities.map((i) => describe(i, lifeOf.get(i.instrumentId))));
}

function bars(deps: ServiceDeps, req: ServiceRequest): ServiceResponse {
  const id = resolveSymbol(deps.identities, req.query.symbol);
  const range = dateRange(req.query);
  const adj = req.query.adj ?? 'raw';
  if (isResponse(id)) return id;
  if (isResponse(range)) return range;
  if (adj !== 'raw' && adj !== 'adjusted') return fail(400, 'adj must be raw or adjusted');
  const all =
    adj === 'raw'
      ? deps.series.unadjusted(id)
      : deps.series.adjusted(id, { includeDividends: false });
  return ok(all.filter((b) => b.date >= range.from && b.date <= range.to));
}

function actions(deps: ServiceDeps, req: ServiceRequest): ServiceResponse {
  const id = resolveSymbol(deps.identities, req.query.symbol);
  const range = dateRange(req.query);
  if (isResponse(id)) return id;
  if (isResponse(range)) return range;
  return ok(
    deps.series.corporateActions(id).filter((a) => a.exDate >= range.from && a.exDate <= range.to),
  );
}

const NOT_RECORDED = {
  surveillanceList: null,
  surveillanceStage: null,
  bandPct: null,
  tradeForTrade: null,
  flags: ['surveillance_status_not_recorded'],
};

/** Band and surveillance as recorded on or before `asOf`; nulls with a flag when no source is wired in. */
function surveillanceFields(
  deps: ServiceDeps,
  symbol: string,
  asOf: string,
): Record<string, unknown> {
  if (deps.statusHistory === undefined) return NOT_RECORDED;
  const s = deps.statusHistory.statusOn(symbol, asOf);
  return {
    surveillanceList: s.surveillanceList,
    surveillanceStage: s.gsmStage ?? s.asm?.stage ?? null,
    gsmStage: s.gsmStage,
    asm: s.asm,
    asmKnown: s.asmKnown,
    bandPct: s.bandPct,
    tradeForTrade: s.tradeForTrade,
    statusSourceDate: s.sourceDate,
    flags: s.flags,
  };
}

/**
 * Listing and cessation come from price history (FR-U9). Band and surveillance come from the recorded
 * security lists and reports (WP-2.4) when a status history is supplied; otherwise they are null and
 * say so, rather than looking like "no restriction".
 */
function status(deps: ServiceDeps, req: ServiceRequest): ServiceResponse {
  const id = resolveSymbol(deps.identities, req.query.symbol);
  const asOf = req.query.asOf;
  if (isResponse(id)) return id;
  if (!isDate(asOf)) return fail(400, 'asOf must be YYYY-MM-DD');
  const life = deps.lifecycles.find((l) => l.instrumentId === id);
  if (life === undefined) return fail(404, `no lifecycle for ${id}`);
  return ok({
    instrumentId: id,
    asOf,
    listed: life.firstSeen <= asOf,
    ceased: life.status !== 'active' && life.lastSeen < asOf,
    suspended: life.gaps.some((g) => g.from < asOf && asOf < g.to),
    ...surveillanceFields(deps, req.query.symbol ?? '', asOf),
  });
}

interface SnapshotBody {
  asOf: string;
  instruments?: string[];
}

function parseSnapshotBody(
  body: unknown,
  known: ReadonlySet<string>,
): SnapshotBody | ServiceResponse {
  const raw = (body ?? {}) as { asOf?: unknown; instruments?: unknown };
  if (typeof raw.asOf !== 'string' || !isDate(raw.asOf))
    return fail(400, 'body.asOf must be YYYY-MM-DD');
  if (raw.instruments === undefined) return { asOf: raw.asOf };
  const list = raw.instruments;
  if (!Array.isArray(list) || !list.every((x) => typeof x === 'string'))
    return fail(400, 'body.instruments must be a list of instrument ids');
  const missing = (list as string[]).filter((id) => !known.has(id));
  if (missing.length > 0) return fail(404, `unknown instruments: ${missing.join(', ')}`);
  return { asOf: raw.asOf, instruments: list as string[] };
}

function createSnap(deps: ServiceDeps, req: ServiceRequest): ServiceResponse {
  const parsed = parseSnapshotBody(req.body, new Set(deps.series.instruments()));
  if (isResponse(parsed)) return parsed;
  const made = createSnapshot({
    store: deps.series,
    clock: deps.clock,
    asOf: parsed.asOf,
    ...(parsed.instruments === undefined ? {} : { instruments: parsed.instruments }),
  });
  if (made.frozen.length === 0) return fail(422, 'no bars on or before asOf');
  const stored = deps.snapshots.put({ snapshot: made.snapshot, series: made.frozen });
  return ok(stored, 201);
}

function getSnap(deps: ServiceDeps, req: ServiceRequest): ServiceResponse {
  const id = req.path.slice('/snapshots/'.length);
  const found = deps.snapshots.get(id);
  return found === undefined ? fail(404, `unknown snapshot ${id}`) : ok(found);
}

function market(deps: ServiceDeps): ServiceResponse {
  return deps.market === undefined
    ? fail(404, 'no learning market is loaded; run pnpm market:build')
    : ok(deps.market);
}

function funds(deps: ServiceDeps): ServiceResponse {
  return deps.funds === undefined
    ? fail(404, 'no fund file is loaded; run pnpm funds:build')
    : ok(deps.funds);
}

const GET: Record<string, Route> = {
  '/health': (d) => health(d),
  '/market': (d) => market(d),
  '/funds': (d) => funds(d),
  '/instruments': (d) => instruments(d),
  '/bars': bars,
  '/actions': actions,
  '/status': status,
};

/** HTTP-free request handler for the endpoints in SSD §9.2; `server.ts` puts it on a socket. */
export function createHandler(deps: ServiceDeps): (req: ServiceRequest) => ServiceResponse {
  return (req) => {
    if (req.method === 'POST' && req.path === '/snapshots') return createSnap(deps, req);
    if (req.method === 'GET' && req.path.startsWith('/snapshots/')) return getSnap(deps, req);
    const route = GET[req.path];
    if (route === undefined) return fail(404, `no such endpoint ${req.path}`);
    if (req.method !== 'GET') return fail(405, 'method not allowed');
    return route(deps, req);
  };
}
