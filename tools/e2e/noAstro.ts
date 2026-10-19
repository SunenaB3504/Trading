/// <reference lib="dom" />
/**
 * No-astro check for the web app (UAT I1, FR-P10). Opens the exported build in Chrome and confirms that
 * nothing astro-derived reaches a user whose paid layer is locked: not in the text, labels or placeholders
 * of any tab (before and after placing an order), not in an exported bundle, not in anything saved on the
 * device, not in any network request, and that the ephemeris library is not in the shipped code.
 *
 * Usage:  pnpm --filter @trading/app export:web && pnpm tsx tools/e2e/noAstro.ts
 */
import { readdirSync, readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import type { Page } from 'playwright-core';
import { checkLog, dist, serveStatic } from './support';

const { checks, check } = checkLog();

const TABS = ['Ledger', 'Universe', 'Trade', 'Compare', 'Report', 'Backup', 'Data'];

/** The words of the UAT list plus the gate's own list and a few near neighbours. */
const ASTRO =
  /\b(nakshatra|naksatra|nakṣatra|rashi|rasi|rāśi|dasha|daśā|dosha|tithi|lagna|tara|chandra\w*|chandrashtama|jyotish\w*|jyotisham|planet\w*|vedha|kota|kundli|janma|horoscope|zodiac|panchang|astro\w*|ephemeris|ayanamsa|ayanāṃśa)\b/i;

const hits = (text: string): string[] => {
  const found = new Set<string>();
  for (const m of text.matchAll(new RegExp(ASTRO.source, 'gi'))) found.add(m[0].toLowerCase());
  return [...found];
};

/** Everything a person could read on the page: text, labels, placeholders, titles, field values. */
function readable(): string {
  const parts = [document.title, document.body.innerText];
  for (const el of Array.from(document.querySelectorAll('*'))) {
    for (const a of ['aria-label', 'placeholder', 'title', 'alt', 'aria-description'])
      parts.push(el.getAttribute(a) ?? '');
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) parts.push(el.value);
  }
  return parts.join('\n');
}

async function scanTabs(page: Page, label: string): Promise<void> {
  for (const name of TABS) {
    await page.getByRole('tab', { name, exact: true }).first().click();
    await page.waitForTimeout(500);
    const found = hits(await page.evaluate(readable));
    check(`${label}: no astro words on the ${name} tab`, found.length === 0, found.join(', '));
  }
}

async function placeOrderAndExport(page: Page): Promise<string> {
  await page.getByRole('tab', { name: 'Trade', exact: true }).first().click();
  await page.getByTestId('place-order').click();
  await page.getByText(/Order h-0001 placed/).waitFor({ timeout: 15_000 });
  await page.getByRole('tab', { name: 'Backup', exact: true }).first().click();
  await page.getByTestId('export-button').click();
  const box = page.getByTestId('bundle-text');
  await box.waitFor({ timeout: 10_000 });
  return box.inputValue();
}

/** Every key and value held in IndexedDB, as one string. */
function savedData(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      new Promise<string>((res, rej) => {
        const req = indexedDB.open('trading-app', 1);
        req.onerror = () => rej(req.error);
        req.onsuccess = () => {
          const store = req.result.transaction('kv').objectStore('kv');
          const keys = store.getAllKeys();
          keys.onsuccess = () => {
            const vals = store.getAll();
            vals.onsuccess = () => res(JSON.stringify({ keys: keys.result, values: vals.result }));
          };
        };
      }),
  );
}

function shippedCode(): string {
  const files = readdirSync(dist, { recursive: true }) as string[];
  return files
    .filter((f) => /\.(js|html)$/.test(f))
    .map((f) => readFileSync(join(dist, f), 'utf8'))
    .join('\n');
}

async function main(): Promise<void> {
  const web = await serveStatic();
  const url = `http://127.0.0.1:${(web.address() as AddressInfo).port}/`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (
    await browser.newContext({ viewport: { width: 1200, height: 900 } })
  ).newPage();
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  try {
    const known = hits(
      'Nakshatra Rashi Dasha Tithi Lagna Tara Bala Chandrashtama Jyotisham planets Kundli',
    );
    check('the detector catches known astro words', known.length >= 10, known.join(', '));
    check(
      'and leaves ordinary words alone',
      hits('Tata Consultancy Services, Reliance, ACCENTMIC, Total charges, transit of goods')
        .length === 0,
    );
    await page.goto(url);
    await page.getByRole('tab', { name: 'Ledger' }).waitFor({ timeout: 30_000 });
    await scanTabs(page, 'before an order');
    const bundle = await placeOrderAndExport(page);
    await scanTabs(page, 'after an order and an export');
    check(
      'the exported bundle has no astro words',
      hits(bundle).length === 0,
      hits(bundle).join(', '),
    );
    const saved = await savedData(page);
    check(
      'nothing astro-like is saved on the device',
      hits(saved).length === 0,
      hits(saved).join(', '),
    );
    const keys = (JSON.parse(saved) as { keys: string[] }).keys;
    check(`saved items looked at: ${keys.length}`, keys.length >= 2, keys.join(', '));
    const web3 = requests.filter((u) => !u.startsWith('http://127.0.0.1'));
    check('no request leaves this machine', web3.length === 0, web3.join(', '));
    check(
      'no request carries an astro word',
      requests.every((u) => hits(u).length === 0),
    );
    const code = shippedCode();
    check(
      'the ephemeris library is not in the shipped app',
      !/astronomy-engine|VSOP87/i.test(code),
    );
  } finally {
    await browser.close();
    web.close();
  }
  console.log(JSON.stringify({ checks }, null, 1));
  if (checks.some((c) => !c.ok)) process.exit(1);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
