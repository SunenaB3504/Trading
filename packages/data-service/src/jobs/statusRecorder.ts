import { fetchAndStore } from '../http/fetchPolicy';
import type { FetchDeps } from '../http/fetchPolicy';
import { ProviderError } from '../providers/rawBar';
import type { RawRecord, RawStore } from '../store/rawStore';
import { parseSecList, secListUrl } from '../status/secList';
import { StatusHistory } from '../status/statusHistory';
import { parseAsmReport, parseGsmReport } from '../status/surveillanceReports';

/**
 * Daily recording of the exchange's band and surveillance lists (WP-2.9). The security list has history
 * on NSE's side, but the ASM and GSM reports show only today's list and are not archived anywhere we
 * found, so the only way to have ASM for a past date is to record it on that date. Every response is
 * kept raw with its checksum; the status history is rebuilt from those records, so the archive is the
 * single source of truth.
 */
export const HOME_URL = 'https://www.nseindia.com/';
export const ASM_URL = 'https://www.nseindia.com/api/reportASM';
export const GSM_URL = 'https://www.nseindia.com/api/reportGSM';

export const URL_CLASS = {
  secList: 'nse-sec-list',
  asm: 'nse-asm-report',
  gsm: 'nse-gsm-report',
} as const;

/** `name=value` pairs of one or more Set-Cookie lines, as a Cookie header (attributes dropped). */
export function cookieHeader(setCookie: string | undefined): string {
  if (setCookie === undefined) return '';
  return setCookie
    .split('\n')
    .map((line) => line.split(';')[0]?.trim() ?? '')
    .filter((pair) => pair.includes('='))
    .join('; ');
}

export interface RecordOutcome {
  date: string;
  /** What was stored for the date; each part can fail without stopping the others. */
  stored: Array<'sec_list' | 'asm' | 'gsm'>;
  /** Plain-words reasons for anything that was not stored. */
  problems: string[];
  records: RawRecord[];
}

async function sessionCookie(deps: FetchDeps): Promise<string> {
  try {
    await deps.limiter.wait();
    // The home page may answer 403 to a script yet still set the cookie the reports accept.
    const r = await deps.client.get(HOME_URL);
    return cookieHeader(r.headers['set-cookie']);
  } catch {
    return '';
  }
}

async function fetchReport(
  deps: FetchDeps,
  kind: 'asm' | 'gsm',
  date: string,
  cookie: string,
): Promise<{ record: RawRecord; asOf: string | null } | string> {
  try {
    const { body, record } = await fetchAndStore(
      {
        provider: 'nse-status',
        urlClass: URL_CLASS[kind],
        url: kind === 'asm' ? ASM_URL : GSM_URL,
        params: { date },
        headers: { Cookie: cookie, Referer: HOME_URL, Accept: 'application/json' },
      },
      deps,
    );
    const json: unknown = JSON.parse(new TextDecoder().decode(body));
    const asOf = (kind === 'asm' ? parseAsmReport(json) : parseGsmReport(json)).asOf;
    return { record, asOf };
  } catch (e) {
    return `${kind.toUpperCase()} report not recorded: ${e instanceof Error ? e.message : 'failed'}`;
  }
}

/**
 * Records the three files for `date` (the session whose lists these are). A report that is dated another
 * day is kept but flagged and will not count as that day's status; the job says so rather than filing
 * yesterday's list under today's date.
 */
export async function recordDailyStatus(date: string, deps: FetchDeps): Promise<RecordOutcome> {
  const out: RecordOutcome = { date, stored: [], problems: [], records: [] };
  try {
    const { record } = await fetchAndStore(
      {
        provider: 'nse-status',
        urlClass: URL_CLASS.secList,
        url: secListUrl(date),
        params: { date },
      },
      deps,
    );
    out.stored.push('sec_list');
    out.records.push(record);
  } catch (e) {
    const closed = e instanceof ProviderError && e.kind === 'not-found';
    out.problems.push(
      closed
        ? 'no security list for this date (market closed?)'
        : `security list not recorded: ${e instanceof Error ? e.message : 'failed'}`,
    );
  }
  const cookie = await sessionCookie(deps);
  for (const kind of ['asm', 'gsm'] as const) {
    const r = await fetchReport(deps, kind, date, cookie);
    if (typeof r === 'string') {
      out.problems.push(r);
      continue;
    }
    out.records.push(r.record);
    if (r.asOf === date) out.stored.push(kind);
    else
      out.problems.push(
        `${kind.toUpperCase()} report is dated ${r.asOf ?? 'unknown'}, not ${date}; it will not count for ${date}`,
      );
  }
  return out;
}

/** Rebuilds the status history from everything recorded so far. */
export async function loadHistory(store: RawStore): Promise<StatusHistory> {
  const history = new StatusHistory();
  const decoder = new TextDecoder();
  for (const rec of await store.list()) {
    const date = rec.params.date;
    if (rec.provider !== 'nse-status' || date === undefined) continue;
    const body = await store.get(rec.checksum);
    if (body === null) continue;
    const text = decoder.decode(body);
    if (rec.urlClass === URL_CLASS.secList) history.addSecList(date, parseSecList(text).rows);
    else if (rec.urlClass === URL_CLASS.asm) {
      const r = parseAsmReport(JSON.parse(text));
      if (r.asOf === date) history.addAsm(date, r.entries);
    } else if (rec.urlClass === URL_CLASS.gsm) {
      const r = parseGsmReport(JSON.parse(text));
      if (r.asOf === date) history.addGsm(date, r.entries);
    }
  }
  return history;
}
