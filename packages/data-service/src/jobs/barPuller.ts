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
 * Pulls the exchange's daily files for a range of sessions and keeps them raw (WP-2.9). Per session:
 * the bhavcopy (prices, volumes and ISINs for every security) and the PR archive (corporate actions with
 * ex-dates, band-hit list and, from 2024-02-01, shares outstanding and market cap). A session already
 * stored is skipped, so a long pull can be stopped and resumed, and a failed day does not stop the rest.
 */
export const URL_CLASSES = {
  bhavLegacy: 'bhavcopy-legacy',
  bhavUdiff: 'bhavcopy-udiff',
  pr: 'nse-pr-zip',
} as const;

export interface SessionPull {
  date: string;
  /** `stored` now, `have` already in the archive, `none` if NSE has no file, `failed` for an error. */
  bhavcopy: 'stored' | 'have' | 'none' | 'failed';
  pr: 'stored' | 'have' | 'none' | 'failed';
  problems: string[];
}

async function stored(store: RawStore): Promise<Set<string>> {
  return new Set((await store.list()).map((r) => `${r.urlClass}|${r.params.date ?? ''}`));
}

async function one(
  deps: FetchDeps,
  have: Set<string>,
  urlClass: string,
  provider: 'nse-bhavcopy' | 'nse-pr',
  url: string,
  date: string,
): Promise<{ result: 'stored' | 'have' | 'none' | 'failed'; problem?: string }> {
  if (have.has(`${urlClass}|${date}`)) return { result: 'have' };
  try {
    await fetchAndStore({ provider, urlClass, url, params: { date } }, deps);
    return { result: 'stored' };
  } catch (e) {
    if (e instanceof ProviderError && e.kind === 'not-found') return { result: 'none' };
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
): Promise<SessionPull> {
  const format = bhavcopyFormatFor(date);
  const bhav = await one(
    deps,
    have,
    format === 'legacy' ? URL_CLASSES.bhavLegacy : URL_CLASSES.bhavUdiff,
    'nse-bhavcopy',
    bhavcopyUrl(date, format),
    date,
  );
  const pr = await one(deps, have, URL_CLASSES.pr, 'nse-pr', prZipUrl(date), date);
  return {
    date,
    bhavcopy: bhav.result,
    pr: pr.result,
    problems: [bhav.problem, pr.problem].filter((p): p is string => p !== undefined),
  };
}

/**
 * Every Monday to Friday in the inclusive range. The trading calendar only reaches back to 2020, and a
 * holiday simply has no file (a 404, noted as `none`), so the pull does not depend on it; the files that
 * do exist are in fact the record of which days traded.
 */
export function weekdays(from: string, to: string): string[] {
  const out: string[] = [];
  for (let n = dayNumber(from); n <= dayNumber(to); n += 1) {
    const d = fromDayNumber(n);
    if (!isWeekend(d)) out.push(d);
  }
  return out;
}

/** Pulls every session in the inclusive range that is not yet in the archive; `onSession` reports progress. */
export async function pullRange(
  from: string,
  to: string,
  deps: FetchDeps,
  onSession: (s: SessionPull) => void = () => undefined,
): Promise<SessionPull[]> {
  const have = await stored(deps.store);
  const out: SessionPull[] = [];
  for (const date of weekdays(from, to)) {
    const s = await pullSession(date, deps, have);
    out.push(s);
    onSession(s);
  }
  return out;
}

const decoder = new TextDecoder();

/** Every price row stored in the archive for sessions in the range, oldest session first. */
export async function loadBars(store: RawStore, from: string, to: string): Promise<RawBarRow[]> {
  const rows: RawBarRow[] = [];
  const records = (await store.list())
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
    rows.push(
      ...(rec.urlClass === URL_CLASSES.bhavLegacy
        ? parseBhavcopyLegacy(text)
        : parseBhavcopyUdiff(text)
      ).rows,
    );
  }
  return rows;
}

/** All corporate actions announced in the archived PR files, de-duplicated and in ex-date order. */
export async function loadActions(store: RawStore): Promise<NseAction[]> {
  const files: NseAction[][] = [];
  const done = new Set<string>();
  for (const rec of await store.list()) {
    if (rec.urlClass !== URL_CLASSES.pr || done.has(rec.checksum)) continue;
    done.add(rec.checksum);
    const body = await store.get(rec.checksum);
    if (body === null) continue;
    const bc = unzipAll(body).find((e) => e.name.toLowerCase().startsWith('bc'));
    if (bc !== undefined) files.push(parseActionsFile(decoder.decode(bc.data)).actions);
  }
  return mergeActions(files);
}
