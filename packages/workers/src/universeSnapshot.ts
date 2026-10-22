import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { FixedClock, addDays } from '@trading/core';
import { createSnapshot, loadUniverseSeries, verifySnapshot } from '@trading/data-service';

/**
 * Builds the data snapshot of the frozen universe from the real archive (SSD FR-D6, WP-2.8, WP-2.9). Every member's
 * bars and corporate actions are loaded, the known price-event days recorded in the frozen universe are flagged as
 * disputed in the snapshot, and the snapshot is hashed and verified. Only a summary is written: the bars stay in
 * the archive.
 *
 * Usage:  pnpm universe:snapshot --as-of 2026-10-16 [--frozen data/frozen/universe_v2.json]
 *            [--out data/derived/snapshot_universe_v2.json]
 */
interface Frozen {
  asOf: string;
  inputs: { bucketsFile: string };
  members: Array<{ instrumentId: string; symbol: string; eventDisputedDates: string[] }>;
}

function option(args: readonly string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

export async function main(args: readonly string[]): Promise<number> {
  const asOf = option(args, '--as-of');
  if (asOf === undefined) {
    console.error('Usage: pnpm universe:snapshot --as-of YYYY-MM-DD');
    return 2;
  }
  const frozenFile = option(args, '--frozen') ?? 'data/frozen/universe_v2.json';
  const frozen = JSON.parse(readFileSync(frozenFile, 'utf8')) as Frozen;
  const bucketsFile = `${dirname(frozenFile)}/${frozen.inputs.bucketsFile}`;
  const aliases = (
    JSON.parse(readFileSync(bucketsFile, 'utf8')) as { aliases: Record<string, string[]> }
  ).aliases;
  const { store, missing } = await loadUniverseSeries({
    rawDir: 'data/raw/nse-bars',
    members: frozen.members,
    aliases,
    from: addDays(frozen.asOf, -440),
    to: asOf,
  });
  const eventDays = new Map(frozen.members.map((m) => [m.instrumentId, m.eventDisputedDates]));
  const { snapshot, frozen: series } = createSnapshot({
    store,
    clock: new FixedClock(Date.now()),
    asOf,
    eventDays,
  });
  const problems = verifySnapshot(snapshot, series);
  const unexplained = snapshot.series.filter((e) => e.disputedBars !== e.eventBars);
  const mismatched = snapshot.series.filter((e) => e.adjustmentMismatches > 0);
  const out = option(args, '--out') ?? 'data/derived/snapshot_universe_v2.json';
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ snapshot, problems, missing }, null, 1));
  console.log(
    JSON.stringify({
      asOf,
      id: snapshot.id,
      status: snapshot.status,
      series: snapshot.series.length,
      missingMembers: missing.length,
      bars: snapshot.series.reduce((n, e) => n + e.bars, 0),
      eventBars: snapshot.series.reduce((n, e) => n + e.eventBars, 0),
      unexplainedDisputes: unexplained.map(
        (e) => `${e.instrumentId}: ${String(e.disputedBars - e.eventBars)}`,
      ),
      adjustmentMismatches: mismatched.map(
        (e) => `${e.instrumentId}: ${String(e.adjustmentMismatches)}`,
      ),
      verifyProblems: problems.length,
      out,
    }),
  );
  return 0;
}

if (process.argv[1]?.endsWith('universeSnapshot.ts') === true) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (e: unknown) => {
      console.error(e);
      process.exit(2);
    },
  );
}
