import { dayNumber, fromDayNumber, isWeekend } from '@trading/core';
import { mergeActions, parseActionsFile } from '../corporate/nseActions';
import type { NseAction } from '../corporate/nseActions';
import { fetchAndStore } from '../http/fetchPolicy';
import type { FetchDeps } from '../http/fetchPolicy';
import {
  bhavcopyFormatFor,
  bhavcopyUrl,
  parseBhavcopyLegacy,
  parseBhavcopyUdiff,
} from '../providers/bhavcopy';
import { ProviderError } from '../providers/rawBar';
import type { RawBarRow } from '../providers/rawBar';
import { unzipAll, unzipFirst } from '../providers/zip';
import { prZipUrl } from '../size/indexCloses';
import type { RawStore } from '../store/rawStore';

/**
 * Pulls the exchange's daily files for a range of dates and keeps them raw (WP-2.9). Per session:
 * the bhavcopy (prices, volumes and ISINs for every security) and the PR archive (corporate actions with
 * ex-dates, band-hit list and, from 2024-02-01, shares outstanding and market cap). A date already
 * stored is skipped, so a long pull can be stopped and resumed, and a failed day does not stop the rest.
 * A "no such file" answer is kept too (empty body, status 404): it is what marks a holiday.
 */
export const URL_CLASSES = {
  bhavLegacy: 'bhavcopy-legacy',
  bhavUdiff: 'bhavcopy-udiff',
  pr: 'nse-pr-zip',
} as const;

export type Result = 'stored' | 'have' | 'none' | 'failed';

export interface SessionPull {
  date: string;
  /** `stored` now, `have` already in the archive, `none` if NSE has no file, `failed` for an error. */
  bhavcopy: Result;
  pr: Result;
  problems: string[];
}

export interface PullOptions {
  /** Also ask for Saturdays and Sundays (bhavcopy only), to find special sessions such as Muhurat trading. */
  weekends?: boolean;
  /** Ask again for dates whose earlier answer was "no such file". */
  recheckMissing?: boolean;
  /** Skip the PR archive, which is not published for the early years (bhavcopy only). */
  noPr?: boolean;
}

/**
 * What the archive already holds, as `urlClass|date`. `recheckMissing` ignores the "no such file"
 * records so those dates are asked for again.
 */
async function stored(store: RawStore, recheckMissing: boolean): Promise<Set<string>> {
  return new Set(
    (await store.list())
      .filter((r) => !recheckMissing || r.status === 200)
      .map((r) => `${r.urlClass}|${r.params.date ?? ''}`),
  );
}

/** One dated file: skipped if already held, kept raw if fetched, recorded as missing if the exchange has none. */
export async function fetchDay(
  deps: FetchDeps,
  have: Set<string>,
  req: {
    urlClass: string;
    provider: 'nse-bhavcopy' | 'nse-pr' | 'nse-index';
    url: string;
    date: string;
  },
): Promise<{ result: Result; problem?: string }> {
  const { urlClass, provider, url, date } = req;
  if (have.has(`${urlClass}|${date}`)) return { result: 'have' };
  try {
    await fetchAndStore({ provider, urlClass, url, params: { date } }, deps);
    return { result: 'stored' };
  } catch (e) {
    if (e instanceof ProviderError && e.kind === 'not-found') {
      await deps.store.put(
        { provider, urlClass, url, params: { date }, fetchedAt: deps.now(), status: 404 },
        new Uint8Array(),
      );
      return { result: 'none' };
    }
    return {
      result: 'failed',
      problem: `${urlClass} ${date}: ${e instanceof Error ? e.message : 'failed'}`,
    };
  }
}

export async function pullSession(
  date: string,
  deps: FetchDeps,
  have: Set<string>,
  weekend = false,
  noPr = false,
): Promise<SessionPull> {
  const format = bhavcopyFormatFor(date);
  const bhav = await fetchDay(deps, have, {
    urlClass: format === 'legacy' ? URL_CLASSES.bhavLegacy : URL_CLASSES.bhavUdiff,
    provider: 'nse-bhavcopy',
    url: bhavcopyUrl(date, format),
    date,
  });
  // No archive is published for a weekend, so only the bhavcopy is asked for there.
  const pr: { result: Result; problem?: string } =
    weekend || noPr
      ? { result: 'none' }
      : await fetchDay(deps, have, {
          urlClass: URL_CLASSES.pr,
          provider: 'nse-pr',
          url: prZipUrl(date),
          date,
        });
  return {
    date,
    bhavcopy: bhav.result,
    pr: pr.result,
    problems: [bhav.problem, pr.problem].filter((p): p is string => p !== undefined),
  };
}

/**
 * Every Monday to Friday in the inclusive range (every day with `weekends`). The trading calendar only
 * reaches back to 2020, and a holiday simply has no file, so the pull does not depend on it; the files
 * that do exist are in fact the record of which days traded.
 */
export function pullDates(from: string, to: string, weekends = false): string[] {
  const out: string[] = [];
  for (let n = dayNumber(from); n <= dayNumber(to); n += 1) {
    const d = fromDayNumber(n);
    if (weekends || !isWeekend(d)) out.push(d);
  }
  return out;
}

/** Monday to Friday only. */
export const weekdays = (from: string, to: string): string[] => pullDates(from, to);

