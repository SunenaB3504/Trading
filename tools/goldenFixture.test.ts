/** The committed golden file and the code must agree (NFR-1, plan WP-1.11). */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildFixtureScenario } from '../packages/core/src/replay/fixtureScenario';
import { runReplay } from '../packages/core/src/replay/run';

describe('golden replay fixture', () => {
  it('matches fixtures/golden/replay_scenario_v1.json', () => {
    const file = JSON.parse(
      readFileSync(join(process.cwd(), 'fixtures/golden/replay_scenario_v1.json'), 'utf8'),
    ) as {
      scenario: string;
      reportHash: string;
    };
    const s = buildFixtureScenario();
    const result = runReplay(s.snapshot, s.orders, s.config);
    expect(file.scenario).toBe(s.snapshot.id);
    expect(result.reportHash).toBe(file.reportHash);
  });
});
