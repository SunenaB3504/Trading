/**
 * NSE equity (cash) trading calendar, 2020-2026. NSE and BSE are assumed to share one calendar
 * (not separately verified for BSE). Source and confidence are recorded for every entry.
 *
 * Confidence:
 * - official:    read from the exchange's annual holiday circular (NSE/CMTR/...), 2026-10-16
 * - secondary:   reported by several news outlets citing exchange circulars, or the 2023 annual
 *                list taken from a research response and matching reviewer recollection
 * - recalled:    reviewer recollection plus a research response; not checked against a circular
 * - unconfirmed: the exchange had not yet notified the value
 *
 * Known limitation: closures notified after the annual circular (election polling days) and extra
 * Saturday disaster-recovery sessions can be missing for any year; check the exchange notices.
 */
export type Confidence = 'official' | 'secondary' | 'recalled' | 'unconfirmed';

export interface HolidayEntry {
  date: string;
  name: string;
  confidence: Confidence;
  source: string;
}

export interface SessionWindow {
  /** IST wall-clock `HH:MM`. */
  open: string;
  close: string;
}

export type SpecialKind = 'budget' | 'dr' | 'muhurat';

export interface SpecialSession {
  date: string;
  kind: SpecialKind;
  windows: SessionWindow[];
  dateConfidence: Confidence;
  timesConfidence: Confidence;
  source: string;
}

export const SUPPORTED_FROM = '2020-01-01';
export const SUPPORTED_TO = '2026-12-31';
export const REGULAR_WINDOW: SessionWindow = { open: '09:15', close: '15:30' };

type Row = [monthDay: string, name: string];

function year(y: number, source: string, confidence: Confidence, rows: Row[]): HolidayEntry[] {
  return rows.map(([md, name]) => ({ date: `${String(y)}-${md}`, name, confidence, source }));
}

/** Weekday closures from the annual circulars, then ad hoc closures. */
export const HOLIDAYS: HolidayEntry[] = [
  ...year(2020, 'NSE/CMTR/42877', 'official', [
    ['02-21', 'Mahashivratri'],
    ['03-10', 'Holi'],
    ['04-02', 'Ram Navami'],
    ['04-06', 'Mahavir Jayanti'],
    ['04-10', 'Good Friday'],
    ['04-14', 'Ambedkar Jayanti'],
    ['05-01', 'Maharashtra Day'],
    ['05-25', 'Id-Ul-Fitr'],
    ['10-02', 'Gandhi Jayanti'],
    ['11-16', 'Diwali Balipratipada'],
    ['11-30', 'Gurunanak Jayanti'],
    ['12-25', 'Christmas'],
  ]),
  ...year(2021, 'NSE/CMTR/46623', 'official', [
    ['01-26', 'Republic Day'],
    ['03-11', 'Mahashivratri'],
    ['03-29', 'Holi'],
    ['04-02', 'Good Friday'],
    ['04-14', 'Ambedkar Jayanti'],
    ['04-21', 'Ram Navami'],
    ['05-13', 'Id-Ul-Fitr'],
    ['07-21', 'Bakri Id'],
    ['08-19', 'Moharram'],
    ['09-10', 'Ganesh Chaturthi'],
    ['10-15', 'Dussehra'],
    ['11-04', 'Diwali Laxmi Pujan (Muhurat)'],
    ['11-05', 'Diwali Balipratipada'],
    ['11-19', 'Gurunanak Jayanti'],
  ]),
  ...year(2022, 'NSE/CMTR/50560', 'official', [
    ['01-26', 'Republic Day'],
    ['03-01', 'Mahashivratri'],
    ['03-18', 'Holi'],
    ['04-14', 'Ambedkar / Mahavir Jayanti'],
    ['04-15', 'Good Friday'],
    ['05-03', 'Id-Ul-Fitr'],
    ['08-09', 'Moharram'],
    ['08-15', 'Independence Day'],
    ['08-31', 'Ganesh Chaturthi'],
    ['10-05', 'Dussehra'],
    ['10-24', 'Diwali Laxmi Pujan (Muhurat)'],
    ['10-26', 'Diwali Balipratipada'],
    ['11-08', 'Gurunanak Jayanti'],
  ]),
  // The 2023 annual circular was not retrievable; this list matches recollection (secondary).
  ...year(2023, 'NSE annual list 2023 (not read from circular)', 'secondary', [
    ['01-26', 'Republic Day'],
    ['03-07', 'Holi'],
    ['03-30', 'Ram Navami'],
    ['04-04', 'Mahavir Jayanti'],
    ['04-07', 'Good Friday'],
    ['04-14', 'Ambedkar Jayanti'],
    ['05-01', 'Maharashtra Day'],
    ['06-29', 'Bakri Id (shifted from 06-28)'],
    ['08-15', 'Independence Day'],
    ['09-19', 'Ganesh Chaturthi'],
    ['10-02', 'Gandhi Jayanti'],
    ['10-24', 'Dussehra'],
    ['11-14', 'Diwali Balipratipada'],
    ['11-27', 'Gurunanak Jayanti'],
    ['12-25', 'Christmas'],
  ]),
  ...year(2024, 'NSE/CMTR/59722', 'official', [
    ['01-26', 'Republic Day'],
    ['03-08', 'Mahashivratri'],
    ['03-25', 'Holi'],
    ['03-29', 'Good Friday'],
    ['04-11', 'Id-Ul-Fitr'],
    ['04-17', 'Ram Navami'],
    ['05-01', 'Maharashtra Day'],
    ['06-17', 'Bakri Id'],
    ['07-17', 'Moharram'],
    ['08-15', 'Independence Day'],
    ['10-02', 'Gandhi Jayanti'],
    ['11-01', 'Diwali Laxmi Pujan (Muhurat)'],
    ['11-15', 'Gurunanak Jayanti'],
    ['12-25', 'Christmas'],
  ]),
  ...year(2025, 'NSE/CMTR/65587', 'official', [
    ['02-26', 'Mahashivratri'],
    ['03-14', 'Holi'],
    ['03-31', 'Id-Ul-Fitr'],
    ['04-10', 'Mahavir Jayanti'],
    ['04-14', 'Ambedkar Jayanti'],
    ['04-18', 'Good Friday'],
    ['05-01', 'Maharashtra Day'],
    ['08-15', 'Independence Day'],
    ['08-27', 'Ganesh Chaturthi'],
    ['10-02', 'Gandhi Jayanti / Dussehra'],
    ['10-21', 'Diwali Laxmi Pujan (Muhurat)'],
    ['10-22', 'Diwali Balipratipada'],
    ['11-05', 'Gurunanak Jayanti'],
    ['12-25', 'Christmas'],
  ]),
  ...year(2026, 'NSE/CMTR/71775', 'official', [
    ['01-26', 'Republic Day'],
    ['03-03', 'Holi'],
    ['03-26', 'Ram Navami'],
    ['03-31', 'Mahavir Jayanti'],
    ['04-03', 'Good Friday'],
    ['04-14', 'Ambedkar Jayanti'],
    ['05-01', 'Maharashtra Day'],
    ['05-28', 'Bakri Id'],
    ['06-26', 'Muharram'],
    ['09-14', 'Ganesh Chaturthi'],
    ['10-02', 'Gandhi Jayanti'],
    ['10-20', 'Dussehra'],
    ['11-10', 'Diwali Balipratipada'],
    ['11-24', 'Gurunanak Jayanti'],
    ['12-25', 'Christmas'],
  ]),
  // Ad hoc closures notified after the annual circulars (secondary: news reports citing circulars).
  { date: '2024-01-22', name: 'Ram Mandir consecration', confidence: 'secondary', source: 'news' },
  {
    date: '2024-05-20',
    name: 'Lok Sabha polling, Mumbai',
    confidence: 'secondary',
    source: 'news',
  },
  {
    date: '2024-11-20',
    name: 'Maharashtra assembly polling',
    confidence: 'secondary',
    source: 'news',
  },
  {
    date: '2026-01-15',
    name: 'Maharashtra civic polls (BMC)',
    confidence: 'secondary',
    source: 'news',
  },
];

