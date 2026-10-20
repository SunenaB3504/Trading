import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canonicalJson, selectUniverse, sha256Hex } from '../packages/core/src/index';
import type { UniverseCandidate, UniverseConfig } from '../packages/core/src/index';

/**
 * The frozen universe (data/frozen/universe_v1.json): the file must still hash to what was stamped, the draw must
 * reproduce from the candidates and the config stored in it, and the rules it claims must hold.
 */
interface Frozen {
  version: string;
  supersedes?: string | null;
  asOf: string;
  inputs: { bucketsFile?: string; bucketsFileHash: string; pilotSymbolsHash: string };
  config: UniverseConfig;
  candidates: Array<{
    instrumentId: string;
    symbol: string;
    bucket: UniverseCandidate['bucket'];
    e7: string;
    eligible: boolean;
  }>;
  buckets: Array<{ bucket: string; wanted: number; available: number; chosen: number }>;
  shortfall: number;
  members: Array<{
    instrumentId: string;
    symbol: string;
    bucket: string;
    singleProvider: boolean;
    eventDisputedDates: string[];
  }>;
  manifestHash: string;
  fileHash: string;
}

const FILES: Array<[string, string]> = [
  [
    'data/frozen/universe_v1.json',
    'c715774fbf12c2023570f2afb7c9baa500bb522eebad09e99dea2268ea34c898',
  ],
  [
    'data/frozen/universe_v2.json',
    '3c8a96d9b00170aded015c3750543f6c0d72bf958d6cf25a21cbc3bcf904370d',
  ],
];

describe.each(FILES)('the frozen universe %s', (file, stamped) => {
  const frozen = JSON.parse(readFileSync(file, 'utf8')) as Frozen;

  it('still hashes to the value that was stamped', () => {
    const { fileHash, ...body } = frozen;
    expect(sha256Hex(canonicalJson(body))).toBe(fileHash);
    expect(fileHash).toBe(stamped);
  });

  it('is reproduced by the draw from its own candidates and config', () => {
    const again = selectUniverse(
      frozen.candidates.map((c) => ({
        instrumentId: c.instrumentId,
        eligible: c.eligible,
        bucket: c.bucket,
      })),
      frozen.config,
    );
    expect(again.manifestHash).toBe(frozen.manifestHash);
    expect(again.members.map((m) => m.instrumentId)).toEqual(
      frozen.members.map((m) => m.instrumentId),
    );
  });

  it('records the buckets file and the pilot list it used, and they still match', () => {
    const buckets = readFileSync(
      `data/frozen/${frozen.inputs.bucketsFile ?? `buckets_${frozen.asOf}.json`}`,
      'utf8',
    );
    expect(sha256Hex(buckets)).toBe(frozen.inputs.bucketsFileHash);
    expect(sha256Hex(readFileSync('data/pilot_symbols.txt', 'utf8'))).toBe(
      frozen.inputs.pilotSymbolsHash,
    );
  });

  it('holds no pilot stock, and every member is eligible and in a bucket', () => {
    const pilot = new Set(
      readFileSync('data/pilot_symbols.txt', 'utf8').split(/\r?\n/).filter(Boolean),
    );
    for (const m of frozen.members) {
      expect(pilot.has(m.symbol), m.symbol).toBe(false);
      const c = frozen.candidates.find((x) => x.instrumentId === m.instrumentId);
      expect(c?.eligible, m.symbol).toBe(true);
      expect(c?.bucket, m.symbol).toBe(m.bucket);
    }
    expect(
      frozen.config.excluded.every((id) => !frozen.members.some((m) => m.instrumentId === id)),
    ).toBe(true);
  });

  it('reports its shortfall instead of hiding it, and flags the single-provider names', () => {
    expect(frozen.members.length + frozen.shortfall).toBe(frozen.config.size);
    for (const b of frozen.buckets) expect(b.chosen).toBeLessThanOrEqual(b.wanted);
    const flagged = frozen.members.filter((m) => m.singleProvider);
    expect(flagged.length).toBeGreaterThan(0);
    for (const m of flagged) {
      const c = frozen.candidates.find((x) => x.instrumentId === m.instrumentId);
      expect(c?.e7).toBe('single-provider');
    }
  });

  it('sets the window at 2018-10-01 and the eight-year design (D8)', () => {
    expect(frozen.asOf).toBe('2018-10-01');
    expect(['universe-v1', 'universe-v2']).toContain(frozen.version);
  });
});

describe('the correction from version 1 to version 2', () => {
  const v2 = JSON.parse(readFileSync('data/frozen/universe_v2.json', 'utf8')) as Frozen;
  it('says what it replaces', () => {
    expect(v2.version).toBe('universe-v2');
    expect(v2.supersedes).toBe('universe-v1');
  });
});
