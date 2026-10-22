import { readFileSync } from 'node:fs';
import {
  APPROVED_NAMA_TABLE_V1,
  H21_BUYER,
  H21_ID,
  freezeConventions,
  h21Overlay,
  requireRules,
  siderealMoon,
} from '@trading/astro-engine';
import { addDays, overlayRun, sessionOn, tradingDaysBetween } from '@trading/core';
import type { FrozenRunConfig, HypothesisSpec, Registry } from '@trading/core';
import { loadRegistry, loadUniverseSeries } from '@trading/data-service';
import { buildH21Grid } from './h21Grid';
import type { GridMember, H21Grid } from './h21Grid';
import { parseNameHistory } from './names';

/**
 * Everything the first real H-21 run needs, assembled from the frozen files (WP-5.6): the universe-v2 members, their
 * adjusted bars from the raw archive, the draft company names, the registered H-21 and the frozen run settings.
 * Preparing is free of any look at returns; executing the evaluation is a separate step.
 */
export interface FrozenUniverseFile {
  asOf: string;
  inputs: { bucketsFile: string };
  members: Array<{ instrumentId: string; symbol: string; eventDisputedDates: string[] }>;
}

export const H21_PATHS = {
  frozen: 'data/frozen/universe_v2.json',
  names: 'data/names/universe_v2_names.csv',
  registry: 'data/registry/experiments.json',
  raw: 'data/raw/nse-bars',
  report: 'data/reports/h21_run_1.json',
} as const;

/** The window of decision sessions and the horizon (D21: 20 sessions). */
export const H21_WINDOW = { from: '2018-10-01', to: '2026-10-16', horizon: 20 } as const;

/**
 * The settings of the one frozen run, written down before it is run. The dominant periods only set which shifts the
 * shifted-ephemeris placebo may not use (the Moon's 27.3 days is about 19 sessions; a year is about 252). The
 * positive control runs without the placebo, which makes its MDE slightly optimistic; the report says so.
 */
export function h21RunConfig(now: number): FrozenRunConfig {
  const periods = [19, 252];
  return {
    seed: 'H-21 first frozen run 2026-10-22',
    runStartsAt: now,
    eval: { offset: 0, replicates: 2000, placeboShifts: 300, periods },
    control: {
      sims: 100,
      alpha: 0.05,
      blockLength: 4 * H21_WINDOW.horizon,
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
  };
}

export interface PreparedH21 {
  grid: H21Grid;
  registry: Registry;
  spec: HypothesisSpec;
  missing: string[];
}

export async function prepareH21(paths = H21_PATHS): Promise<PreparedH21> {
  const frozen = JSON.parse(readFileSync(paths.frozen, 'utf8')) as FrozenUniverseFile;
  const buckets = JSON.parse(readFileSync(`data/frozen/${frozen.inputs.bucketsFile}`, 'utf8')) as {
    aliases: Record<string, string[]>;
  };
  const { store, missing } = await loadUniverseSeries({
    rawDir: paths.raw,
    members: frozen.members,
    aliases: buckets.aliases,
    // Same start as the snapshot: an instrument's id comes from the first ISIN seen, so the start must match the freeze.
    from: addDays(frozen.asOf, -440),
    to: H21_WINDOW.to,
  });
  const names = parseNameHistory(readFileSync(paths.names, 'utf8'));
  const members: GridMember[] = frozen.members.map((m) => ({
    instrumentId: m.instrumentId,
    bars: store.adjusted(m.instrumentId, { includeDividends: false }),
    disputed: new Set(m.eventDisputedDates),
    names: names.get(m.instrumentId) ?? [],
  }));
  const conv = freezeConventions(1);
  requireRules(conv, ['nameMapping']);
  const grid = buildH21Grid({
    sessions: tradingDaysBetween(H21_WINDOW.from, H21_WINDOW.to),
    horizon: H21_WINDOW.horizon,
    members,
    buyer: H21_BUYER,
    table: APPROVED_NAMA_TABLE_V1,
    decidedAtOf: (d) => sessionOn(d).windows.at(-1)?.closeUtc ?? 0,
    transitSignAt: (ms) => Math.floor(siderealMoon(ms, conv.calc) / 30),
  });
  const registry = loadRegistry(paths.registry);
  const spec = registry?.registrations.find((r) => r.spec.id === H21_ID)?.spec;
  if (registry === null || spec === undefined) throw new Error('H-21 is not registered');
  return { grid, registry, spec, missing };
}

/** What the overlay does to the grid, counted without any return: how many candidates it denies. */
export function overlayCounts(p: PreparedH21, now: number) {
  const run = overlayRun(p.registry, p.spec, h21Overlay(APPROVED_NAMA_TABLE_V1), p.grid.grid, now);
  return run.ok
    ? {
        ok: true as const,
        denied: run.denied,
        resized: run.resized,
        taken: run.mask.reduce((n, v) => n + v, 0),
      }
    : { ok: false as const, reason: run.reason };
}
