import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { FUNDS_FORMAT, FUNDS_VERSION, parseNav } from '@trading/core';
import type { Fund, FundNav, FundsMarket } from '@trading/core';

/** `pnpm funds:build`: the learning app's mutual fund NAVs, from a free mirror of AMFI's history, checked against AMFI. */

export interface SchemeHistory {
  meta: { scheme_name: string; isin_growth: string | null };
  data: { date: string; nav: string }[];
}

export const AMFI_LATEST_URL = 'https://portal.amfiindia.com/spages/NAVAll.txt';
export const mirrorUrl = (code: string): string => `https://api.mfapi.in/mf/${code}`;

/** `23-10-2026` to `2026-10-23`; null when it is not a date. */
export function isoDate(text: string): string | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(text.trim());
  return m === null ? null : `${m[3] as string}-${m[2] as string}-${m[1] as string}`;
}

/** NAVs oldest first. A row that does not read, or repeats a date, is left out. */
export function toNavs(history: SchemeHistory): FundNav[] {
  const seen = new Set<string>();
  const out: FundNav[] = [];
  for (const row of history.data) {
    const date = isoDate(row.date);
    const nav = parseNav(row.nav);
    if (date === null || nav === null || seen.has(date)) continue;
    seen.add(date);
    out.push([date, nav]);
  }
  return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

/** The latest NAV per scheme code in AMFI's `NAVAll.txt` (semicolon file with category lines between). */
export function amfiLatest(text: string): Map<string, { date: string; nav: number }> {
  const out = new Map<string, { date: string; nav: number }>();
  for (const line of text.split(/\r?\n/)) {
    const f = line.split(';');
    if (f.length < 8 || !/^\d+$/.test(f[0] as string)) continue;
    const date = new Date(`${(f[7] as string).trim().replace(/-/g, ' ')} UTC`);
    const nav = parseNav((f[6] as string).trim());
    if (nav !== null && !Number.isNaN(date.getTime())) out.set(f[0] as string, { date: date.toISOString().slice(0, 10), nav });
  }
  return out;
}

export interface FundSpec {
  code: string;
  kind: string;
  rules: NonNullable<Fund['rules']>;
}

const ruleOf = (t: string): FundSpec['rules'] => (t === 'equity' || t === 'debt' || t === 'liquid' ? t : 'other');

export function readSpecs(text: string): FundSpec[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'))
    .map((l) => {
      const [code, kind, rules] = l.split(';');
      return { code: (code ?? '').trim(), kind: (kind ?? '').trim(), rules: ruleOf((rules ?? '').trim()) };
    });
}

export function assembleFunds(
  specs: readonly FundSpec[],
  histories: ReadonlyMap<string, SchemeHistory>,
  latest: ReadonlyMap<string, { date: string; nav: number }>,
  builtAt: number,
): FundsMarket {
  const funds: Fund[] = [];
  const navs: Record<string, FundNav[]> = {};
  const disputed: string[] = [];
  for (const s of specs) {
    const h = histories.get(s.code);
    const rows = h === undefined ? [] : toNavs(h);
    const first = rows[0];
    const last = rows[rows.length - 1];
    if (h === undefined || first === undefined || last === undefined) continue;
    funds.push({ id: s.code, name: h.meta.scheme_name, kind: s.kind, isin: h.meta.isin_growth, rules: s.rules, firstDate: first[0], lastDate: last[0] });
    navs[s.code] = rows;
    const a = latest.get(s.code);
    const same = a === undefined ? undefined : rows.find((r) => r[0] === a.date);
    if (a !== undefined && same !== undefined && same[1] !== a.nav) disputed.push(s.code);
  }
  return { format: FUNDS_FORMAT, version: FUNDS_VERSION, builtAt, source: 'mfapi.in mirror of AMFI, checked against AMFI NAVAll', funds, navs, disputed };
}

async function getText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`${url}: HTTP ${String(res.status)}`);
  return res.text();
}

async function main(): Promise<void> {
  const out = 'data/derived/market/learning-funds-v1.json';
  const specs = readSpecs(readFileSync('data/market/learning_funds.txt', 'utf8'));
  const latest = amfiLatest(await getText(AMFI_LATEST_URL));
  const histories = new Map<string, SchemeHistory>();
  for (const s of specs) histories.set(s.code, JSON.parse(await getText(mirrorUrl(s.code))) as SchemeHistory);
  const funds = assembleFunds(specs, histories, latest, Date.now());
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(funds));
  for (const f of funds.funds) console.log(`${f.id} ${f.name}: ${f.firstDate} to ${f.lastDate}, ${(funds.navs[f.id] ?? []).length} NAVs`);
  if (funds.disputed.length > 0) console.log(`DISPUTED against AMFI: ${funds.disputed.join(', ')}`);
  console.log(`${funds.funds.length} of ${specs.length} funds written to ${out}`);
}

if (process.argv[1]?.endsWith('learningFunds.ts') === true) {
  main().catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
}
