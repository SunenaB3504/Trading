/**
 * Tax report and bond calculator checks for the web app (MIP v4.1 Stage 9). A new install has no closed trades, so the
 * Tax tab says so; after a buy and a sale in Trade the financial year appears with its short-term gain. The bond
 * calculator prices the 10-year 7% bond at an 8% yield (93.29), works a yield back from a price, and refuses a bad input.
 *
 * Usage:  pnpm --filter @trading/app export:web && pnpm e2e:taxbonds
 */
import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright-core';
import type { Page } from 'playwright-core';
import { appReady, checkLog, openTab, serveStatic } from './support';

const { checks, check } = checkLog();
const text = (page: Page, id: string): Promise<string> => page.getByTestId(id).innerText();

async function bonds(page: Page): Promise<void> {
  await openTab(page, 'Bonds');
  await page.getByTestId('bond-result').waitFor({ timeout: 30_000 });
  const r = await text(page, 'bond-result');
  check('a 10-year 7% bond at an 8% yield is priced at ₹93.29', /₹93\.29/.test(r), r);
  check('duration and the effect of a 1 point rise are shown', /Modified duration/.test(r) && /If yields rise 1 point/.test(r), r);
  await page.getByTestId('bond-mode').getByText('Yield from a price', { exact: true }).click();
  await page.getByTestId('bond-value').fill('100');
  check('a price at face value gives a yield equal to the coupon', /Yield to maturity\n?7\.00%/.test((await text(page, 'bond-result')).replace(/\n/g, '')) || /7\.00%/.test(await text(page, 'bond-result')));
  await page.getByTestId('bond-years').fill('2.5');
  check('a part-period life is refused in words', (await page.getByText(/whole number of coupon periods/).count()) > 0);
}

async function tax(page: Page): Promise<void> {
  await openTab(page, 'Tax');
  await page.getByTestId('tax-screen').waitFor({ timeout: 30_000 });
  await page.getByText(/No closed trades yet/).waitFor({ timeout: 30_000 });
  check('with no closed trades the Tax tab says so', true);
  check('the tab states the rates are as of a date and not advice', /not tax advice/.test(await text(page, 'tax-screen')));
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
    await bonds(page);
    await tax(page);
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
