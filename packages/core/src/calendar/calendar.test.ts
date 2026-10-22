import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  CalendarRangeError,
  addDays,
  dayNumber,
  fromDayNumber,
  isTradingDay,
  istToUtcMillis,
  nextRegularOpenAfter,
  nextRegularTradingDay,
  previousRegularTradingDay,
  sessionOn,
  toCalendarDay,
  tradingDaysBetween,
  weekday,
} from './index';
import { HOLIDAYS } from './data';

describe('date arithmetic', () => {
  it('knows weekdays (0 = Sunday)', () => {
    expect(weekday('1970-01-01')).toBe(4); // Thursday
    expect(weekday('2026-10-16')).toBe(5); // Friday
    expect(weekday('2024-02-29')).toBe(4); // leap day, Thursday
    expect(weekday('2021-09-10')).toBe(5); // Friday, per NSE/CMTR/46623
    expect(weekday('2026-03-26')).toBe(4); // Thursday, per NSE/CMTR/71775
    expect(weekday('2026-05-28')).toBe(4); // Thursday, per NSE/CMTR/71775
  });

  it('round-trips day numbers and rejects impossible dates', () => {
    expect(dayNumber('1970-01-01')).toBe(0);
    expect(fromDayNumber(dayNumber('2024-02-29'))).toBe('2024-02-29');
    expect(addDays('2024-02-28', 2)).toBe('2024-03-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    for (const bad of ['2023-02-29', '2026-13-01', '2026-00-10', '2026-1-1', 'x']) {
      expect(() => dayNumber(bad)).toThrow(RangeError);
    }
    fc.assert(
      fc.property(fc.integer({ min: -30_000, max: 40_000 }), (n) => {
        expect(dayNumber(fromDayNumber(n))).toBe(n);
      }),
    );
  });

  it('converts IST wall-clock to UTC (IST = UTC+05:30)', () => {
    expect(istToUtcMillis('1970-01-01', '05:30')).toBe(0);
    expect(istToUtcMillis('2026-10-16', '09:15')).toBe(Date.UTC(2026, 9, 16, 3, 45));
  });
});

describe('official holidays', () => {
  it('closes on holidays read from the annual circulars', () => {
    for (const d of [
      '2021-09-10',
      '2026-03-26',
      '2026-05-28',
      '2022-03-18',
      '2025-04-18',
      '2020-02-21',
    ]) {
      expect(isTradingDay(d)).toBe(false);
    }
  });

  it('trades on the dates the research response wrongly gave as holidays', () => {
    expect(isTradingDay('2026-03-27')).toBe(true); // Friday, not a holiday
    expect(isTradingDay('2026-05-27')).toBe(true); // Wednesday, not a holiday
  });

  it('ad hoc closures are applied', () => {
    for (const d of ['2024-01-22', '2024-05-20', '2024-11-20', '2026-01-15', '2023-06-29']) {
      expect(isTradingDay(d)).toBe(false);
    }
    expect(isTradingDay('2023-06-28')).toBe(true);
  });

  it('every listed holiday is a weekday and none are duplicated', () => {
    const seen = new Set<string>();
    for (const h of HOLIDAYS) {
      expect([0, 6]).not.toContain(weekday(h.date));
      expect(seen.has(h.date)).toBe(false);
      seen.add(h.date);
    }
  });
});

describe('special sessions', () => {
  it('opens on Union Budget weekend days with normal hours', () => {
    const sat = sessionOn('2025-02-01');
    expect(sat).toMatchObject({ isTradingDay: true, kind: 'budget', confidence: 'secondary' });
    expect(sat.windows).toEqual([
      { openUtc: Date.UTC(2025, 1, 1, 3, 45), closeUtc: Date.UTC(2025, 1, 1, 10, 0) },
    ]);
    expect(sessionOn('2026-02-01')).toMatchObject({ isTradingDay: true, kind: 'budget' });
  });

  it('holds the 2025 Muhurat session in the afternoon, 13:45-14:45 IST', () => {
    const s = sessionOn('2025-10-21');
    expect(s.kind).toBe('muhurat');
    expect(s.windows).toEqual([
      { openUtc: Date.UTC(2025, 9, 21, 8, 15), closeUtc: Date.UTC(2025, 9, 21, 9, 15) },
    ]);
    expect(toCalendarDay('NSE', '2025-10-21').muhurat).toBe(true);
  });

  it('flags the 2026 Muhurat times as unconfirmed', () => {
    expect(sessionOn('2026-11-08')).toMatchObject({ kind: 'muhurat', confidence: 'unconfirmed' });
  });

  it('models the two-window Saturday DR sessions', () => {
    expect(sessionOn('2024-03-02').windows).toHaveLength(2);
  });
});

