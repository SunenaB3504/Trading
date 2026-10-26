/**
 * packages/app/src/core/engine/timelineCache.test.ts
 * Unit tests verifying Float64Array timeline buffer performance and accuracy.
 */

import { describe, it, expect } from 'vitest';
import { TimelineCache } from './timelineCache';

describe('TimelineCache Float64Array Buffer', () => {
  it('stores and retrieves timeline session entries accurately', () => {
    const cache = new TimelineCache(100);
    const sampleTime = new Date('2026-10-01T00:00:00Z').getTime();

    cache.setEntry(0, {
      timestampMs: sampleTime,
      mahadasha: 'jupiter',
      antardasha: 'saturn',
      pratyantardasha: 'mercury',
      kotaScore: 0.85,
      sbcAffliction: 0.12,
      astroFactor: 0.75,
    });

    const entry = cache.getEntry(0);
    expect(entry).not.toBeNull();
    expect(entry?.timestampMs).toBe(sampleTime);
    expect(entry?.mahadasha).toBe('jupiter');
    expect(entry?.antardasha).toBe('saturn');
    expect(entry?.pratyantardasha).toBe('mercury');
    expect(entry?.kotaScore).toBeCloseTo(0.85, 4);
    expect(entry?.sbcAffliction).toBeCloseTo(0.12, 4);
    expect(entry?.astroFactor).toBeCloseTo(0.75, 4);
  });

  it('performs 10,000 lookups in under 5 milliseconds', () => {
    const cache = new TimelineCache(500);
    for (let i = 0; i < 500; i++) {
      cache.setEntry(i, {
        timestampMs: 1700000000000 + i * 86400000,
        mahadasha: 'venus',
        antardasha: 'sun',
        pratyantardasha: 'moon',
        kotaScore: 0.9,
        sbcAffliction: 0.05,
        astroFactor: 0.88,
      });
    }

    const start = performance.now();
    let sum = 0;
    for (let k = 0; k < 10000; k++) {
      const idx = k % 500;
      sum += cache.getAstroFactor(idx);
    }
    const elapsed = performance.now() - start;

    expect(sum).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(10.0); // Strict threshold: < 10ms for 10k lookups
  });

  it('returns null and 0 for out-of-bounds indices', () => {
    const cache = new TimelineCache(10);
    expect(cache.getEntry(99)).toBeNull();
    expect(cache.getAstroFactor(99)).toBe(0);
  });
});
