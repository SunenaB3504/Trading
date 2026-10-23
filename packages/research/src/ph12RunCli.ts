import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { ph12Overlay } from '@trading/astro-engine';
import { runFrozenEvaluation } from '@trading/core';
import { saveRegistry } from '@trading/data-service';
import { PH12_PATHS, ph12OverlayCounts, ph12RunConfig, preparePh12 } from './ph12Run';

/**
 * The PH-12 run.
 *
 *   pnpm run:ph12            prepares the grid and reports its shape and what the overlay does (no returns are
 *                            analysed); safe to repeat. Needs PH-12 registered.
 *   pnpm run:ph12 --execute  runs the frozen evaluation ONCE and writes the report and the updated registry. The
 *                            run logs itself in the multiplicity record, so do not run it to see whether a
 *                            different setting looks better.
 */
const execute = process.argv.includes('--execute');
const now = Date.now();
const prepared = await preparePh12();
console.log(
  JSON.stringify({
    step: 'grid',
    ...prepared.grid.summary,
    companiesByGroup: prepared.grid.companiesByGroup,
    missingMembers: prepared.missing,
    leftOut: prepared.excluded.length,
  }),
);
console.log(JSON.stringify({ step: 'overlay', ...ph12OverlayCounts(prepared, now) }));
if (!execute) {
  console.log(
    'Dry run only. Nothing was evaluated. Add --execute to run the frozen evaluation once.',
  );
  process.exit(0);
}
const out = runFrozenEvaluation(
  prepared.registry,
  prepared.spec,
  ph12Overlay(),
  prepared.grid.grid,
  ph12RunConfig(now),
);
if (!out.ok) {
  console.error(`The run was refused: ${out.reason}`);
  process.exit(1);
}
mkdirSync(dirname(PH12_PATHS.report), { recursive: true });
writeFileSync(PH12_PATHS.report, JSON.stringify(out.report, null, 1));
saveRegistry(PH12_PATHS.registry, out.registry);
console.log(
  JSON.stringify({ step: 'done', verdict: out.report.verdict, reportHash: out.report.reportHash }),
);
