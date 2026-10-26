/**
 * Mutual fund check for the web app (MIP v4.1 Stage 3). Opens Practise, Funds on the fund NAVs shipped inside the
 * app, buys a fund before the 3 pm cut-off, sees the units and the stamp duty on its contract note, then sells
 * everything and sees the exit-load note and the cash come back.
 *
 * Usage:  pnpm market:bundle && pnpm --filter @trading/app export:web && pnpm e2e:funds
 */
import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright-core';
import { appReady, checkLog, openTab, serveStatic } from './support';

const { checks, check } = checkLog();

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
    await openTab(page, 'Funds');
    await page.getByText('New fund order (virtual money)').waitFor({ timeout: 60_000 });
    await page.getByTestId('place-fund-order').click();
    await page.getByText(/Order f-0001 placed/).waitFor({ timeout: 10_000 });
    const screen = await page.getByTestId('funds-screen').innerText();
    check('the purchase shows cash left and units held', /₹9,95,000\.00/.test(screen) && /units/.test(screen), screen.slice(0, 600));
    await page.getByTestId('txn-f-0001:0').click();
    const note = await page.getByTestId('note-f-0001:0').innerText();
    check('the contract note shows the stamp duty and the units', /of which stamp duty\s*₹0\.25/.test(note) && /Units allotted/.test(note), note);
    await page.getByTestId('pick-fund-action').getByText('Sell', { exact: true }).click();
    await page.getByTestId('place-fund-order').click();
    await page.getByText(/Order f-0002 placed/).waitFor({ timeout: 10_000 });
    check('selling everything leaves no units', /No units held yet\./.test(await page.getByTestId('funds-screen').innerText()));
    await page.getByTestId('txn-f-0002:0').click();
    check('the sale note shows exit load, STT and cash received', /Exit load/.test(await page.getByTestId('note-f-0002:0').innerText()) && /Cash received/.test(await page.getByTestId('note-f-0002:0').innerText()));
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
