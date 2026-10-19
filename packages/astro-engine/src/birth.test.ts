import { describe, expect, it } from 'vitest';
import golden from '../../../fixtures/astro/tz_golden.json';
import { birthMoment } from './birth';
import { buildChart } from './chart';
import { DEFAULT_CONVENTIONS } from './conventions';
import { GAZETTEER_SOURCE, findPlaces, placeCount } from './gazetteer';
import { hasZone, localToUtc, offsetAt } from './tz';

const first = (q: string) => {
  const p = findPlaces(q, 1)[0];
  if (p === undefined) throw new Error(`no place for ${q}`);
  return p;
};
const sec = (y: number, m: number, d: number, h: number, mi: number): number =>
  Date.UTC(y, m - 1, d, h, mi) / 1000;

describe('historical time zones against IANA tzdata (via Python zoneinfo)', () => {
  const samples = (golden as unknown as { samples: Array<[string, number, number]> }).samples;

  it(`reproduce all ${samples.length} sampled offsets exactly, across 1900 to 2037`, () => {
    const bad = samples.filter(([zone, s, expected]) => offsetAt(zone, s) !== expected);
    expect(bad.slice(0, 3)).toEqual([]);
  });

  it('knows India on local mean time, on wartime +6:30 and on +5:30 since', () => {
    expect(offsetAt('Asia/Kolkata', sec(1900, 1, 1, 0, 0))).toBe(5 * 3600 + 21 * 60 + 10);
    expect(offsetAt('Asia/Kolkata', sec(1944, 1, 1, 12, 0))).toBe(6.5 * 3600);
    expect(offsetAt('Asia/Kolkata', sec(1990, 1, 1, 12, 0))).toBe(5.5 * 3600);
  });

  it('rejects an unknown zone', () => {
    expect(hasZone('Asia/Kolkata')).toBe(true);
    expect(() => offsetAt('Mars/Olympus', 0)).toThrow(/Unknown time zone/);
  });
});

describe('local clock time to UTC', () => {
  it('converts an ordinary time with the offset of that day', () => {
    expect(localToUtc('Asia/Kolkata', sec(1990, 1, 1, 12, 0))).toEqual({
      utcSec: sec(1990, 1, 1, 6, 30),
      offsetSec: 19800,
      status: 'ok',
    });
    expect(localToUtc('Europe/London', sec(2020, 7, 1, 12, 0)).utcSec).toBe(sec(2020, 7, 1, 11, 0));
  });

  it('flags a time the clock skipped (clocks forward) and one it showed twice (clocks back)', () => {
    const skipped = localToUtc('Europe/London', sec(2020, 3, 29, 1, 30));
    expect(skipped.status).toBe('nonexistent');
    const twice = localToUtc('Europe/London', sec(2020, 10, 25, 1, 30));
    expect(twice.status).toBe('ambiguous');
    expect(twice.utcSec).toBe(sec(2020, 10, 25, 0, 30)); // the first showing, still summer time
  });
});

describe('the offline gazetteer', () => {
  it('holds about five thousand places, credits its source, and every zone it names has a history', () => {
    expect(placeCount()).toBeGreaterThan(4000);
    expect(placeCount()).toBeLessThan(6500);
    expect(GAZETTEER_SOURCE).toMatch(/GeoNames.*CC BY 4\.0/);
    for (const q of ['mumbai', 'chennai', 'london', 'new york'])
      expect(hasZone(first(q).zone)).toBe(true);
  });

  it('finds places by name, old name and country, larger city first', () => {
    expect(first('Mumbai')).toMatchObject({ country: 'IN', zone: 'Asia/Kolkata' });
    expect(first('Bombay').name).toBe(first('Mumbai').name);
    expect(first('Madras').country).toBe('IN');
    expect(first('Calcutta').zone).toBe('Asia/Kolkata');
    expect(first('Hyderabad, IN').country).toBe('IN');
    expect(first('Hyderabad, PK').country).toBe('PK');
    expect(findPlaces('Thiruvananthapuram').length).toBeGreaterThan(0);
  });

  it('gives nothing for a one-letter or unknown query', () => {
    expect(findPlaces('a')).toEqual([]);
    expect(findPlaces('Zzzzzzzz')).toEqual([]);
  });
});

describe('birth moment', () => {
  it("turns a remembered local time and a place into a UTC instant with that place's coordinates", () => {
    const b = birthMoment({ date: '1990-01-01', time: '12:00', place: first('Mumbai') });
    expect(b.moment.utc).toBe('1990-01-01T06:30');
    expect(b.moment.latitude).toBeCloseTo(19.07, 0);
    expect(b.status).toBe('ok');
    expect(b.offsetSeconds).toBe(19800);
  });

  it('uses wartime India, and shows a different chart than +5:30 would', () => {
    const war = birthMoment({ date: '1944-01-01', time: '12:00', place: first('Chennai') });
    expect(war.offsetSeconds).toBe(6.5 * 3600);
    expect(war.moment.utc).toBe('1944-01-01T05:30');
  });

  it('flags an ambiguous local time and rejects impossible input', () => {
    expect(birthMoment({ date: '2020-10-25', time: '01:30', place: first('London') }).status).toBe(
      'ambiguous',
    );
    expect(() =>
      birthMoment({ date: '2020-02-30', time: '10:00', place: first('Mumbai') }),
    ).toThrow(/Not a real/);
    expect(() =>
      birthMoment({ date: '2020-02-10', time: '24:00', place: first('Mumbai') }),
    ).toThrow(/Not a real/);
    expect(() =>
      birthMoment({ date: '10/02/2020', time: '10:00', place: first('Mumbai') }),
    ).toThrow(/YYYY-MM-DD/);
  });

  it('feeds the chart engine end to end', () => {
    const b = birthMoment({ date: '1990-01-01', time: '12:00', place: first('Mumbai') });
    const chart = buildChart(b.moment, DEFAULT_CONVENTIONS);
    expect(chart.lagna.sign).toBeGreaterThanOrEqual(0);
    expect(chart.planets.moon.nakshatra).toBeLessThan(27);
  });
});
