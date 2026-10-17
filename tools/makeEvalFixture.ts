/**
 * Writes fixtures/eval/panel_small.json, the fixed panel used to compare the TypeScript harness
 * with the independent Python reference (tools/eval_reference.py). Run: pnpm exec tsx tools/makeEvalFixture.ts
 * Re-running reproduces the same file; change it only by a logged decision.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRng } from '../packages/core/src/random';
import { syntheticPanel } from '../packages/core/src/experiment';

function write(name: string, panel: ReturnType<typeof syntheticPanel>): void {
  const dir = join(process.cwd(), 'fixtures', 'eval');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, name),
    JSON.stringify({
      instruments: panel.instruments,
      dates: panel.dates,
      horizon: panel.horizon,
      ret: Array.from(panel.ret),
      on: Array.from(panel.on),
    }),
  );
  console.log(`wrote fixtures/eval/${name}`);
}

const small = {
  instruments: 8,
  dates: 240,
  horizon: 10,
  dailyVol: 0.01,
  marketVol: 0.01,
  startProbability: 0.015,
  episodeLength: 10,
};
write('panel_small.json', syntheticPanel(small, createRng('eval-reference-fixture-v1')));
write(
  'panel_shared_small.json',
  syntheticPanel(
    { ...small, dates: 400, startProbability: 0.03, sharedSignal: true },
    createRng('eval-reference-shared-v1'),
  ),
);
