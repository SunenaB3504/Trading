/**
 * Profiles check for the web app (MIP Stage 1, exit gate 4). The first start makes the "Owner" profile and shows
 * the "not advice" note; a second profile is added and opened, an order placed in it stays out of Owner's book, a
 * PIN set on it is asked for after a reload (a wrong PIN is refused), and the PIN screen can open Owner instead.
 *
 * Usage:  pnpm --filter @trading/app export:web && pnpm tsx tools/e2e/profiles.ts
 */
import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright-core';
import type { Page } from 'playwright-core';
import { appReady, checkLog, openTab, serveStatic } from './support';

const { checks, check } = checkLog();

async function orderCount(page: Page): Promise<number> {
  await openTab(page, 'Trade');
  await page.getByText('New order (virtual money)').waitFor({ timeout: 15_000 });
  await page.getByText(/Loading the book/).waitFor({ state: 'detached', timeout: 10_000 });
  const text = await page.getByTestId('trade-screen').innerText();
  return /No orders yet\./.test(text) ? 0 : (text.match(/buy \d+ of/g) ?? []).length;
}

async function firstStart(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await appReady(page);
  check('the first start opens a profile called Owner', (await page.getByTestId('profile-badge').innerText()) === 'Owner');
  check('the "not advice" note is shown', await page.getByTestId('disclaimer').isVisible());
  await page.getByTestId('accept-disclaimer').click();
  await page.getByTestId('disclaimer').waitFor({ state: 'detached', timeout: 5_000 });
  check('the note goes away once accepted', true);
}

async function addAndUseNeil(page: Page): Promise<void> {
  await openTab(page, 'Profiles');
  await page.getByTestId('new-profile-name').fill('Neil');
  await page.getByTestId('add-profile').click();
  await page.getByText('Profile added.').waitFor({ timeout: 5_000 });
  await page.getByRole('button', { name: 'Open Neil', exact: true }).click();
  await page.getByTestId('profile-badge').getByText('Neil').waitFor({ timeout: 5_000 });
  check('a second profile can be added and opened', true);
  check('Neil starts with an empty book', (await orderCount(page)) === 0);
  await page.getByTestId('place-order').click();
  await page.getByText(/Order h-0001 placed/).waitFor({ timeout: 15_000 });
  check('an order placed as Neil is in Neil’s book', (await orderCount(page)) === 1);
}

async function pinAndSwitch(page: Page, url: string): Promise<void> {
  await openTab(page, 'Profiles');
  await page.getByTestId('new-pin').fill('2468');
  await page.getByTestId('set-pin').click();
  await page.getByText('PIN set.').waitFor({ timeout: 5_000 });
  await page.goto(url);
  await page.getByTestId('pin-screen').waitFor({ timeout: 30_000 });
  check('after a reload Neil’s PIN is asked for', true);
  await page.getByTestId('pin-input').fill('1111');
  await page.getByTestId('pin-open').click();
  await page.getByText('That PIN is not right.').waitFor({ timeout: 5_000 });
  check('a wrong PIN is refused', true);
  await page.getByTestId('pin-input').fill('2468');
  await page.getByTestId('pin-open').click();
  await appReady(page);
  check('the right PIN opens Neil', (await page.getByTestId('profile-badge').innerText()) === 'Neil');
  await page.goto(url);
  await page.getByTestId('pin-screen').waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Owner', exact: true }).click();
  await appReady(page);
  check('the PIN screen can open Owner instead', (await page.getByTestId('profile-badge').innerText()) === 'Owner');
  check('Owner’s book does not hold Neil’s order', (await orderCount(page)) === 0);
}

async function main(): Promise<void> {
  const web = await serveStatic();
  const url = `http://127.0.0.1:${(web.address() as AddressInfo).port}/`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 390, height: 900 } })).newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  try {
    await firstStart(page, url);
    await addAndUseNeil(page);
    await pinAndSwitch(page, url);
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
