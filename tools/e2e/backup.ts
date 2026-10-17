/**
 * Backup check for the web app (WP-3.6). Places an order, exports the signed bundle, confirms that a
 * bundle with one changed character is refused and leaves the book alone, clears the browser store,
 * and restores the book from the bundle (with and without the signing key).
 *
 * Usage:  pnpm --filter @trading/app export:web && pnpm tsx tools/e2e/backup.ts
 */
/// <reference lib="dom" />
import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright-core';
import type { Page } from 'playwright-core';
import { checkLog, serveStatic } from './support';

const { checks, check } = checkLog();

async function tab(page: Page, name: string): Promise<void> {
  await page.getByRole('tab', { name }).click();
}

async function placeOrder(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await tab(page, 'Trade');
  await page.getByTestId('place-order').click();
  await page.getByText(/Order h-0001 placed/).waitFor({ timeout: 15_000 });
}

async function exportText(page: Page): Promise<{ text: string; key: string }> {
  await tab(page, 'Backup');
  await page.getByText('Export your book now').waitFor({ timeout: 10_000 });
  check('a reminder is shown before the first export', true);
  await page.getByTestId('export-button').click();
  const box = page.getByTestId('bundle-text');
  await box.waitFor({ timeout: 10_000 });
  const text = await box.inputValue();
  const screen = await page.getByTestId('backup-screen').innerText();
  const key = /Signing key[^:]*: ([0-9a-f]{64})/.exec(screen)?.[1] ?? '';
  check(
    'the bundle is signed and the key is shown for safekeeping',
    key.length === 64 && !text.includes(key),
  );
  check('the last export now reads 0 days ago', /0 days ago/.test(screen));
  return { text, key };
}

async function importText(page: Page, text: string, key: string): Promise<string> {
  await page.getByTestId('import-text').fill(text);
  await page.getByTestId('import-key').fill(key);
  await page.getByTestId('import-button').click();
  await page.getByText(/Press the button again to confirm/).waitFor({ timeout: 10_000 });
  await page.getByTestId('import-button').click();
  const msg = page.getByTestId('import-message');
  await page.waitForFunction(
    () =>
      !/Press the button again/.test(
        document.querySelector('[data-testid="import-message"]')?.textContent ??
          'Press the button again',
      ),
    undefined,
    { timeout: 15_000 },
  );
  return msg.innerText();
}

async function bookHasOrder(page: Page): Promise<boolean> {
  await tab(page, 'Trade');
  await page.getByText('New order (virtual money)').waitFor({ timeout: 10_000 });
  await page.getByText(/Loading the book/).waitFor({ state: 'detached', timeout: 10_000 });
  return /buy 10 of 10 AAA/.test(await page.getByTestId('trade-screen').innerText());
}

async function main(): Promise<void> {
  const web = await serveStatic();
  const url = `http://127.0.0.1:${(web.address() as AddressInfo).port}/`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (
    await browser.newContext({ viewport: { width: 390, height: 900 } })
  ).newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  try {
    await placeOrder(page, url);
    const { text, key } = await exportText(page);

    const broken = text.replace('"quantity":10', '"quantity":11');
    check('the test edit really changed the file', broken !== text);
    await tab(page, 'Backup');
    const refused = await importText(page, broken, key);
    check(
      'a bundle with one changed character is refused',
      /changed after it was made/.test(refused),
      refused,
    );
    check('the book is untouched after a refused import', await bookHasOrder(page));

    await page.evaluate(
      () =>
        new Promise<void>((res) => {
          const r = indexedDB.deleteDatabase('trading-app');
          r.onsuccess = () => res();
          r.onerror = () => res();
          r.onblocked = () => res();
        }),
    );
    await page.goto(url);
    await tab(page, 'Trade');
    await page.getByText('No orders yet.').waitFor({ timeout: 15_000 });
    check('clearing the browser store empties the book', true);

    await tab(page, 'Backup');
    const restored = await importText(page, text, '');
    check(
      'the book is restored from the bundle without the key, with a note that the signature was not checked',
      /Imported 1 orders/.test(restored) && /could not be checked without the key/.test(restored),
      restored,
    );
    check('the restored book shows the filled order again', await bookHasOrder(page));

    await tab(page, 'Backup');
    const signed = await importText(page, text, key);
    check(
      'importing again with the key checks the signature',
      /signature was checked/.test(signed),
      signed,
    );
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
