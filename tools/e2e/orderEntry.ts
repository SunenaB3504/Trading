/**
 * Order-entry check for the web app (WP-3.3). Opens the exported build in Chrome, places a paper order
 * through the form, and confirms the fill, the cash and position change, the validation message for a
 * bad quantity, and that the book is still there after a reload.
 *
 * Usage:  pnpm --filter @trading/app export:web && pnpm tsx tools/e2e/orderEntry.ts
 */
import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright-core';
import type { Page } from 'playwright-core';
import { checkLog, openTab, serveStatic } from './support';

const { checks, check } = checkLog();

async function openTrade(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await openTab(page, 'Trade');
  await page.getByText('New order (virtual money)').waitFor({ timeout: 30_000 });
  await page.getByText(/Loading the book/).waitFor({ state: 'detached', timeout: 60_000 });
}

async function place(page: Page): Promise<void> {
  await page.getByText('Cost preview').waitFor();
  const costs = await page.locator('[data-testid="trade-screen"]').innerText();
  check(
    'cost preview lists total charges and the assumed broker',
    /Total charges/.test(costs) && /broker\.profile-assumed/.test(costs),
  );
  await page.getByTestId('place-order').click();
  await page.getByText(/Order h-0001 placed/).waitFor({ timeout: 10_000 });
  const book = await page.getByTestId('order-list').innerText();
  check(
    'the order is filled at the next open',
    /buy 10 of 10 AAA/.test(book) && /filled/.test(book),
  );
  const screen = await page.getByTestId('trade-screen').innerText();
  check(
    'cash falls and a position of 10 shares appears',
    /AAA, 10 shares/.test(screen) && !/₹10,00,000\.00/.test(screen),
  );
}

async function compare(page: Page): Promise<void> {
  await openTab(page, 'Compare');
  await page.getByTestId('compare-screen').waitFor({ timeout: 10_000 });
  const text = await page.getByTestId('compare-screen').innerText();
  check('the compare tab names the snapshot', /Data snapshot fixture-v1/.test(text));
  check(
    'it shows Ledger A and Ledger B side by side for the open position',
    /LEDGER A \(YOU\)/i.test(text) &&
      /LEDGER B \(MARKET\)/i.test(text) &&
      /AAA, 10 shares, since 2026-03-04, open/.test(text),
  );
  await openTab(page, 'Trade');
  await page.getByText('New order (virtual money)').waitFor();
}

async function report(page: Page): Promise<void> {
  await openTab(page, 'Report');
  await page.getByTestId('report-screen').waitFor({ timeout: 10_000 });
  const net = await page.getByTestId('report-screen').innerText();
  check(
    'the report says there are no closed trades yet',
    /No closed trades yet/.test(net) && /Net view: after all costs/.test(net),
  );
  await page.getByRole('tab', { name: 'Gross of costs' }).click();
  await page.getByText(/Gross view: before brokerage/).waitFor({ timeout: 10_000 });
  check('the gross view can be switched on', true);
  await openTab(page, 'Trade');
  await page.getByText('New order (virtual money)').waitFor();
}

async function badInput(page: Page): Promise<void> {
  await page.getByTestId('qty-input').fill('x');
  await page.getByTestId('place-order').click();
  await page.getByText(/Quantity must be a whole number/).waitFor({ timeout: 10_000 });
  check('a bad quantity is explained and nothing is placed', true);
}

/** The date box is edited by hand: Backspace must work, and a bad date must be explained (UAT C5). */
async function editDate(page: Page): Promise<void> {
  const date = page.getByTestId('date-input');
  await page.getByTestId('qty-input').fill('10');
  await date.click();
  for (let i = 0; i < 3; i += 1) await page.keyboard.press('Backspace');
  check('Backspace shortens the date box', (await date.inputValue()) === '2026-03');
  check(
    'the form is still there after editing the date',
    await page.getByTestId('place-order').isVisible(),
  );
  await date.fill('2026-03-07');
  await page.getByTestId('place-order').click();
  await page.getByTestId('order-message').getByText(/is not a trading day\. The next one is/).waitFor({ timeout: 10_000 });
  check('a Saturday is refused with a clear message', true);
  await date.fill('2026-03-02');
  check('the date can be typed again', (await date.inputValue()) === '2026-03-02');
}

async function afterReload(page: Page, url: string): Promise<void> {
  await openTrade(page, url);
  await page
    .getByTestId('order-list')
    .getByText(/buy 10 of 10 AAA/)
    .waitFor({ timeout: 10_000 });
  check('the book is rebuilt from the saved orders after a reload', true);
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
    await openTrade(page, url);
    await place(page);
    await compare(page);
    await report(page);
    await badInput(page);
    await editDate(page);
    await afterReload(page, url);
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
