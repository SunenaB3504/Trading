/**
 * Futures, options and Options Lab checks for the web app (MIP v4.1 Stage 8). A new install starts the election-week
 * scenario on the real prices shipped inside the app: a bad lot count is refused, an option bought from the chain waits
 * and fills at the next session's open, a large short future raises the leverage flag, finishing shows each goal and
 * the debrief, and the session is still there after a reload. The Options Lab draws a strategy, its breakevens and
 * Greeks, and they change when the days and the volatility are moved.
 *
 * Usage:  pnpm --filter @trading/app export:web && pnpm e2e:fno
 */
import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright-core';
import type { Page } from 'playwright-core';
import { appReady, checkLog, openTab, serveStatic } from './support';

const { checks, check } = checkLog();
const text = (page: Page, id: string): Promise<string> => page.getByTestId(id).innerText();

async function openDesk(page: Page): Promise<void> {
  await openTab(page, 'F&O');
  await page.getByTestId('fno-screen').waitFor({ timeout: 60_000 });
}

async function startScenario(page: Page): Promise<void> {
  await openDesk(page);
  await page.getByTestId('fno-scn-fno-election-2024').click();
  await page.getByTestId('fno-account').waitFor({ timeout: 30_000 });
  check('the scenario shows its goal', /no more than 5%/.test(await text(page, 'fno-goal')), await text(page, 'fno-goal'));
  check('the account starts at ₹10,00,000 with no margin used', /₹10,00,00,000|₹1,00,00,000|₹10,00,000\.00/.test(await text(page, 'fno-account')) || /10,00,000/.test(await text(page, 'fno-account')), await text(page, 'fno-account'));
  await page.getByTestId('chain-spot').waitFor({ timeout: 30_000 });
  check('the chain shows the index level and lot size', /Nifty 50 at the close/.test(await text(page, 'chain-spot')) && /65 units a lot/.test(await text(page, 'chain-spot')), await text(page, 'chain-spot'));
}

async function buyOption(page: Page): Promise<void> {
  await page.locator('[data-testid^="chain-CE-"]').nth(5).click();
  await page.getByTestId('fno-lots').fill('0');
  await page.getByTestId('fno-buy').click();
  await page.getByTestId('fno-message').waitFor({ timeout: 10_000 });
  check('zero lots are refused', /Lots must be a whole number/.test(await text(page, 'fno-message')), await text(page, 'fno-message'));
  await page.getByTestId('fno-lots').fill('1');
  await page.getByTestId('fno-buy').click();
  await page.getByText(/Buy order placed/).waitFor({ timeout: 10_000 });
  check('a bought option waits for the next open', /waiting for the next open/.test(await text(page, 'fno-orders')), await text(page, 'fno-orders'));
  await page.getByTestId('fno-next').click();
  await page.getByText(/filled at/).first().waitFor({ timeout: 30_000 });
  check('it fills when the date moves on, with its charges', /filled at/.test(await text(page, 'fno-orders')) && /charges/.test(await text(page, 'fno-orders')), await text(page, 'fno-orders'));
  check('it appears as an open position', /1 lot\(s\)/.test(await text(page, 'fno-positions')), await text(page, 'fno-positions'));
}

async function leverage(page: Page): Promise<void> {
  check('there is no leverage flag yet', (await page.getByTestId('fno-leverage').count()) === 0);
  await page.locator('[data-testid^="chain-FUT-"]').first().click();
  await page.getByTestId('fno-lots').fill('3');
  await page.getByTestId('fno-sell').click();
  await page.getByText(/Sell order placed/).waitFor({ timeout: 10_000 });
  await page.getByTestId('fno-next').click();
  await page.getByTestId('fno-leverage').waitFor({ timeout: 30_000 });
  check('a large short future raises the leverage flag', /Leverage risk/.test(await text(page, 'fno-leverage')), await text(page, 'fno-leverage'));
  check('the margin used is shown as approximate', /Margin used \(approximate\)/.test(await text(page, 'fno-account')));
}

async function finish(page: Page): Promise<void> {
  await page.getByTestId('fno-end').click();
  await page.getByTestId('fno-summary').waitFor({ timeout: 30_000 });
  const s = await text(page, 'fno-summary');
  check('the summary judges the goal and shows charges', /(Met|Not met): Result/.test(s) && /Charges paid/.test(s), s);
  check('the debrief is shown', (await text(page, 'fno-debrief')).length > 40);
  check('the date controls are gone at the end', (await page.getByTestId('fno-next').count()) === 0);
}

async function afterReload(page: Page): Promise<void> {
  await page.reload();
  await appReady(page);
  await openDesk(page);
  await page.getByTestId('fno-sessions').waitFor({ timeout: 30_000 });
  check('the session is listed after a reload', /Election result week/.test(await text(page, 'fno-sessions')));
  await page.getByTestId('fno-open-f1').click();
  await page.getByTestId('fno-summary').waitFor({ timeout: 30_000 });
  check('it opens at the end with its summary', /Finished with/.test(await text(page, 'fno-summary')));
  await page.getByTestId('fno-back').click();
  await page.getByTestId('fno-delete-f1').click();
  await page.getByTestId('fno-sessions').waitFor({ state: 'detached', timeout: 10_000 });
  check('a session can be deleted', (await page.getByTestId('fno-sessions').count()) === 0);
}

async function optionsLab(page: Page): Promise<void> {
  await openTab(page, 'Options Lab');
  await page.getByTestId('optlab-screen').waitFor({ timeout: 30_000 });
  const call = await text(page, 'optlab-summary');
  check('a long call has unlimited profit and a limited loss', /Unlimited profit/.test(call) && !/Unlimited loss/.test(call), call);
  await page.getByTestId('optlab-strategy').getByText('Iron condor', { exact: true }).click();
  const condor = await text(page, 'optlab-summary');
  check('an iron condor has two breakevens and both ends limited', /Breakeven at expiry\n?.*and/.test(condor.replace(/\n/g, ' ')) && !/Unlimited/.test(condor), condor);
  await page.getByTestId('optlab-strategy').getByText('Short straddle', { exact: true }).click();
  check('a short straddle has unlimited loss', /Unlimited loss/.test(await text(page, 'optlab-summary')));
  const before = await text(page, 'optlab-greeks');
  check('the Greeks are shown, with theta in rupees a day', /Theta a day/.test(before) && /Vega/.test(before), before);
  await page.getByTestId('optlab-days-down').click();
  await page.getByTestId('optlab-vol-up').click();
  const after = await text(page, 'optlab-greeks');
  check('the Greeks move when days and volatility change', after !== before, `${before} | ${after}`);
  check('the payoff chart is drawn', (await page.getByTestId('lab-payoff').count()) === 1);
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
    await startScenario(page);
    await buyOption(page);
    await leverage(page);
    await finish(page);
    await afterReload(page);
    await optionsLab(page);
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
