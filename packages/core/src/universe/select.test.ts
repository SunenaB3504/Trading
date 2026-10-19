import { describe, expect, it } from 'vitest';
import type { Bucket } from '../domain/enums';
import { BUCKETS, UNIVERSE_V1_DEFAULT, selectUniverse } from './select';
import type { UniverseCandidate, UniverseConfig } from './select';

const cfg = (over: Partial<UniverseConfig> = {}): UniverseConfig => ({
  ...UNIVERSE_V1_DEFAULT,
  seed: 'seed-1',
  excluded: [],
  ...over,
});

function pool(perBucket: number): UniverseCandidate[] {
  return BUCKETS.flatMap((b) =>
    Array.from({ length: perBucket }, (_, i) => ({
      instrumentId: `${b.toUpperCase()}-${String(i)}`,
      eligible: true,
      bucket: b as Bucket,
    })),
  );
}

describe('choosing the evaluation universe', () => {
  it('draws exactly the wanted number from each bucket when each has enough names', () => {
    const m = selectUniverse(pool(60), cfg());
    expect(m.members).toHaveLength(100);
    expect(m.shortfall).toBe(0);
    for (const b of m.buckets) expect(b.chosen).toBe(20);
  });

  it('gives the same universe and hash for the same inputs, and another for another seed', () => {
    const a = selectUniverse(pool(60), cfg());
    const b = selectUniverse([...pool(60)].reverse(), cfg());
    expect(b.manifestHash).toBe(a.manifestHash);
    expect(b.members).toEqual(a.members);
    expect(selectUniverse(pool(60), cfg({ seed: 'seed-2' })).manifestHash).not.toBe(a.manifestHash);
  });

  it('leaves out ineligible, unbucketed and excluded (pilot) names', () => {
    const c = pool(30);
    c.push({ instrumentId: 'BAD', eligible: false, bucket: 'steady' });
    c.push({ instrumentId: 'NOBUCKET', eligible: true, bucket: null });
    const first = selectUniverse(c, cfg());
    const pilot = first.members.slice(0, 5).map((x) => x.instrumentId);
    const again = selectUniverse(c, cfg({ excluded: pilot }));
    const ids = again.members.map((x) => x.instrumentId);
    expect(ids).not.toContain('BAD');
    expect(ids).not.toContain('NOBUCKET');
    for (const p of pilot) expect(ids).not.toContain(p);
    expect(again.members).toHaveLength(100);
  });

  it('reports a shortfall instead of borrowing from another bucket', () => {
    const c = pool(60).filter(
      (x) => !(x.bucket === 'mundane' && Number(x.instrumentId.split('-')[1]) >= 12),
    );
    const m = selectUniverse(c, cfg());
    const mundane = m.buckets.find((b) => b.bucket === 'mundane');
    expect(mundane).toEqual({ bucket: 'mundane', wanted: 20, available: 12, chosen: 12 });
    expect(m.shortfall).toBe(8);
    expect(m.members).toHaveLength(92);
  });

  it('makes the wanted counts add up to the size even when shares do not divide evenly', () => {
    const m = selectUniverse(pool(60), cfg({ size: 33 }));
    expect(m.buckets.reduce((n, b) => n + b.wanted, 0)).toBe(33);
    expect(m.members).toHaveLength(33);
  });

  it('refuses bad shares, a bad size and a repeated instrument', () => {
    const skewed = { ...UNIVERSE_V1_DEFAULT.shares, steady: 0.5 };
    expect(() => selectUniverse(pool(3), cfg({ shares: skewed }))).toThrow(/sum to 1/);
    expect(() => selectUniverse(pool(3), cfg({ size: 0 }))).toThrow(RangeError);
    expect(() => selectUniverse([...pool(3), ...pool(3)], cfg())).toThrow(/twice/);
  });
});
