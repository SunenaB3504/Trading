import { describe, expect, it } from 'vitest';
import { LESSONS } from './index';
import { SCENARIOS } from './scenarios';

describe('scenarios', () => {
  it('there are six, covering shares, ETFs and funds', () => {
    expect(SCENARIOS).toHaveLength(6);
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(6);
    expect(SCENARIOS.some((s) => s.pot === 'funds')).toBe(true);
    expect(SCENARIOS.some((s) => s.instruments.includes('NIFTYBEES'))).toBe(true);
  });

  it('every date is inside the cost schedule and in order, with checkpoints inside the range', () => {
    for (const s of SCENARIOS) {
      expect(s.start >= '2020-04-01', s.id).toBe(true);
      expect(s.end > s.start, s.id).toBe(true);
      for (const c of s.checkpoints) expect(c.date > s.start && c.date <= s.end, `${s.id} ${c.date}`).toBe(true);
    }
  });

  it('every lesson it points to exists, every scenario has a debrief for both outcomes, and none mentions astrology', () => {
    const ids = new Set(LESSONS.map((l) => l.id));
    for (const s of SCENARIOS) {
      for (const l of s.lessons) expect(ids.has(l), `${s.id} ${l}`).toBe(true);
      expect(s.debrief.met.length).toBeGreaterThan(40);
      expect(s.debrief.notMet.length).toBeGreaterThan(40);
      expect(JSON.stringify(s)).not.toMatch(/astro|horoscope|nakshatra|dasha/i);
    }
  });
});