const SAT_DR: SessionWindow[] = [
  { open: '09:15', close: '10:00' },
  { open: '11:30', close: '12:30' },
];
const MUHURAT_EVENING: SessionWindow[] = [{ open: '18:15', close: '19:15' }];
const FULL_DAY: SessionWindow[] = [REGULAR_WINDOW];

function special(
  date: string,
  kind: SpecialKind,
  windows: SessionWindow[],
  dateConfidence: Confidence,
  timesConfidence: Confidence,
  source: string,
): SpecialSession {
  return { date, kind, windows, dateConfidence, timesConfidence, source };
}

/** Sessions held on days that are otherwise closed (weekends or holidays). */
export const SPECIAL_SESSIONS: SpecialSession[] = [
  special('2020-02-01', 'budget', FULL_DAY, 'recalled', 'recalled', 'Union Budget Saturday'),
  special('2020-11-14', 'muhurat', MUHURAT_EVENING, 'official', 'recalled', 'NSE/CMTR/42877'),
  special('2021-11-04', 'muhurat', MUHURAT_EVENING, 'official', 'recalled', 'NSE/CMTR/46623'),
  special('2022-10-24', 'muhurat', MUHURAT_EVENING, 'official', 'recalled', 'NSE/CMTR/50560'),
  special('2023-11-12', 'muhurat', MUHURAT_EVENING, 'secondary', 'recalled', 'Diwali on Sunday'),
  special('2024-01-20', 'dr', SAT_DR, 'recalled', 'recalled', 'Saturday DR/special session'),
  special('2024-03-02', 'dr', SAT_DR, 'recalled', 'recalled', 'Saturday DR/special session'),
  special('2024-05-18', 'dr', SAT_DR, 'recalled', 'recalled', 'Saturday DR/special session'),
  special(
    '2024-11-01',
    'muhurat',
    [{ open: '18:00', close: '19:00' }],
    'official',
    'recalled',
    'NSE/CMTR/59722',
  ),
  special(
    '2025-02-01',
    'budget',
    FULL_DAY,
    'secondary',
    'secondary',
    'NSE circular 2024-12-23 (news)',
  ),
  special(
    '2025-10-21',
    'muhurat',
    [{ open: '13:45', close: '14:45' }],
    'official',
    'secondary',
    'NSE circular 2025-09-22 (news)',
  ),
  special('2026-02-01', 'budget', FULL_DAY, 'secondary', 'secondary', 'NSE/BSE notices (news)'),
  special(
    '2026-11-08',
    'muhurat',
    MUHURAT_EVENING,
    'official',
    'unconfirmed',
    'NSE/CMTR/71775; times not yet notified in the annual circular',
  ),
];
