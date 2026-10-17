/**
 * Writes fixtures/eval/panel_small.json, the fixed panel used to compare the TypeScript harness
 * with the independent Python reference (tools/eval_reference.py). Run: pnpm exec tsx tools/makeEvalFixture.ts
 * Re-running reproduces the same file; change it only by a logged decision.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRng } from '../packages/core/src/random';
import { syntheticPanel } from '../packages/core/src/experiment';

const panel = syntheticPanel(
  {
    instruments: 4,
    dates: 120,
    horizon: 10,
    dailyVol: 0.01,
    marketVol: 0.01,
    startProbability: 0.04,
    episodeLength: 10,
  },
  createRng('eval-reference-fixture-v1'),
);

const dir = join(process.cwd(), 'fixtures', 'eval');
mkdirSync(dir, { recursive: true });
writeFileSync(
  join(dir, 'panel_small.json'),
  JSON.stringify({
    instruments: panel.instruments,
    dates: panel.dates,
    horizon: panel.horizon,
    ret: Array.from(panel.ret),
    on: Array.from(panel.on),
  }),
);
console.log('wrote fixtures/eval/panel_small.json');
