/**
 * Real-price check for the web app (MIP v4.1 Stage 2, laptop slice). Serves the exported build and a data helper
 * that holds the market from `pnpm market:build`. Practise uses the real NSE prices on its own (there is no demo
 * switch any more); a stock is found on the search screen, an order fills at a real price under the stock's symbol,
 * and the real prices and book still open from the saved copy when the data helper is gone.
 *
 * Usage:  pnpm market:build && pnpm --filter @trading/app export:web && pnpm tsx tools/e2e/realMarket.ts
 */
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright-core';
import type { Page } from 'playwright-core';
import { FixedClock, parseLearningMarket, sessionOn } from '../../packages/core/src/index';
import {
  SeriesStore,
  SnapshotStore,
  createHandler,
  startServer,
} from '../../packages/data-service/src/index';
import { appReady, checkLog, openTab, serveStatic } from './support';

const { checks, check } = checkLog();
const MARKET_FILE = 'data/derived/market/learning-market-v1.json';

async function openRealTrade(page: Page): Promise<void> {
  await openTab(page, 'Trade');
  await page.getByTestId('stock-search-open').waitFor({ timeout: 60_000 });
}

/** The prices line on Settings, Data. */
async function pricesNote(page: Page, to: string): Promise<string> {
  await openTab(page, 'Data');
  await page.getByTestId('data-screen').getByText(new RegExp(`prices to ${to}`)).waitFor({ timeout: 60_000 });
  return page.getByTestId('data-screen').innerText();
}

async function placeReliance(page: Page): Promise<string> {
  await page.getByTestId('stock-search-open').click();
  await page.getByTestId('stock-search').fill('reli');
  await page.getByTestId('pick-instrument').getByText('RELIANCE', { exact: true }).click();
  await page.getByText('Selected: RELIANCE').waitFor({ timeout: 5_000 });
  await page.getByTestId('place-order').click();
  await page.getByText(/Order h-0001 placed/).waitFor({ timeout: 30_000 });
  return page.getByTestId('trade-screen').innerText();
}

/** The first regular session after `date`: an exit date the plan accepts. */
function nextSession(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  do d.setUTCDate(d.getUTCDate() + 1);
  while (sessionOn(d.toISOString().slice(0, 10)).kind !== 'regular');
  return d.toISOString().slice(0, 10);
}

/** Sets an exit plan on the holding, sees it listed, changes it, and takes it away again. */
async function exitPlan(page: Page, lastDate: string): Promise<void> {
  const exitDate = nextSession(lastDate);
  await page.getByTestId('plan-edit-RELIANCE').click();
  await page.getByTestId('plan-date').fill(exitDate);
  await page.getByTestId('plan-save').click();
  const line = page.getByTestId('plan-line-RELIANCE');
  await line.getByText(new RegExp(`close of ${exitDate}`)).waitFor({ timeout: 10_000 });
  check('an exit date can be set on a holding, asking first by default', /asks you first/.test(await line.innerText()), await line.innerText());
  await page.getByTestId('plan-edit-RELIANCE').click();
  await page.getByTestId('plan-stop').fill('1');
  await page.getByTestId('plan-mode-auto').click();
  await page.getByTestId('plan-save').click();
  await line.getByText(/sells automatically/).waitFor({ timeout: 10_000 });
  check('the plan can be changed: a stop and selling automatically', /stop ₹1\.00/.test(await line.innerText()), await line.innerText());
  await page.getByTestId('plan-edit-RELIANCE').click();
  await page.getByTestId('plan-date').fill(lastDate);
  await page.getByTestId('plan-save').click();
  check('an exit date that is not after the last prices is refused', await page.getByText(/must be a trading day after/).isVisible());
  await page.getByTestId('plan-remove').click();
  await line.getByText('No exit plan').waitFor({ timeout: 10_000 });
  check('the plan can be taken away', true);
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
    // the market file is several megabytes: wait until it has loaded before reading the note
    const note = await pricesNote(page, market.to);
    check('the device has the real NSE prices with their last date', new RegExp(`prices to ${market.to}`).test(note), note.slice(0, 300));
    await openRealTrade(page);
    check('Practise has no demo switch any more', (await page.getByTestId('market-switch').count()) === 0);
    const book = await placeReliance(page);
    check('a real order fills at the next open under its symbol', /buy 10 of 10 RELIANCE/.test(book) && /filled/.test(book), book.slice(0, 400));
    check('the position shows the stock symbol', /RELIANCE, 10 shares/.test(book));
    const holdings = await page.getByTestId('holdings').innerText();
    check('Your holdings shows quantity, average, value now and profit', /RELIANCE, 10 shares/.test(holdings) && /average ₹/.test(holdings) && /now ₹/.test(holdings) && /value ₹/.test(holdings) && /Total /.test(holdings), holdings);
    await page.getByTestId('holding-RELIANCE').click();
    const bar = await page.getByTestId('order-bar').innerText();
    check('tapping a holding prepares a sell of all of it, with the profit before charges', /Sell 10 × RELIANCE/.test(bar) && /profit ≈/.test(bar) && /Place sell order/.test(bar), bar);
    check('the chosen stock says what is held of it', /You hold 10 · average ₹/.test(await page.getByTestId('selected-holding').innerText()));
    await exitPlan(page, market.to);
    service.close();
    await page.goto(appOrigin); // no data helper now: the saved copy must serve
    await appReady(page);
    check('the saved copy is said to be used', /saved copy/.test(await pricesNote(page, market.to)));
    await openRealTrade(page);
    await page.getByText(/RELIANCE, 10 shares/).waitFor({ timeout: 30_000 });
    check('without the data helper the saved real prices and the real book still open', true);
    // a brand-new browser with no data helper: the history shipped inside the app serves (MIP v4.1 Stage 2)
    const fresh = await (await browser.newContext({ viewport: { width: 390, height: 900 } })).newPage();
    await fresh.goto(appOrigin);
    await appReady(fresh);
    await pricesNote(fresh, market.to);
    check('a new install with no data helper still has the bundled real prices', true);
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
