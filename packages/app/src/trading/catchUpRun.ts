import { unzipSync } from 'fflate';
import type { CorporateAction, LearningMarket } from '@trading/core';
import { addActions, addDays, dayFileUrl, missingWeekdays, parseDay, prFileUrl, readActions } from './catchUp';
import type { DayRow } from './catchUp';

/** Fetches a URL's bytes; null when the file does not exist (a holiday), throws when the network fails. */
export type FetchBytes = (url: string) => Promise<Uint8Array | null>;

/** The most days fetched in one go: a longer gap needs a newer app build with newer bundled history. */
export const MAX_CATCH_UP_DAYS = 45;

export interface CatchUpResult {
  market: LearningMarket;
  /** Trading days added. */
  added: number;
  /** True when the network failed part-way; what was fetched before is kept. */
  interrupted: boolean;
}

function readDay(bytes: Uint8Array, date: string): DayRow[] {
  const files = unzipSync(bytes);
  const name = Object.keys(files).find((n) => n.endsWith('.csv'));
  const file = name === undefined ? undefined : files[name];
  return file === undefined ? [] : parseDay(new TextDecoder().decode(file)).filter((r) => r.bar[0] === date);
}

/** The day's corporate actions from its PR zip; a missing or unreadable `bc` file gives none. */
function readPr(m: LearningMarket, bytes: Uint8Array): CorporateAction[] {
  const files = unzipSync(bytes);
  const name = Object.keys(files).find((n) => (n.split('/').pop() ?? '').toLowerCase().startsWith('bc'));
  const file = name === undefined ? undefined : files[name];
  if (file === undefined) return [];
  try {
    return readActions(m, new TextDecoder().decode(file));
  } catch {
    return [];
  }
}

/**
 * Brings a market up to `today` by reading each missing day's NSE files: the prices, then the PR archive for that
 * day's splits, bonuses and dividends. Holidays have no file and are skipped. A day counts only when both files were
 * answered, so a network failure on the second leaves the day to be fetched again on the next open.
 */
export async function catchUp(m: LearningMarket, today: string, fetchBytes: FetchBytes): Promise<CatchUpResult> {
  const days = new Map<string, DayRow[]>();
  const actions: CorporateAction[] = [];
  let interrupted = false;
  for (const date of missingWeekdays(m.to, today).slice(0, MAX_CATCH_UP_DAYS)) {
    try {
      const bytes = await fetchBytes(dayFileUrl(date));
      if (bytes === null) continue;
      const rows = readDay(bytes, date);
      if (rows.length === 0) continue;
      const pr = await fetchBytes(prFileUrl(date));
      days.set(date, rows);
      if (pr !== null) actions.push(...readPr(m, pr));
    } catch {
      interrupted = true;
      break;
    }
  }
  const market = addActions(addDays(m, days), actions);
  return { market, added: days.size, interrupted };
}

/** The phone's real fetch: a browser-like header, since the exchange refuses bare clients. */
export const fetchBytesOnDevice: FetchBytes = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Android 14; Mobile) MarketLearning/0.1', Accept: '*/*' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${String(res.status)}`);
  return new Uint8Array(await res.arrayBuffer());
};
