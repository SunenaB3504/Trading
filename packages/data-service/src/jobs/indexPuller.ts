import type { DatedClose } from '../universe/bucketInputs';
import type { FetchDeps } from '../http/fetchPolicy';
import { indexCloseAllUrl, parseIndexCloseAll } from '../size/indexCloses';
import type { RawStore } from '../store/rawStore';
import { fetchDay, pullDates } from './barPuller';
import type { Result } from './barPuller';

/**
 * Daily index closes for the beta rule (D35, D6): NSE's `ind_close_all` file lists every index for the
 * day. These are price indices, so results built on them carry the "price index" flag until a total
 * return series is found. A missing file is kept as a record, like for the bhavcopy.
 */
export const INDEX_URL_CLASS = 'nse-ind-close';

export interface IndexDay {
  date: string;
  result: Result;
  problem?: string;
}

/** Pulls the index file for every weekday in the range that is not yet held. */
export async function pullIndexRange(
  from: string,
  to: string,
  deps: FetchDeps,
  onDay: (d: IndexDay) => void = () => undefined,
): Promise<IndexDay[]> {
  const have = new Set(
    (await deps.store.list()).map((r) => `${r.urlClass}|${r.params.date ?? ''}`),
  );
  const out: IndexDay[] = [];
  for (const date of pullDates(from, to)) {
    const r = await fetchDay(deps, have, {
      urlClass: INDEX_URL_CLASS,
      provider: 'nse-index',
      url: indexCloseAllUrl(date),
      date,
    });
    const day: IndexDay = { date, ...r };
    out.push(day);
    onDay(day);
  }
  return out;
}

const decoder = new TextDecoder();

/** The closes of one index over a range from the stored files, oldest first. Name matching ignores case. */
export async function loadIndexCloses(
  store: RawStore,
  indexName: string,
  from: string,
  to: string,
): Promise<DatedClose[]> {
  const wanted = indexName.trim().toLowerCase();
  const out = new Map<string, number>();
  for (const rec of await store.list()) {
    const date = rec.params.date ?? '';
    if (rec.urlClass !== INDEX_URL_CLASS || rec.status !== 200 || date < from || date > to)
      continue;
    const body = await store.get(rec.checksum);
    if (body === null) continue;
    const row = parseIndexCloseAll(decoder.decode(body)).find(
      (r) => r.indexName.toLowerCase() === wanted,
    );
    if (row !== undefined) out.set(row.date, row.close);
  }
  return [...out.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, close]) => ({ date, close }));
}
