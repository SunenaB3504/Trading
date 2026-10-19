/// <reference lib="dom" />
/**
 * Birth-details screen check for the web app (WP-4.7, FR-P4, FR-P5, FR-P10, NFR-4). With the optional layer
 * switched on: the tab appears, details are validated, saved encrypted, survive a reload, produce the chart
 * facts, make no request that carries them, and are destroyed with their key on delete. With the layer off
 * the tab does not exist.
 *
 * Usage:  pnpm --filter @trading/app export:web && pnpm tsx tools/e2e/profile.ts
 */
import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright-core';
import type { Browser, Page } from 'playwright-core';
import { checkLog, serveStatic } from './support';

const { checks, check } = checkLog();

const idb = (page: Page, db: string, store: string): Promise<Array<[string, unknown]>> =>
  page.evaluate(
    ([name, st]) =>
      new Promise<Array<[string, unknown]>>((res, rej) => {
        const open = indexedDB.open(name as string);
        open.onerror = () => rej(open.error);
        open.onsuccess = () => {
          const d = open.result;
          if (!d.objectStoreNames.contains(st as string)) {
            d.close();
            res([]);
            return;
          }
          const s = d.transaction(st as string).objectStore(st as string);
          const keys = s.getAllKeys();
          keys.onsuccess = () => {
            const vals = s.getAll();
            vals.onsuccess = () => {
              d.close();
              res(
                keys.result.map((k, i) => {
                  const v = vals.result[i];
                  const isKey = typeof CryptoKey !== 'undefined' && v instanceof CryptoKey;
                  return [
                    String(k),
                    isKey ? { extractable: v.extractable, alg: v.algorithm.name } : v,
                  ];
                }),
              );
            };
          };
        };
      }),
    [db, store],
  );

async function openProfile(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.getByRole('tab', { name: 'Profile', exact: true }).waitFor({ timeout: 30_000 });
  await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  await page.getByTestId('profile-screen').waitFor({ timeout: 30_000 });
}

async function fillForm(page: Page, date: string): Promise<void> {
  await page.getByTestId('birth-name').fill('Test Person');
  await page.getByTestId('birth-date').fill(date);
  await page.getByTestId('birth-time').fill('12:00');
}

async function pickMumbai(page: Page): Promise<void> {
  await page.getByTestId('place-input').fill('Mumbai');
  await page.getByTestId('place-0').click();
}

async function validation(page: Page): Promise<void> {
  await page
    .getByTestId('profile-screen')
    .getByText('Your birth details', { exact: true })
    .waitFor({ timeout: 30_000 });
  const text = await page.getByTestId('profile-screen').innerText();
  check('the weaker web protection is stated up front', /key is kept in this browser/.test(text));
  check('the place data credit is shown', /GeoNames.*CC BY 4\.0/.test(text));
  await fillForm(page, '1990-01-01');
  await page.getByTestId('profile-save').click();
  await page.getByText(/Search for your birth place/).waitFor({ timeout: 10_000 });
  check('saving without a chosen place is refused with a message', true);
  await pickMumbai(page);
  await page.getByTestId('birth-date').fill('2020-02-30');
  await page.getByTestId('profile-save').click();
  await page.getByText(/Not a real date and time/).waitFor({ timeout: 10_000 });
  check('an impossible date is refused with a message', true);
  check(
    'nothing was saved after the refusals',
    (await idb(page, 'trading-app', 'kv')).every(([k]) => k !== 'profile/birth'),
  );
}

async function saveAndShow(page: Page): Promise<void> {
  await page.getByTestId('birth-date').fill('1990-01-01');
  await page.getByTestId('profile-save').click();
  await page.getByText('Your chart facts').waitFor({ timeout: 15_000 });
  const text = await page.getByTestId('profile-screen').innerText();
  check(
    'the chart facts are shown',
    /Rising sign/.test(text) && /Moon sign/.test(text) && /Birth star/.test(text),
  );
  check('Indu Lagna reads pending verification', /Indu Lagna\s*pending verification/.test(text));
  check(
    'the clock time used is Mumbai noon as 06:30 UTC',
    /1990-01-01T06:30 UTC, from Asia\/Kolkata at \+05:30/.test(text),
  );
}

