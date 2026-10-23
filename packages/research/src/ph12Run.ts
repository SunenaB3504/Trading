import { readFileSync } from 'node:fs';
import { PH12_ID, freezeConventions, listingStar, ph12Overlay } from '@trading/astro-engine';
import { addDays, overlayRun, sessionOn, sha256Hex, tradingDaysBetween } from '@trading/core';
import type { FrozenRunConfig, HypothesisSpec, Registry } from '@trading/core';
import { loadRegistry, loadUniverseSeries } from '@trading/data-service';
import { H21_WINDOW } from './h21Run';
import type { FrozenUniverseFile } from './h21Run';
import { buildPh12Grid } from './ph12Grid';
import type { Ph12Grid, Ph12Member } from './ph12Grid';

/**
 * Everything the PH-12 run needs, assembled from frozen files: the universe-v2 members that have an official BSE
 * listing date, their adjusted bars, the first-trade star of each, the registered PH-12 and the run settings.
 * Preparing never looks at returns; executing the evaluation is a separate step.
 */
export const PH12_PATHS = {
  frozen: 'data/frozen/universe_v2.json',
  listing: 'data/names/universe_v2_listing.csv',
  registry: 'data/registry/experiments.json',
  raw: 'data/raw/nse-bars',
  report: 'data/reports/ph12_run_1.json',
} as const;

/** Same window and horizon as H-21. */
export const PH12_WINDOW = H21_WINDOW;

export interface ListingRow {
  instrumentId: string;
  symbol: string;
  listingDate: string;
}

export function parseListing(text: string): ListingRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  return lines.slice(1).map((l) => {
    const c = l.split(',');
    return { instrumentId: c[0] as string, symbol: c[1] as string, listingDate: c[4] as string };
  });
}

export const listingFileHash = (paths = PH12_PATHS): string =>
  sha256Hex(readFileSync(paths.listing, 'utf8').replace(/\r\n/g, '\n'));

/**
 * The settings of the one frozen run, written down before it is run. The signal is a fixed label on each company,
 * so the shifted-ephemeris placebo cannot work; the relabelling placebo gates the verdict instead.
 */
export function ph12RunConfig(now: number): FrozenRunConfig {
  const periods = [19, 252];
  return {
    seed: 'PH-12 first frozen run 2026-10-23',
    runStartsAt: now,
    eval: { offset: 0, replicates: 2000, placeboShifts: 0, periods },
    control: {
      sims: 100,
      alpha: 0.05,
      blockLength: 4 * PH12_WINDOW.horizon,
      offset: 0,
      placeboShifts: 0,
      periods,
      targetPower: 0.8,
      bisections: 5,
    },
    matchedDraws: 1000,
    calendarMask: null,
    returnUnit: 'fraction',
    recoveryTolerance: 0.15,
    loggedAt: now,
    placebo: 'relabel',
    relabelDraws: 500,
  };
}

export interface PreparedPh12 {
  grid: Ph12Grid;
  missing: string[];
  listing: ListingRow[];
  /** Universe members left out because they have no official BSE listing date. */
  excluded: string[];
}

/** The members, bars and stars. Needs no registry, so it can run before registration. */
export async function prepareMembers(paths = PH12_PATHS): Promise<PreparedPh12> {
  const frozen = JSON.parse(readFileSync(paths.frozen, 'utf8')) as FrozenUniverseFile;
  const listing = parseListing(readFileSync(paths.listing, 'utf8'));
  const keep = new Set(listing.map((r) => r.instrumentId));
  const buckets = JSON.parse(readFileSync(`data/frozen/${frozen.inputs.bucketsFile}`, 'utf8')) as {
    aliases: Record<string, string[]>;
  };
  const { store, missing } = await loadUniverseSeries({
    rawDir: paths.raw,
    members: frozen.members,
    aliases: buckets.aliases,
    // Same start as the freeze, so an instrument's id comes from the same first ISIN.
    from: addDays(frozen.asOf, -440),
    to: PH12_WINDOW.to,
  });
  const conv = freezeConventions(1);
  const starOf = new Map(
    listing.map((r) => [r.instrumentId, listingStar(r.listingDate, conv.calc)]),
  );
  const members: Ph12Member[] = frozen.members
    .filter((m) => keep.has(m.instrumentId))
    .map((m) => ({
      instrumentId: m.instrumentId,
      bars: store.adjusted(m.instrumentId, { includeDividends: false }),
      disputed: new Set(m.eventDisputedDates),
      names: [],
      star: starOf.get(m.instrumentId) ?? null,
    }));
  const grid = buildPh12Grid({
    sessions: tradingDaysBetween(PH12_WINDOW.from, PH12_WINDOW.to),
    horizon: PH12_WINDOW.horizon,
    members,
    decidedAtOf: (d) => sessionOn(d).windows.at(-1)?.closeUtc ?? 0,
  });
  const excluded = frozen.members
    .filter((m) => !keep.has(m.instrumentId))
    .map((m) => m.instrumentId);
  return { grid, missing, listing, excluded };
}

export interface RegisteredPh12 extends PreparedPh12 {
  registry: Registry;
  spec: HypothesisSpec;
}

export async function preparePh12(paths = PH12_PATHS): Promise<RegisteredPh12> {
  const base = await prepareMembers(paths);
  const registry = loadRegistry(paths.registry);
  const spec = registry?.registrations.find((r) => r.spec.id === PH12_ID)?.spec;
  if (registry === null || spec === undefined) throw new Error('PH-12 is not registered');
  return { ...base, registry, spec };
}

/** What the overlay does to the grid, counted without any return. */
export function ph12OverlayCounts(p: RegisteredPh12, now: number) {
  const run = overlayRun(p.registry, p.spec, ph12Overlay(), p.grid.grid, now);
  return run.ok
    ? {
        ok: true as const,
        denied: run.denied,
        resized: run.resized,
        taken: run.mask.reduce((n, v) => n + v, 0),
      }
    : { ok: false as const, reason: run.reason };
}
