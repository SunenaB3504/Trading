/**
 * Stop and GTT order check for the web app (MIP v4.1 Stage 3). Buys a stock, places a good-till-triggered stop that
 * never triggers, sees it wait with a Cancel button, cancels it, then places a GTT target that the demo prices
 * reach and confirms it sells the position. Also checks the form shows the trigger and lifetime fields only for
 * the order types that use them, and that a stop-limit with a limit on the wrong side of its trigger is explained.
 *
 * Usage:  pnpm --filter @trading/app export:web && pnpm e2e:stops
 */
import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright-core';
import type { Page } from 'playwright-core';
import { appReady, checkLog, openTab, serveStatic } from './support';

const { checks, check } = checkLog();

async function pick(page: Page, group: string, label: string): Promise<void> {
  await page.getByTestId(group).getByText(label, { exact: true }).click();
}

async function form(page: Page): Promise<void> {
  await openTab(page, 'Trade');
  await page.getByText('New order (virtual money)').waitFor({ timeout: 30_000 });
  check('a market order shows no trigger or lifetime fields', (await page.getByTestId('trigger-input').count()) === 0 && (await page.getByTestId('pick-validity').count()) === 0);
  await pick(page, 'pick-type', 'Stop-loss limit (SL)');
  check('a stop-loss limit order shows trigger, limit and lifetime', (await page.getByTestId('trigger-input').count()) === 1 && (await page.getByTestId('limit-input').count()) === 1 && (await page.getByTestId('pick-validity').count()) === 1);
  await pick(page, 'pick-type', 'Market');
}

async function buy(page: Page): Promise<void> {
  await page.getByTestId('place-order').click();
  await page.getByText(/Order h-0001 placed/).waitFor({ timeout: 10_000 });
  check('the buy is filled', /buy 10 of 10 AAA/.test(await page.getByTestId('order-list').innerText()));
}

async function wrongLimit(page: Page): Promise<void> {
  await pick(page, 'pick-side', 'sell');
  await pick(page, 'pick-type', 'Stop-loss limit (SL)');
  await page.getByTestId('trigger-input').fill('950');
  await page.getByTestId('limit-input').fill('960');
  await page.getByTestId('place-order').click();
  await page.getByText(/at or below the trigger price/).waitFor({ timeout: 10_000 });
  check('a sell stop-limit with its limit above the trigger is explained', true);
}

async function waitingGtt(page: Page): Promise<void> {
  await pick(page, 'pick-type', 'Stop-loss market (SL-M)');
  await pick(page, 'pick-validity', 'Good till triggered (GTT)');
  await page.getByTestId('trigger-input').fill('500');
  await page.getByTestId('place-order').click();
  await page.getByText(/Order h-0002 placed and waiting/).waitFor({ timeout: 10_000 });
  const book = await page.getByTestId('order-list').innerText();
  check('the GTT stop waits and says what it is', /stop-loss market \(SL-M\) when the price falls to ₹500\.00, good till triggered/.test(book) && /pending/.test(book), book.slice(0, 300));
  await page.getByTestId('cancel-h-0002').click();
  await page.getByText('Order h-0002 cancelled.').waitFor({ timeout: 10_000 });
  check('the waiting order can be cancelled', /cancelled/.test(await page.getByTestId('order-list').innerText()));
}

async function target(page: Page): Promise<void> {
  await pick(page, 'pick-when', 'Price rises to');
  await page.getByTestId('trigger-input').fill('1200');
  await page.getByTestId('place-order').click();
  await page.getByText(/Order h-0003 placed/).waitFor({ timeout: 10_000 });
  const screen = await page.getByTestId('trade-screen').innerText();
  check('a GTT target reached by the prices sells the position', /No open positions/.test(screen), screen.slice(0, 400));
}

async function main(): Promise<void> {
  const web = await serveStatic();
  const url = `http://127.0.0.1:${(web.address() as AddressInfo).port}/`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 390, height: 900 } })).newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  try {
    await page.goto(url);
    await appReady(page);
    await form(page);
    await buy(page);
    await wrongLimit(page);
    await waitingGtt(page);
    await target(page);
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