async function encryption(page: Page): Promise<void> {
  const stored = (await idb(page, 'trading-app', 'kv')).find(([k]) => k === 'profile/birth');
  const raw = typeof stored?.[1] === 'string' ? stored[1] : '';
  check('the saved record is there', raw !== '');
  check(
    'it holds no name, date, time or place',
    !/Test Person|1990|12:00|Mumbai/.test(raw) && /"v":1/.test(raw),
    raw.slice(0, 60),
  );
  const key = (await idb(page, 'trading-app-keys', 'keys')).find(([k]) => k === 'birth');
  check(
    'the key is an AES-GCM key that cannot be exported',
    JSON.stringify(key?.[1]) === JSON.stringify({ extractable: false, alg: 'AES-GCM' }),
    JSON.stringify(key),
  );
}

async function afterReload(page: Page, url: string): Promise<void> {
  await openProfile(page, url);
  await page.getByText('Your chart facts').waitFor({ timeout: 15_000 });
  check('after a reload the layer is still on and the details decrypt', true);
}

async function deleteAll(page: Page): Promise<void> {
  await page.getByTestId('profile-delete').click();
  await page.getByText(/Press again to delete/).waitFor({ timeout: 10_000 });
  await page.getByTestId('profile-delete').click();
  await page.getByText('Your birth details', { exact: true }).waitFor({ timeout: 15_000 });
  check('delete returns to an empty form', true);
  check(
    'the record is gone',
    (await idb(page, 'trading-app', 'kv')).every(([k]) => k !== 'profile/birth'),
  );
  check('and so is the key', (await idb(page, 'trading-app-keys', 'keys')).length === 0);
}

async function lockedDevice(browser: Browser, url: string): Promise<void> {
  const page = await (
    await browser.newContext({ viewport: { width: 1000, height: 800 } })
  ).newPage();
  await page.goto(url);
  await page.getByRole('tab', { name: 'Ledger', exact: true }).waitFor({ timeout: 30_000 });
  await page.waitForTimeout(800);
  check(
    'with the layer off there is no Profile tab',
    (await page.getByRole('tab', { name: 'Profile', exact: true }).count()) === 0,
  );
  const saved = (await idb(page, 'trading-app', 'kv')).map(([k]) => k);
  const keyCount = (await idb(page, 'trading-app-keys', 'keys')).length;
  check(
    'and nothing was written for the layer: no record, no switch, no key',
    !saved.includes('profile/birth') && !saved.includes('settings/layer') && keyCount === 0,
    saved.join(', '),
  );
  await page.close();
}

async function unlockedFlow(page: Page, url: string, requests: string[]): Promise<void> {
  await openProfile(page, `${url}?layer=on`);
  await validation(page);
  await saveAndShow(page);
  await encryption(page);
  await afterReload(page, url);
  check(
    'no request carried the details or left this machine',
    requests.every(
      (u) =>
        u.startsWith('http://127.0.0.1') &&
        !/Test Person|1990-01-01|Mumbai/.test(decodeURIComponent(u)),
    ),
  );
  await deleteAll(page);
}

async function main(): Promise<void> {
  const web = await serveStatic();
  const url = `http://127.0.0.1:${(web.address() as AddressInfo).port}/`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (
    await browser.newContext({ viewport: { width: 1000, height: 900 } })
  ).newPage();
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  page.on('pageerror', (e) => errors.push(String(e)));
  try {
    await unlockedFlow(page, url, requests);
    await lockedDevice(browser, url);
    check('no page errors', errors.length === 0, errors.join(' | '));
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
