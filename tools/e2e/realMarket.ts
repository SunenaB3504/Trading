/**
 * Real-price check for the web app (MIP v4.1 Stage 2, laptop slice). Serves the exported build and a data helper
 * that holds the market from `pnpm market:build`, switches Practise to real NSE prices, finds a stock with the
 * search box, places an order and confirms it fills at a real price under the stock's symbol, that the demo book is
 * separate, and that the real prices still open from the saved copy when the data helper is gone.
 *
 * Usage:  pnpm market:build && pnpm --filter @trading/app export:web && pnpm tsx tools/e2e/realMarket.ts
 */
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright-core';
import type { Page } from 'playwright-core';
import { FixedClock, parseLearningMarket } from '../../packages/core/src/index';
import {
  SeriesStore,
  SnapshotStore,
  createHandler,
  startServer,
} from '../../packages/data-service/src/index';
import { appReady, checkLog, openTab, serveStatic } from './support';

const { checks, check } = checkLog();
const MARKET_FILE = 'data/derived/market/learning-market-v1.json';

async function chooseReal(page: Page): Promise<void> {
  await openTab(page, 'Trade');
  await page.getByTestId('market-real').click();
  await page.getByText(/Selected: /).waitFor({ timeout: 30_000 });
}

async function placeReliance(page: Page): Promise<string> {
  await page.getByTestId('stock-search').fill('reli');
  await page.getByTestId('pick-instrument').getByText('RELIANCE', { exact: true }).click();
  await page.getByText('Selected: RELIANCE').waitFor({ timeout: 5_000 });
  await page.getByTestId('place-order').click();
  await page.getByText(/Order h-0001 placed/).waitFor({ timeout: 30_000 });
  return page.getByTestId('trade-screen').innerText();
}

async function main(): Promise<void> {
  const market = parseLearningMarket(JSON.parse(readFileSync(MARKET_FILE, 'utf8')));
  if (market === null) throw new Error('run pnpm market:build first');
  const web = await serveStatic();
  const appOrigin = `http://127.0.0.1:${(web.address() as AddressInfo).port}`;
  const handler = createHandler({
    series: new SeriesStore(),
    snapshots: new SnapshotStore(),
    clock: new FixedClock(1),
    identities: [],
    lifecycles: [],
    providerHealth: () => [],
    market,
  });
  const service = await startServer(handler, { port: 0, allowedOrigin: appOrigin });
  const serviceUrl = `http://127.0.0.1:${(service.address() as AddressInfo).port}`;
  const url = `${appOrigin}/?service=${encodeURIComponent(serviceUrl)}`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 390, height: 900 } })).newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  try {
    await page.goto(url);
    await appReady(page);
    await openTab(page, 'Trade');
    // the market file is several megabytes: wait until it has loaded before reading the note
    await page.getByTestId('market-switch').getByText(/prices to /).waitFor({ timeout: 30_000 });
    const note = await page.getByTestId('market-switch').innerText();
    check('Practise offers real NSE prices with their last date', new RegExp(`prices to ${market.to}`).test(note), note);
    await chooseReal(page);
    const book = await placeReliance(page);
    check('a real order fills at the next open under its symbol', /buy 10 of 10 RELIANCE/.test(book) && /filled/.test(book), book.slice(0, 400));
    check('the position shows the stock symbol', /RELIANCE, 10 shares/.test(book));
    await page.getByTestId('market-demo').click();
    await page.getByText(/No orders yet\.|AAA/).first().waitFor({ timeout: 10_000 });
    check('the demo book is separate', !/RELIANCE/.test(await page.getByTestId('trade-screen').innerText()));
    service.close();
    await page.goto(appOrigin); // no data helper now: the saved copy must serve
    await appReady(page);
    await openTab(page, 'Trade');
    await page.getByText(/saved copy/).waitFor({ timeout: 30_000 });
    await page.getByTestId('market-real').click();
    await page.getByText(/RELIANCE, 10 shares/).waitFor({ timeout: 30_000 });
    check('without the data helper the saved real prices and the real book still open', true);
    // a brand-new browser with no data helper: the history shipped inside the app serves (MIP v4.1 Stage 2)
    const fresh = await (await browser.newContext({ viewport: { width: 390, height: 900 } })).newPage();
    await fresh.goto(appOrigin);
    await appReady(fresh);
    await openTab(fresh, 'Trade');
    await fresh.getByTestId('market-switch').getByText(`prices to ${market.to}`).waitFor({ timeout: 60_000 });
    check('a new install with no data helper still has the bundled real prices', true);
    await openTab(fresh, 'Data');
    await fresh.getByTestId('data-screen').getByText(/mutual funds, NAVs to /).waitFor({ timeout: 60_000 });
    check('the data screen lists the bundled fund NAVs and the stock prices', /NSE stocks, prices to /.test(await fresh.getByTestId('data-screen').innerText()));
    check('no page errors', errors.length === 0, errors.join(' | '));
  } finally {
    await browser.close();
    web.close();
    service.close();
  }
  console.log(JSON.stringify({ checks }, null, 1));
  if (checks.some((c) => !c.ok)) process.exit(1);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
