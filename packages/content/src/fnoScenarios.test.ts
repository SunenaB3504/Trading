import { describe, expect, it } from 'vitest';
import { LESSONS } from './index';
import { FNO_SCENARIOS } from './fnoScenarios';

describe('F&O scenarios', () => {
  it('there are at least four, each with a unique id and every goal named', () => {
    expect(FNO_SCENARIOS.length).toBeGreaterThanOrEqual(4);
    expect(new Set(FNO_SCENARIOS.map((s) => s.id)).size).toBe(FNO_SCENARIOS.length);
    for (const s of FNO_SCENARIOS) expect(s.goals.length, s.id).toBeGreaterThan(0);
  });

  it('dates are in order and checkpoints fall inside the range', () => {
    for (const s of FNO_SCENARIOS) {
      expect(s.start >= '2020-04-01' && s.end > s.start, s.id).toBe(true);
      for (const c of s.checkpoints) expect(c.date > s.start && c.date <= s.end, `${s.id} ${c.date}`).toBe(true);
    }
  });

  it('lessons exist, both debriefs are written and nothing mentions astrology', () => {
    const ids = new Set(LESSONS.map((l) => l.id));
    for (const s of FNO_SCENARIOS) {
      for (const l of s.lessons) expect(ids.has(l), `${s.id} ${l}`).toBe(true);
      expect(s.debrief.met.length).toBeGreaterThan(40);
      expect(s.debrief.notMet.length).toBeGreaterThan(40);
      expect(JSON.stringify(s)).not.toMatch(/astro|horoscope|nakshatra|dasha/i);
    }
  });
});
