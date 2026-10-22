import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { APPROVED_NAMA_TABLE_V1, h21Overlay } from '@trading/astro-engine';
import { runFrozenEvaluation } from '@trading/core';
import { saveRegistry } from '@trading/data-service';
import { H21_PATHS, h21RunConfig, overlayCounts, prepareH21 } from './h21Run';

/**
 * The first real H-21 run (WP-5.6).
 *
 *   pnpm run:h21            prepares the grid and reports its shape and what the overlay does (no returns are
 *                           analysed); safe to repeat.
 *   pnpm run:h21 --execute  runs the frozen evaluation ONCE and writes the report and the updated registry. The
 *                           result is the result: the run logs itself in the multiplicity record, so do not run it
 *                           to see whether a different setting looks better.
 */
const execute = process.argv.includes('--execute');
const now = Date.now();
const prepared = await prepareH21();
const { summary } = prepared.grid;
console.log(JSON.stringify({ step: 'grid', ...summary, missingMembers: prepared.missing }));
const counts = overlayCounts(prepared, now);
console.log(JSON.stringify({ step: 'overlay', ...counts }));
if (!execute) {
  console.log(
    'Dry run only. Nothing was evaluated. Add --execute to run the frozen evaluation once.',
  );
  process.exit(0);
}
const out = runFrozenEvaluation(
  prepared.registry,
  prepared.spec,
  h21Overlay(APPROVED_NAMA_TABLE_V1),
  prepared.grid.grid,
  h21RunConfig(now),
);
if (!out.ok) {
  console.error(`The run was refused: ${out.reason}`);
  process.exit(1);
}
mkdirSync(dirname(H21_PATHS.report), { recursive: true });
writeFileSync(H21_PATHS.report, JSON.stringify(out.report, null, 1));
saveRegistry(H21_PATHS.registry, out.registry);
console.log(
  JSON.stringify({ step: 'done', verdict: out.report.verdict, reportHash: out.report.reportHash }),
);