describe('queries', () => {
  it('reports regular days with 09:15-15:30 IST sessions', () => {
    const s = sessionOn('2026-10-16');
    expect(s).toMatchObject({ kind: 'regular', isTradingDay: true, confidence: 'official' });
    expect(s.windows).toEqual([
      { openUtc: Date.UTC(2026, 9, 16, 3, 45), closeUtc: Date.UTC(2026, 9, 16, 10, 0) },
    ]);
    expect(sessionOn('2023-03-01').confidence).toBe('secondary');
  });

  it('finds the next and previous regular trading day across holidays and weekends', () => {
    expect(nextRegularTradingDay('2021-09-09')).toBe('2021-09-13'); // Fri 10th is a holiday
    expect(nextRegularTradingDay('2025-01-31')).toBe('2025-02-03'); // Saturday session is not regular
    expect(previousRegularTradingDay('2026-03-27')).toBe('2026-03-25'); // Thu 26th closed
  });

  it('computes the next regular open after an instant (default fill time)', () => {
    const friClose = Date.UTC(2026, 9, 16, 10, 0);
    expect(nextRegularOpenAfter(friClose)).toBe(Date.UTC(2026, 9, 19, 3, 45)); // Monday
    const beforeOpen = Date.UTC(2026, 9, 19, 3, 0);
    expect(nextRegularOpenAfter(beforeOpen)).toBe(Date.UTC(2026, 9, 19, 3, 45));
    expect(nextRegularOpenAfter(Date.UTC(2026, 9, 19, 3, 45))).toBe(
      Date.UTC(2026, 9, 20, 3, 45) + 86_400_000,
    );
  });

  it('counts trading days and gives the schema view', () => {
    expect(tradingDaysBetween('2026-03-23', '2026-03-31')).toEqual([
      '2026-03-23',
      '2026-03-24',
      '2026-03-25',
      '2026-03-27',
      '2026-03-30',
    ]);
    expect(toCalendarDay('BSE', '2026-03-26')).toEqual({
      exchange: 'BSE',
      date: '2026-03-26',
      isTradingDay: false,
      sessionOpen: null,
      sessionClose: null,
      muhurat: false,
    });
  });

  it('refuses dates outside the supported range', () => {
    expect(() => sessionOn('2009-12-31')).toThrow(CalendarRangeError);
    expect(() => sessionOn('2027-01-01')).toThrow(CalendarRangeError);
  });

  it('covers 2018 and 2019 from the exchange archive (15 and 17 weekday closures, found from the files NSE published)', () => {
    const days = (y: string): number => tradingDaysBetween(`${y}-01-01`, `${y}-12-31`).length;
    // 2018: 365 days, 104 weekend days, 15 weekday closures (the Diwali evening session replaces no extra day)
    expect(days('2018')).toBe(365 - 104 - 15);
    // 2019: 365 days, 104 weekend days, 17 weekday closures, plus the Sunday Diwali evening session
    expect(days('2019')).toBe(365 - 104 - 17 + 1);
  });

  it('knows named 2018 and 2019 holidays and an ordinary 2018 day', () => {
    // includes the two 2019 election-day closures (29 April and 21 October) that no fixed holiday list would carry
    for (const d of [
      '2018-01-26',
      '2018-08-15',
      '2019-04-19',
      '2019-04-29',
      '2019-10-21',
      '2019-12-25',
    ]) {
      expect(sessionOn(d), d).toMatchObject({
        isTradingDay: false,
        kind: 'closed',
        confidence: 'archive',
      });
    }
    expect(sessionOn('2018-01-02')).toMatchObject({ isTradingDay: true, kind: 'regular' });
  });

  it('has the two Diwali evening sessions: the Sunday from the archive, the Wednesday recalled', () => {
    expect(sessionOn('2019-10-27')).toMatchObject({ isTradingDay: true, kind: 'muhurat' });
    expect(sessionOn('2019-10-27').confidence).toBe('recalled'); // the date is proven, the evening hours are recalled
    expect(sessionOn('2018-11-07')).toMatchObject({ isTradingDay: true, kind: 'muhurat' });
  });

  it('never lists a closed day as a trading day (property)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: dayNumber('2020-01-01'), max: dayNumber('2026-12-30') }),
        (n) => {
          const d = fromDayNumber(n);
          const next = nextRegularTradingDay(d);
          expect(next > d && sessionOn(next).kind === 'regular').toBe(true);
        },
      ),
    );
  });
});