/** Pulls every date in the inclusive range that is not yet in the archive; `onSession` reports progress. */
export async function pullRange(
  from: string,
  to: string,
  deps: FetchDeps,
  onSession: (s: SessionPull) => void = () => undefined,
  options: PullOptions = {},
): Promise<SessionPull[]> {
  const have = await stored(deps.store, options.recheckMissing === true);
  const out: SessionPull[] = [];
  for (const date of pullDates(from, to, options.weekends === true)) {
    const s = await pullSession(date, deps, have, isWeekend(date), options.noPr === true);
    out.push(s);
    onSession(s);
  }
  return out;
}

const decoder = new TextDecoder();

/** Every price row stored in the archive for sessions in the range, oldest session first. */
export async function loadBars(
  store: RawStore,
  from: string,
  to: string,
  /** Keeps a row only if this says so; applied day by day so a long range never holds every instrument in memory. */
  keep: (row: RawBarRow) => boolean = () => true,
): Promise<RawBarRow[]> {
  const rows: RawBarRow[] = [];
  const records = (await store.list())
    .filter((r) => r.status === 200)
    .filter((r) => r.urlClass === URL_CLASSES.bhavLegacy || r.urlClass === URL_CLASSES.bhavUdiff)
    .filter((r) => (r.params.date ?? '') >= from && (r.params.date ?? '') <= to)
    .sort((a, b) => ((a.params.date ?? '') < (b.params.date ?? '') ? -1 : 1));
  const done = new Set<string>();
  for (const rec of records) {
    const date = rec.params.date ?? '';
    const body = done.has(date) ? null : await store.get(rec.checksum);
    if (body === null) continue;
    done.add(date);
    const text = decoder.decode(unzipFirst(body).data);
    const day = (
      rec.urlClass === URL_CLASSES.bhavLegacy ? parseBhavcopyLegacy(text) : parseBhavcopyUdiff(text)
    ).rows;
    for (const r of day) if (keep(r)) rows.push(r);
  }
  return rows;
}

/** All corporate actions announced in the archived PR files, de-duplicated and in ex-date order. */
export async function loadActions(store: RawStore): Promise<NseAction[]> {
  const files: NseAction[][] = [];
  const done = new Set<string>();
  for (const rec of await store.list()) {
    if (rec.urlClass !== URL_CLASSES.pr || rec.status !== 200 || done.has(rec.checksum)) continue;
    done.add(rec.checksum);
    const body = await store.get(rec.checksum);
    if (body === null) continue;
    const bc = unzipAll(body).find((e) => e.name.toLowerCase().startsWith('bc'));
    if (bc !== undefined) files.push(parseActionsFile(decoder.decode(bc.data)).actions);
  }
  return mergeActions(files);
}

export interface DayEvidence {
  /** A bhavcopy was downloaded for the date. */
  bhavcopy: boolean;
  /** The exchange answered "no such file" for the bhavcopy. */
  bhavcopyMissing: boolean;
  pr: boolean;
  prMissing: boolean;
}

function note(e: DayEvidence, urlClass: string, status: number): void {
  const bhav = urlClass === URL_CLASSES.bhavLegacy || urlClass === URL_CLASSES.bhavUdiff;
  const kind = bhav ? 'bhavcopy' : urlClass === URL_CLASSES.pr ? 'pr' : null;
  if (kind === null) return;
  if (status === 200) e[kind] = true;
  if (status === 404) e[kind === 'bhavcopy' ? 'bhavcopyMissing' : 'prMissing'] = true;
}

/** What the archive says about each date it has been asked about. */
export async function dayEvidence(store: RawStore): Promise<Map<string, DayEvidence>> {
  const out = new Map<string, DayEvidence>();
  for (const r of await store.list()) {
    const date = r.params.date;
    if (date === undefined) continue;
    const e = out.get(date) ?? {
      bhavcopy: false,
      bhavcopyMissing: false,
      pr: false,
      prMissing: false,
    };
    note(e, r.urlClass, r.status);
    out.set(date, e);
  }
  return out;
}

export interface DerivedCalendar {
  /** Weekdays with a bhavcopy: the exchange traded. */
  sessions: string[];
  /** Weekdays where both the bhavcopy and the PR archive are missing: a holiday. */
  holidays: string[];
  /** Saturdays and Sundays with a bhavcopy: special sessions. */
  weekendSessions: string[];
  /** Weekdays the archive cannot settle: only one file missing, or never asked. */
  uncertain: string[];
}

/** Which days the exchange traded, from the files it published (WP-2.9). */
export function deriveCalendar(
  evidence: ReadonlyMap<string, DayEvidence>,
  from: string,
  to: string,
): DerivedCalendar {
  const out: DerivedCalendar = { sessions: [], holidays: [], weekendSessions: [], uncertain: [] };
  for (const date of pullDates(from, to, true)) {
    const e = evidence.get(date);
    if (isWeekend(date)) {
      if (e?.bhavcopy === true) out.weekendSessions.push(date);
    } else if (e?.bhavcopy === true) out.sessions.push(date);
    else if (e?.bhavcopyMissing === true && e.prMissing) out.holidays.push(date);
    else out.uncertain.push(date);
  }
  return out;
}
