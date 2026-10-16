import { describe, expect, it } from 'vitest';
import { createRng } from './index';

// Golden values produced by an independent Python reference (xoshiro128**, SHA-256 seeding).
describe('seeded rng', () => {
  it('matches the independent reference: u32 stream', () => {
    const r = createRng('golden-seed-1');
    expect(Array.from({ length: 8 }, () => r.nextU32())).toEqual([
      3530868787, 1339859352, 1333040747, 1775529479, 2998971896, 1173301300, 2502517049,
      1912276277,
    ]);
  });

  it('matches the reference: floats, bounded ints, shuffle and fork', () => {
    expect(
      Array.from(
        { length: 3 },
        (
          (r) => () =>
            r.nextFloat()
        )(createRng('golden-seed-1')),
      ),
    ).toEqual([0.8220944502350711, 0.31037273565976076, 0.6982525532929635]);
    const ints = createRng('golden-seed-1');
    expect(Array.from({ length: 10 }, () => ints.nextInt(10))).toEqual([
      7, 2, 7, 9, 6, 0, 9, 7, 5, 6,
    ]);
    expect(createRng('golden-seed-1').shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual([
      4, 6, 5, 1, 0, 2, 9, 8, 3, 7,
    ]);
    const child = createRng('golden-seed-1').fork('child');
    expect([child.nextU32(), child.nextU32(), child.nextU32()]).toEqual([
      4123826741, 1205636835, 1451169517,
    ]);
  });

  it('is reproducible and seed-sensitive', () => {
    const a = createRng('s');
    const b = createRng('s');
    const c = createRng('t');
    expect(a.nextU32()).toBe(b.nextU32());
    expect(createRng('s').nextU32()).not.toBe(c.nextU32());
  });

  it('forks do not depend on how many draws the parent made', () => {
    const parent = createRng('p');
    const before = parent.fork('x').nextU32();
    for (let i = 0; i < 100; i += 1) parent.nextU32();
    expect(parent.fork('x').nextU32()).toBe(before);
    expect(parent.fork('y').nextU32()).not.toBe(before);
  });

  it('keeps nextInt in range and roughly uniform', () => {
    const r = createRng('uniform');
    const counts = Array.from({ length: 6 }, () => 0);
    for (let i = 0; i < 60_000; i += 1) {
      const v = r.nextInt(6);
      counts[v] = (counts[v] ?? 0) + 1;
    }
    for (const c of counts) expect(Math.abs(c - 10_000)).toBeLessThan(500);
    expect(r.nextInt(1)).toBe(0);
    expect(() => r.nextInt(0)).toThrow(RangeError);
    expect(() => r.nextInt(2.5)).toThrow(RangeError);
  });

  it('keeps floats in [0, 1) and shuffles to a permutation', () => {
    const r = createRng('range');
    for (let i = 0; i < 1_000; i += 1) {
      const f = r.nextFloat();
      expect(f >= 0 && f < 1).toBe(true);
    }
    expect([...r.shuffle([1, 2, 3, 4, 5])].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(() => createRng('')).toThrow(RangeError);
  });
});
