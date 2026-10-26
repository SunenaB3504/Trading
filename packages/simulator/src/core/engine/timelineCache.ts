/**
 * packages/simulator/src/core/engine/timelineCache.ts
 * High-performance Float64Array circular timeline buffer for O(1) Dasha & Astro lookups.
 * Enforces strict modularity (< 300 LOC, functions < 60 LOC, complexity <= 10).
 */

import type { PlanetKey } from '../astro/types';
import { VIMSHOTTARI_LORDS } from '../astro/constants';

export const TIMELINE_STRIDE = 8;
export const TIMELINE_OFFSET = {
  TIMESTAMP_MS: 0,
  MD_LORD_IDX: 1,
  AD_LORD_IDX: 2,
  PD_LORD_IDX: 3,
  KOTA_SCORE: 4,
  SBC_AFFLICTION: 5,
  ASTRO_FACTOR: 6,
  RESERVE_FLAG: 7,
} as const;

export interface TimelineSessionEntry {
  timestampMs: number;
  mahadasha: PlanetKey;
  antardasha: PlanetKey;
  pratyantardasha: PlanetKey;
  kotaScore: number;
  sbcAffliction: number;
  astroFactor: number;
}

function resolveLord(idx: number): PlanetKey {
  return VIMSHOTTARI_LORDS[idx] ?? 'ketu';
}

export class TimelineCache {
  private buffer: Float64Array;
  private readonly capacity: number;
  private length: number = 0;

  constructor(capacity: number = 7000) {
    this.capacity = capacity;
    this.buffer = new Float64Array(capacity * TIMELINE_STRIDE);
  }

  public getCapacity(): number {
    return this.capacity;
  }

  public getLength(): number {
    return this.length;
  }

  public setEntry(index: number, entry: TimelineSessionEntry): void {
    if (index < 0 || index >= this.capacity) return;

    const base = index * TIMELINE_STRIDE;
    this.buffer[base + TIMELINE_OFFSET.TIMESTAMP_MS] = entry.timestampMs;
    this.buffer[base + TIMELINE_OFFSET.MD_LORD_IDX] = VIMSHOTTARI_LORDS.indexOf(entry.mahadasha);
    this.buffer[base + TIMELINE_OFFSET.AD_LORD_IDX] = VIMSHOTTARI_LORDS.indexOf(entry.antardasha);
    this.buffer[base + TIMELINE_OFFSET.PD_LORD_IDX] = VIMSHOTTARI_LORDS.indexOf(entry.pratyantardasha);
    this.buffer[base + TIMELINE_OFFSET.KOTA_SCORE] = entry.kotaScore;
    this.buffer[base + TIMELINE_OFFSET.SBC_AFFLICTION] = entry.sbcAffliction;
    this.buffer[base + TIMELINE_OFFSET.ASTRO_FACTOR] = entry.astroFactor;
    this.buffer[base + TIMELINE_OFFSET.RESERVE_FLAG] = 0;

    if (index >= this.length) {
      this.length = index + 1;
    }
  }

  public getEntry(index: number): TimelineSessionEntry | null {
    if (index < 0 || index >= this.length) return null;

    const base = index * TIMELINE_STRIDE;
    const buf = this.buffer;

    return {
      timestampMs: buf[base + TIMELINE_OFFSET.TIMESTAMP_MS]!,
      mahadasha: resolveLord(Math.round(buf[base + TIMELINE_OFFSET.MD_LORD_IDX]!)),
      antardasha: resolveLord(Math.round(buf[base + TIMELINE_OFFSET.AD_LORD_IDX]!)),
      pratyantardasha: resolveLord(Math.round(buf[base + TIMELINE_OFFSET.PD_LORD_IDX]!)),
      kotaScore: buf[base + TIMELINE_OFFSET.KOTA_SCORE]!,
      sbcAffliction: buf[base + TIMELINE_OFFSET.SBC_AFFLICTION]!,
      astroFactor: buf[base + TIMELINE_OFFSET.ASTRO_FACTOR]!,
    };
  }

  public getAstroFactor(index: number): number {
    if (index < 0 || index >= this.length) return 0;
    return this.buffer[index * TIMELINE_STRIDE + TIMELINE_OFFSET.ASTRO_FACTOR] ?? 0;
  }

  public clear(): void {
    this.buffer.fill(0);
    this.length = 0;
  }
}
